import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFreezeWallet extends Document {
    userId:  Types.ObjectId;
    lockerDetails: {
      packageId:  Types.ObjectId;
      createdAt: Date;
      amount: Number;
      status: 'PENDING' | 'COMPLETED' | 'EXPIRE';
  }[];
  }
  

  const FreezeWalletSchema: Schema = new Schema(
    {
      userId: { 
          type:  Types.ObjectId, 
          ref: 'User', 
          required: true,
          index: true 
      },
      lockerDetails:[
        {
          packageId: { type:  Types.ObjectId, ref: "Package", required: true },
          createdAt: { type: Date, default: Date.now, required: true },
          amount:{ type: Number, required: true },
          status: { 
              type: String, 
              enum: ['PENDING', 'COMPLETED', 'EXPIRE'], 
              default: 'PENDING' 
          }
        }
      ]
    },
    {
      timestamps: true, 
    }
  );
  
  export default mongoose.model<IFreezeWallet>('FreezeWallet', FreezeWalletSchema);