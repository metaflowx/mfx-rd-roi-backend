import { Context } from 'hono';
import ReferralEarnings from '../models/referralModel';
import dotenv from "dotenv";

dotenv.config();


/**
 * Get referral stats for the logged-in user
 */
export const getReferralStats = async (c: Context) => {
  try {
    const userId = c.get('user').id; // Get logged-in user ID

    const referralStats = await ReferralEarnings.findOne({ userId });
    if (!referralStats) {
      return c.json({message: 'No referral stats found' }, 404);
    }

    return c.json({ message: 'Fetch referral state successfully', data: referralStats },200);
  } catch (error) {
    return c.json({ message: 'Server error', error }, 500);
}
};

/**
 * Get total referral earnings for the logged-in user
 */
export const getReferralEarnings = async (c: Context) => {
  try {
    const userId = c.get('user').id;

    const referralData = await ReferralEarnings.findOne({ userId });
    if (!referralData) {
      return c.json({message: 'No referral data found' }, 404);
    }

    return c.json({ message: "Get total referral earnings", earnings: referralData.totalEarnings },200);
  } catch (error) {
    return c.json({ message: 'Server error', error }, 500);
}
};


/**
 * Get referral earnings history
 */
export const getReferralHistory = async (c: Context) => {
  try {
    const userId = c.get('user').id;

    const referralData = await ReferralEarnings.findOne({ userId }).select('referralStats referrals').lean();;
    if (!referralData) {
      return c.json({ success: false, message: 'No referral history found' }, 404);
    }

    return c.json({ message: 'Referral history fetch successfully', history: referralData },200);
  } catch (error) {
    return c.json({ message: 'Server error', error }, 500);
}
};


export const disableReferral = async (c: Context) => {
  try {
      const userId = c.get("user"); // Get user ID from middleware
      if (!userId) {
          return c.json({ message: "Unauthorized" }, 401);
      }

      // Update enableReferral to false
      const updatedReferral = await ReferralEarnings.findOneAndUpdate(
          { userId },
          { $set: { enableReferral: false } },
          { new: true }
      );

      if (!updatedReferral) {
          return c.json({ message: "Referral earnings data not found" }, 404);
      }

      return c.json({ message: "Referral disabled successfully", updatedReferral });
  } catch (error) {
      return c.json({ message: "Server error", error }, 500);
  }
};