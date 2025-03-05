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

    const levelsMap = referralStats.referralStats.levels || new Map();
    const levels = Object.fromEntries(levelsMap); // Convert Map to Object
    
    console.log('Converted Levels:', levels); // Debugging log
    
    // // Function to calculate today's earnings
    // const getTodaysEarnings = (level) => {
    //   // Assuming `earnings` are logged per day (You might need to adjust this logic)
    //   const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    //   return level.earnings || 0; // If earnings are stored per transaction, you need to filter them by today's date
    // };
    
    // Compute stats for each level
    const levelStats = Object.entries(levels).reduce((acc, [levelName , level]) => {
      acc[levelName] = {
        totalHeadcount: Number(level.count) || 0,
        teamTopUp: 0.00, // Define how to calculate this
        totalReturn: Number(level.earnings) || 0,
        // todaysEarnings: getTodaysEarnings(level),
      };
      return acc;
    }, {});
    
    return c.json({
      message: 'Referral stats fetched successfully',
      data: {
        referralStats,
        levelStats
      }
    }, 200);
    
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

    /// Calculate total earnings from all levels
    const totalEarnings = Object.values(referralData.referralStats.levels).reduce(
      (sum, level) => sum + (level.earnings || 0),
      0
    );

    return c.json({ message: "Get total referral earnings", earnings: totalEarnings },200);
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
       // Extract userId from params
       const _id = c.req.param('id');
       if (!_id) {
           return c.json({ message: 'User ID is required' }, 400);
       }


      // Get new status from request body
      const { enableReferral } = await c.req.json();
      const validStatuses = [true, false ];

      if (!validStatuses.includes(enableReferral)) {
          return c.json({ message: 'Invalid status' }, 400);
      }
      // Update enableReferral to false
      const updatedReferral = await ReferralEarnings.findOneAndUpdate(
          { _id },
          { $set: { enableReferral: enableReferral } },
          { new: true }
      );
      console.log("updatedReferral=====>>",updatedReferral)
      if (!updatedReferral) {
          return c.json({ message: "Referral earnings data not found" }, 404);
      }

      return c.json({ message: "Referral disabled successfully", updatedReferral });
  } catch (error) {
      return c.json({ message: "Server error", error }, 500);
  }
};

/**
 * Get referral list earnings history
 */
export const ReferralListHistory = async (c: Context) => {
  try {
    const referralData = await ReferralEarnings.find()
    .select('referralStats.userId referralStats.levels referralCode enableReferral')
    .populate({
      path: 'userId',
      match: { role: { $ne: 'ADMIN' } }, // Exclude users with role 'ADMIN'
      select: 'email mobileNumber status', // Only include necessary fields
    })
    .lean();
  
    // Filter out entries where userId is null
    const filteredData = referralData.filter(item => item.userId !== null).map(item => {
      // Extract earnings from all levels
      const levelEarnings = item.referralStats?.levels || {};
      const totalEarnings = Object.values(levelEarnings).reduce((sum, level) => sum + (level.earnings || 0), 0);

      return {
        ...item,
        totalEarnings, // Add total earnings field
      };
    });
    if (!filteredData || filteredData.length === 0) {
      return c.json({ success: false, message: 'No referral history found' }, 404);
    }
   
    return c.json({ message: 'Referral history fetch successfully', history: filteredData },200);
  } catch (error) {
    return c.json({ message: 'Server error', error }, 500);
}
};