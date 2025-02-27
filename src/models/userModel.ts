import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string; 
    mobileNumber: string; 
    role: string;
    walletAddress: string;
    password: string;
    membershipPackage?: string;
    totalPackage: number; 
    totalEarnings: number;
    status:string;
  }
  

  const UserSchema: Schema = new Schema(
    {
      email: {
        type: String,
      },
      mobileNumber: {
        type: String,
      },
      membershipPackage: {
        type: String,
        default: null
      },
      totalPackage: {
          type: Number,
          default: 0
      },
      totalEarnings: {
          type: Number,
          default: 0
      },
      role: {
        type: String,
        required: true,
        enum: ['ADMIN', 'USER'],
        default: "USER"
      },
      walletAddress: {
        type: String,
        required: true
      },
      password: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: true,
        enum: ['ACTIVE','DELETE','INACTIVE','BLOCK','FREEZE'],
        default: "ACTIVE"
      },
    },
    {
      timestamps: true, 
    }
  );
  
  export default mongoose.model<IUser>('User', UserSchema);