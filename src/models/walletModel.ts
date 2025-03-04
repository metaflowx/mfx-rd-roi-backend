import mongoose, { Schema, Document } from 'mongoose'

/// Interface for Wallet document
export interface IWallet extends Document {
    userId: mongoose.Types.ObjectId
    address: string
    encryptedPrivateKey: string
    encryptedSymmetricKey: string
    salt: string 
    assets: Array<{
        assetId: mongoose.Types.ObjectId
        balance: string
        lock: string
    }>
    createdAt: Date
    updatedAt: Date
}

/// Wallet schema
const walletSchema: Schema = new Schema(
    {
        userId: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: true
        },
        address: {
            type: String,
            required: true,
            validate: {
                validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
                message: (props: any) => `${props.value} is not a valid Ethereum address!`,
            },
        },
        encryptedSymmetricKey: {
            type: String,
            required: true,
        },
        encryptedPrivateKey: {
            type: String,
            required: true,
        },
        salt: {
            type: String,
            required: true,
        },
        assets: [
            {
                assetId: {
                    type: mongoose.Types.ObjectId,
                    ref: 'Asset',
                    required: true,
                },
                balance: {
                    type: String,
                    default: '0',
                    validate: {
                        validator: (v: string) => /^\d+$/.test(v), 
                        message: (props: any) => `${props.value} is not a valid balance!`,
                    },
                },
                lock: {
                    type: String,
                    default: '0',
                    validate: {
                        validator: (v: string) => /^\d+$/.test(v), 
                        message: (props: any) => `${props.value} is not a valid lock!`,
                    },
                },
            },
        ],
        totalBalanceInWeiUsd: {
                type: String,
                default: "0",
        },
        totalLockInWeiUsd: {
            type: String,
            default: "0",
        }
    },
    { timestamps: true } 
)

export default mongoose.model<IWallet>('Wallet', walletSchema)