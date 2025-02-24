import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  fromChain: string; // BSC/TRON/Ramestta
  toChain: string; // BSC/TRON/Ramestta
  fromToken: string; // Token on source chain
  toToken: string; // Token on destination chain
  depositAddress: string; // auto generated
  receiverAddress: string; // user-provided receiving address
  fromAmountInWei: string;
  toAmountInWei: string;
  amountReceivedAt: string;
  amountSentAt: string;
  exchangeRate: string;
  serviceFee: string;
  inTxHash: string;
  outTxHash: string;
  transactionCost: string;
  txStatus: string; // Status of the transaction
  settlementStatus: string;
  remarks: string;
  expiration: Date; // Expiration date
}

const TransactionSchema: Schema = new Schema(
  {
    fromChain: {
      type: String,
      required: true,
      enum: ['bsc', 'tron', 'ramestta'], // Restrict to supported chains
    },
    toChain: {
      type: String,
      required: true,
      enum: ['bsc', 'tron', 'ramestta'], // Restrict to supported chains
    },
    fromToken: {
      type: String,
      required: true,
    },
    toToken: {
      type: String,
      required: true,
    },
    depositAddress: {
      type: String,
      required: true,
    },
    receiverAddress: {
      type: String,
      required: true,
    },
    fromAmountInWei: {
      type: String,
      required: true,
    },
    toAmountInWei: {
      type: String,
      required: true,
    },
    amountReceivedAt: {
      type: String,
    },
    amountSentAt: {
      type: String,
    },
    exchangeRate: {
      type: String,
      default: "0",
      required: true,
    },
    serviceFee: {
      type: String,
      default: "0",
      required: true,
    },
    inTxHash: {
      type: String,
      default: "0x",
      required: true,
    },
    outTxHash: {
      type: String,
      default: "0x",
      required: true,
    },
    transactionCost: {
      type: String,
      default: "0",
      required: true,
    },
    txStatus: {
      type: String,
      default: "pending",
      enum: ['pending', 'completed', 'canceled', 'failed'], // Various statuses
    },
    settlementStatus:{
      type: String,
      default: "pending",
      enum: ['pending', 'completed', 'canceled','failed'], // Various statuses
    },
    remarks: {
      type: String,
    },
    expiration: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt timestamps
  }
);

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);