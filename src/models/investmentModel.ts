import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInvestment extends Document {
    userId:  Types.ObjectId;
    buyPackagesDetails: {
        packageId:  Types.ObjectId;
        investmentDate: Date;
        status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    }[];
}

const InvestmentSchema: Schema = new Schema(
    {
        userId: { 
            type:  Types.ObjectId, 
            ref: 'User', 
            required: true,
            index: true 
        },
        buyPackagesDetails: [
            {
                packageId: { type:  Types.ObjectId, ref: "Package", required: true },
                investmentDate: { type: Date, default: Date.now, required: true },
                status: { 
                    type: String, 
                    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'], 
                    default: 'ACTIVE' 
                }
            }
        ],
    },
    { timestamps: true }
);
InvestmentSchema.index({ userId: 1, "buyPackagesDetails.packageId": 1 });
export default mongoose.model<IInvestment>('Investment', InvestmentSchema);
