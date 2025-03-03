import { EVMWalletService } from "./evmWallet";
import transactionModel, { ITransaction } from "../models/transactionModel";
import walletModel, { IWallet } from "../models/walletModel";
import { updateDepositTx } from "../handlers/transaction";
import assetsModel, { IAsset } from "../models/assetsModel";
import { Address, parseAbiItem } from "viem";
import { updateWalletBalance } from "../repositories/wallet";


// import { transactionModel, ITransaction } from "../models/transactionModel";
// import { walletModel, IWallet } from "../models/walletModel";
// import { assetsModel, IAsset } from "../models/assetsModel";
// import { updateWalletBalance } from "../services/walletService";
// import { updateDepositTx } from "../services/transactionService";
// import { EVMWalletService } from "../services/EVMWalletService";
// import { parseAbiItem, Address } from "viem";

export default class Watcher {
    constructor(private readonly chain: string) {
        this.chain = chain;
    }

    public async evmWorker(title: string) {
        console.info(title);
        const network = new EVMWalletService(this.chain);
        const client = network.getPublicClient();
        const blockNumber = await client.getBlockNumber();

        // ✅ Step 1: Find confirmed Deposits
        const dbData = await transactionModel.find({
            $and: [
                { txStatus: "confirmed" },  // Watch for pending deposits
                { txType: "deposit" }
            ]
        }).populate("userId").populate("assetId");

        console.log(dbData);
        

        if (dbData.length > 0) {
            await Promise.all(
                dbData.map(async (data: ITransaction) => {
                    const userWallet = await walletModel.findOne({ userId: data.userId._id }) as IWallet;
                    const asset = await assetsModel.findOne({ _id: data.assetId._id }) as IAsset;

                    // ✅ Step 2: Check for Deposit Events
                    const logs = await client.getLogs({
                        address: asset.assetAddress as Address,
                        event: asset.assetAddress !== '0x0000000000000000000000000000000000001010'
                            ? parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')
                            : parseAbiItem('event LogTransfer(address indexed token,address indexed from,address indexed to,uint256 amount,uint256 input1,uint256 input2,uint256 output1,uint256 output2)'),
                        args: { to: userWallet.address as Address },
                        fromBlock: blockNumber - BigInt(101),
                        toBlock: blockNumber
                    });

                    if (logs.length > 0) {
                        await Promise.all(logs.map(async (log: any) => {
                            try {
                                // ✅ Step 3: Prevent Duplicate Transaction Insertion
                                await transactionModel.findOneAndUpdate(
                                    { txHash: log.transactionHash },
                                    {
                                        $set: {
                                            amountInWei: asset.assetAddress !== '0x0000000000000000000000000000000000001010'
                                                ? log.args.value.toString()
                                                : log.args.amount.toString(),
                                            userId: data.userId._id,
                                            assetId: data.assetId._id,
                                            txStatus: "processing"
                                        }
                                    },
                                    { upsert: true, new: true }
                                );

                                console.log(`Transaction added: ${log.transactionHash}`);

                            } catch (error: any) {
                                if (error.code === 11000) {
                                    console.log(`Duplicate transaction skipped: ${log.transactionHash}`);
                                } else {
                                    console.error("Transaction error:", error);
                                }
                            }
                        }));
                    }
                })
            );
        }

        // ✅ Step 4: Confirm Deposits and Update Wallet Balance
        const pendingTransactions = await transactionModel.find({
            $and: [
                {
                    txStatus: "processing",
                    settlementStatus: "pending",
                    txHash: { $ne: "0x" },
                    txType: "deposit"
                }
            ]
        }).populate("userId").populate("assetId");
        console.log({ pendingTransactions });

        if (pendingTransactions.length > 0) {
            await Promise.all(
                pendingTransactions.map(async (data: ITransaction) => {
                    try {
                        const tx = await client.getTransactionReceipt({ hash: data.txHash as Address });

                        if (tx.status === "success") {
                            const updateData = {
                                txStatus: "completed",
                                settlementStatus: "completed",
                                remarks: "Deposit Successfully"
                            };

                            await updateDepositTx(updateData, { id: data._id, userId: data.userId._id, assetId: data.assetId });

                            console.log(`Deposit confirmed: ${data.txHash}`);

                            await updateWalletBalance(data.userId._id, data.assetId, data.amountInWei);

                            console.log(`Wallet balance updated for ${data.userId._id}`);
                        } else {
                            console.log(`Deposit failed: ${data.txHash}`);
                        }
                    } catch (error) {
                        console.log("Error processing deposit:", error);
                    }
                })
            );
        }
    }
}

