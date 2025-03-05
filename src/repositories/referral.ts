import ReferralEarnings from '../models/referralModel';
import mongoose, { Schema, Document, Types } from 'mongoose';
import dotenv from "dotenv";

dotenv.config();

/**
 * Add a referral when a user registers with a referral link
 */
export const addReferral = async ({userId, referrerBy, referralCode}:{userId:any,referrerBy:any,referralCode:String}) => {
    try {
        
        // Validate referralCode before proceeding
        if (!referralCode || referralCode.trim() === "") {
            console.error("Invalid referral code:", referralCode);
            return new Error("Referral code cannot be null or empty");
        }

        // Ensure the user isn't already in the referral system
        const existingReferral = await ReferralEarnings.findOne({ userId });
        if (existingReferral) {
            console.log("User already has a referral entry.");
            return new Error("User already has a referral entry");
        }
        
       
        await ReferralEarnings.create({ userId: userId, referrerBy: referrerBy, referralCode: referralCode.toString().trim() });


        // Update referrer stats for Level 1
        const referrer = await ReferralEarnings.findOneAndUpdate(
            { userId: referrerBy },
            { $inc: { 'referralStats.levels.level1.count': 1 }, $push: { 'referralStats.levels.level1.referrals': userId } },
            { new: true }
        );

        if (!referrer) {
            throw Error("Referrer not found, but referral added")
        }

        // Handle Level 2 Referral (Referrer’s referrer)
        const referrerLevel2 = await ReferralEarnings.findOneAndUpdate(
            { userId: referrer.referrerBy }, 
            { $inc: { 'referralStats.levels.level2.count': 1 }, $push: { 'referralStats.levels.level2.referrals': userId }},
            { new: true }
        );

        // Handle Level 3 Referral (Referrer’s referrer’s referrer)
        if (referrerLevel2 && referrerLevel2.referrerBy) {
            await ReferralEarnings.findOneAndUpdate(
                { userId: referrerLevel2.referrerBy }, 
                { $inc: { 'referralStats.levels.level3.count': 1 }, $push: { 'referralStats.levels.level3.referrals': userId } },
                { new: true }
            );
        }
        console.log(`User ${userId} successfully referred by ${referrerBy}`);
        return; 
    } catch (error) {
        return Error("Server error")
    }
};

export const distributeReferralRewards = async (userId: Types.ObjectId, packageAmount: number) => {
  try {
      // Find the referral chain
      const userReferral = await ReferralEarnings.findOne({ userId });

      if (!userReferral || !userReferral.referrerBy) {
          console.log("No referrer found for this user.");
          return;
      }
      if (userReferral.enableReferral == false) {
        console.log("Admin disable  referral reward for this user.");
        return;
      }
      let referrerId = userReferral.referrerBy;
      const commissionRates = [
          parseFloat(process.env.LEVEL_1_REWARD || "12") / 100, // Level 1: 12%
          parseFloat(process.env.LEVEL_2_REWARD || "3") / 100,  // Level 2: 3%
          parseFloat(process.env.LEVEL_3_REWARD || "2") / 100   // Level 3: 2%
      ];

      for (let level = 0; level < 3 && referrerId; level++) {
        // Calculate commission
        const commission = packageAmount * commissionRates[level];

        // Update referrer earnings properly inside `referralStats.levels.levelX.earnings`
        await ReferralEarnings.findOneAndUpdate(
            { userId: referrerId },
            { 
              $inc: { 
                  totalEarnings: commission, 
                  [`referralStats.levels.level${level + 1}.earnings`]: commission 
              }
            },
            { new: true }
        );

        // Move up the referral chain
        const referrerData = await ReferralEarnings.findOne({ userId: referrerId });
        if(!referrerData || referrerData.referrerBy == null ) break;
        referrerId = referrerData.referrerBy;
      }

      console.log(`Referral rewards distributed successfully for user: ${userId}`);
  } catch (error) {
      console.error("Error in distributing referral rewards:", error);
  }
};
