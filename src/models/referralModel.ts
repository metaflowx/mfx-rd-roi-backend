import mongoose, { Schema, Document } from "mongoose";

export interface IReferralLevel {
  referrals: mongoose.Schema.Types.ObjectId[]; // Array to store user IDs
  count: number;
  earnings: number;
  activeCount: number;
}

export interface IReferralStats {
  levels: {
    level1: IReferralLevel;
    level2: IReferralLevel;
    level3: IReferralLevel;
  };
}


export interface IReferralEarnings extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  referrerBy: mongoose.Schema.Types.ObjectId;
  referralCode:string;
  referralStats: IReferralStats;
  totalEarnings: number;
  enableReferral: boolean;

}


const referralEarningsSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    referrerBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default:""
    },
    referralCode: {
      type: String,
      require:true
    },
    referralStats: {
      levels: {
        type: Map,
        of: new Schema({
          referrals: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          ],
          count: { type: Number, default: 0 },
          earnings: { type: Number, default: 0 }
        }),
        default: {
          level1: { count: 0, earnings: 0 },
          level2: { count: 0, earnings: 0  },
          level3: { count: 0, earnings: 0 },
        },
      },
    },
    enableReferral:{
      type: Boolean,
      default:true
    }
  },
  { timestamps: true }
);



export default mongoose.model<IReferralEarnings>(
  "ReferralEarnings",
  referralEarningsSchema
);


// const result = await ReferralEarnings.aggregate([
//   { $match: { userId: someUserId } },
//   { $group: { _id: null, totalEarnings: { $sum: '$referralStats.levels.level1.earnings' } } },
// ]);
// console.log(result[0].totalEarnings); // Aggregation result