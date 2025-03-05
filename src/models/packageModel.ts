import mongoose, { Schema, Document } from 'mongoose';

export interface IPackage extends Document {
    name: string;
    amount: number;
    dailyEarnings: number;
    dailyBonus: number;
    durationInDays: number;
    totalReturns: number;
    totalBonus: number;
    description: string;
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
        dailyBonus: { 
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
        totalBonus: { 
            type: Number, 
            required: true 
        },
        description: {
            type: String,
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
