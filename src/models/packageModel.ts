import mongoose, { Schema, Document } from 'mongoose';

export interface IPackage extends Document {
    name: string;
    amount: number;
    dailyEarnings: number;
    durationInDays: number;
    totalReturns: number;
    bonus: number;
}

const packageSchema: Schema = new Schema(
    {
        name: { 
            type: String, 
            required: true, 
            unique: true 
        },
        amount: { 
            type: Number, 
            required: true 
        },
        dailyEarnings: { 
            type: Number, 
            required: true 
        },
        durationInDays: { 
            type: Number, 
            required: true 
        },
        totalReturns: { 
            type: Number, 
            required: true 
        },
        bonus: { 
            type: Number, 
            required: true 
        },
        status: { 
            type: String, 
            enum: ["ACTIVE","INACTIVE"],
            default:"ACTIVE"
        }
    },
    { timestamps: true }
);

export default mongoose.model<IPackage>('Package', packageSchema);
