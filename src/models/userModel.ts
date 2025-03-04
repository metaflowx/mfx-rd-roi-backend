import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string; 
    mobileNumber: string; 
    role: string;
    walletAddress: string;
    password: string;
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
      role: {
        type: String,
        required: true,
        enum: ['ADMIN', 'USER'],
        default: "USER"
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