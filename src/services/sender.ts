import { EVMWalletService } from "./evmWallet";
import { Address, erc20Abi } from "viem";
import transactionModel, { ITransaction } from "../models/transactionModel";
import { privateKeyToAccount } from "viem/accounts";
import walletModel, { IWallet } from "../models/walletModel";
import assetsModel, { IAsset } from "../models/assetsModel";
import { updateWithdrawalTx } from "../handlers/transaction";


export default class Sender {

    constructor(
        private readonly chain: string
    ) {
        this.chain = chain
    }
    public async evmWorker(title: string, privateKey?: Address) {

        console.info(title);


        const dbData1 = await transactionModel.find(
            {
                $and: [
                    { txStatus: "pending" },
                    { txType: "withdrawal" }
                ]
            })
        const network = new EVMWalletService(this.chain, privateKey);
        const walletClient = network.getWalletClient()
        const publicClient = network.getPublicClient()
        const account = privateKeyToAccount(privateKey as Address)

        if (dbData1.length > 0) {
            Promise.all(
                dbData1.map(async (data: ITransaction) => {
                    const userWallet = await walletModel.findOne({ userId: data.userId._id }) as IWallet;
                    const asset = await assetsModel.findOne({ _id: data.assetId._id }) as IAsset;
                    const gas = await publicClient.estimateContractGas(
                        {
                            address: asset.assetAddress as Address,
                            abi: erc20Abi,
                            functionName: "transfer",
                            args: [
                                data.receiverAddress as Address,
                                BigInt(data.amountInWei),

                            ],
                            blockTag: 'latest',
                            account
                        }
                    )
                    const { request } = await publicClient.simulateContract({
                        address: asset.assetAddress as Address,
                        abi: erc20Abi,
                        functionName: "transfer",
                        args: [
                            data.receiverAddress as Address,
                            BigInt(data.amountInWei),

                        ],
                        gas: gas,
                        blockTag: 'latest',
                        account
                    })

                    const txHash = await walletClient.writeContract(request)
                    const updateData = {
                        txHash: txHash,
                        txStatus: "completed",
                        settlementStatus: "processing"
                    }
                    const query = { 
                        id: data._id, 
                        userId: data.userId._id, 
                        assetId: data.assetId 
                    }
                    await updateWithdrawalTx(
                        query,
                        updateData
                    )

                })
            )
        }

        const dbData2 = await transactionModel.find(
            {
                $and: [
                    { txStatus: "completed" },
                    { settlementStatus: "processing" },
                    { txType: "withdrawal" }
                ]
            })

        if (dbData2.length > 0) {
            Promise.all(
                dbData2.map(async (data: ITransaction) => {
                    try {
                        const txHash = data.txHash as Address;
                        const tx = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 4 })
                        if (tx.status === "success") {
                            const updateData = {
                                settlementStatus: "completed",
                                remarks: "Successfully Withdraw"
                            }
                            const query = { 
                                id: data._id, 
                                userId: data.userId._id, 
                                assetId: data.assetId 
                            }
                            await updateWithdrawalTx(
                                query,
                                updateData
                            )
                        } else {
                            console.log("failed");
                        }
                    } catch (error) {
                        console.log(error);

                    }

                })
            )
        }
    }

}