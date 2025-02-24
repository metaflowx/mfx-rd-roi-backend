import mongoose, { Schema, Document } from 'mongoose';

interface IAsset {
    tokenSymbol: string;
    tokenAddress: string;
    balance: string; // Change to BigDecimal if needed
}

export interface INetwork extends Document {
    name: string;
    chainId: string;
    address: string;
    encryptedPrivateKey: string;
    assets: IAsset[]; // Array of assets
}

export interface IWallet extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    network: INetwork[];
}
  

const assetSchema: Schema = new Schema(
    {
        tokenSymbol: { 
            type: String, 
            required: true 
        }, // e.g., USDT, BNB, ETH
        tokenAddress: { 
            type: String, 
            required: true 
        }, // Smart contract address
        balance: { 
            type: String, 
            default: "0" 
        }, 
    }, { _id: false , timestamps: true }
);

const networkSchema: Schema = new Schema(
    {
        name: { 
            type: String, 
            required: true 
        }, 
        chainId: { 
            type: String, 
            required: true 
        }, 
        address: { 
            type: String, 
            required: true 
        }, 
        encryptedPrivateKey: { 
            type: String, 
            required: true 
        }, 
        assets: [assetSchema]
    }, { _id: false , timestamps: true }
);



const walletSchema: Schema = new Schema({

    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    network: [networkSchema],
}, { timestamps: true });

export default mongoose.model<IWallet>('Wallet', walletSchema);
