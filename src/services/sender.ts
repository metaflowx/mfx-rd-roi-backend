import { EVMWalletService } from "./evmWallet";
import { Address, erc20Abi } from "viem";
import transactionModel, { ITransaction } from "../models/transactionModel";
import { privateKeyToAccount } from "viem/accounts";


export default class Sender {

    constructor(
        private readonly chain: string
    ) {
        this.chain = chain
    }
    public async evmWorker(title: string,privateKey?:Address) {
        
        console.info(title);

        const network = new EVMWalletService(this.chain,privateKey);
        const dbData1 = await transactionModel.find(
            {
                $and: [
                    { txStatus: "completed" },
                    {settlementStatus:"pending"},
                    {
                        txHash: '0x',
                    }
                ]
        })
        return
        const walletClient = network.getWalletClient()
        const publicClient = network.getPublicClient()
        const account = privateKeyToAccount(privateKey as Address)
        if (dbData1.length > 0) {
            Promise.all(
                dbData1.map(async (data: ITransaction) => {
                    const gas = await publicClient.estimateContractGas(
                        {
                            address: network.getRama20Address(),
                            abi: erc20Abi,
                            functionName: "transfer",
                            args: [
                                data.receiverAddress as Address,
                                BigInt(data.toAmountInWei),
            
                            ],
                            blockTag: 'latest',
                            account
                        }
                    ) 
                    const { request } = await publicClient.simulateContract({
                        address: network.getRama20Address(),
                        abi: erc20Abi,
                        functionName: "transfer",
                        args: [
                            data.receiverAddress as Address,
                            BigInt(data.toAmountInWei),

                        ],
                        gas: gas,
                        blockTag: 'latest',
                        account
                    })
                    
                    const txHash = await walletClient.writeContract(request)
                    const updateData = {
                        outTxHash: txHash,
                    }
                    const query = {
                        id: data._id
                    }
                    await updateTx(
                        updateData,
                        query
                    )
            
                })
            )
        }
        
        const dbData2 = await transactionModel.find(
            {
                $and: [
                    { txStatus: "completed" },
                    {settlementStatus:"pending"},
                    {
                        txHash: {$ne: '0x'},
                    }
                ]
        })
            
        if (dbData2.length > 0) {
            Promise.all(
                dbData2.map(async (data: ITransaction) => {
                    try {
                        const txHash = data.outTxHash as Address;
                        const tx = await publicClient.waitForTransactionReceipt({ hash: txHash,confirmations:4})
                        const block = await publicClient.getBlock(tx.blockHash as any);
                        const timestamp = block.timestamp;
                        if (tx.status === "success") {
                            const updateData = {
                                settlementStatus: "completed",
                                amountSentAt: `${new Date(Number(timestamp) * 1000).toISOString()}`,
                                remarks: "Successfully Transfer"
                            }
                            const query = {
                                id: data._id
                            }
                            await updateTx(
                                updateData,
                                query
                            )
                        } else {
                            const updateData = {
                                remarks: "Something went wrong "
                            }
                            const query = {
                                id: data._id
                            }
                            await updateTx(
                                updateData,
                                query
                            )
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