import ReferralEarnings from '../models/referralModel';
import mongoose, { Schema, Document, Types } from 'mongoose';
import dotenv from "dotenv";
import walletModel from '../models/walletModel';
import { parseEther } from 'viem';
import InvestmentModel from "../models/investmentModel";
import freezeWalletModel from "../models/freezeWalletModel";
import packageModel from "../models/packageModel";

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
        const packageData = await InvestmentModel.findOne(
            { userId: userId },
            {
                buyPackagesDetails: {
                    $filter: {
                        input: "$buyPackagesDetails",
                        as: "package",
                        cond: { $eq: ["$$package.status", "ACTIVE"] },
                    },
                },
            }
        ).populate("buyPackagesDetails.packageId");
        if(!packageData){
            return
        }
        const packages:any = packageData.buyPackagesDetails.filter(
            (pkg:any) => pkg.status === "ACTIVE" && pkg.packageId.amount === packageAmount
        );
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
            const userWallet = await walletModel.findOne({ userId: referrerId });
            if(!userWallet){
                console.log(`Wallet not found for referrer ${referrerId}, skipping level ${level + 1}`);
                break;
            }

            const packageData = await InvestmentModel.findOne(
                { userId: referrerId },
                {
                    buyPackagesDetails: {
                        $filter: {
                            input: "$buyPackagesDetails",
                            as: "package",
                            cond: { $eq: ["$$package.status", "ACTIVE"] },
                        },
                    },
                }
            ).populate("buyPackagesDetails.packageId");

            let isMatchingPackage = false;
            if (packageData != null) {
                const matchingAmounts = packageData?.buyPackagesDetails
                    .filter((pkg) => pkg.status === "ACTIVE")
                    .map((pkg:any ) => pkg.packageId.amount);

                isMatchingPackage = matchingAmounts?.some(
                    (amount:any) => amount >= packages[0].packageId.amount
                );
            }

            if (isMatchingPackage) {
                userWallet.totalFlexibleBalanceInWeiUsd = (parseFloat(userWallet.totalFlexibleBalanceInWeiUsd) + parseFloat(parseEther(commission.toString()).toString())).toString();
                await userWallet.save();
            } else {
                let data= await freezeWalletModel.findOne({userId: referrerId})
                if (data) {
                    await freezeWalletModel.findByIdAndUpdate(
                        { _id: data._id },
                        {
                            $push: {
                                lockerDetails: {
                                    packageId: packages[0].packageId._id,
                                    amount: commission,
                                    investmentDate: new Date(),
                                    status: "PENDING"
                                }
                            }
                        },
                        { new: true }
                    );
                } else {
                    const freeze = new freezeWalletModel({
                        userId: referrerId,
                        lockerDetails: [{
                            packageId: packages[0].packageId._id,
                            amount: commission,
                            investmentDate: new Date(),
                            status: "PENDING"
                        }]
                    });
                    await freeze.save();
                }
                userWallet.totalLockInWeiUsd = (parseFloat(userWallet.totalLockInWeiUsd) + parseFloat(parseEther(commission.toString()).toString())).toString();
                await userWallet.save();

            }

            /// Move up the referral chain
        const referrerData = await ReferralEarnings.findOne({ userId: referrerId });
        if(!referrerData || referrerData.referrerBy == null ) break;
            referrerId = referrerData.referrerBy;
        }

      console.log(`Referral rewards distributed successfully for user: ${userId}`);
    } catch (error) {
        console.error("Error in distributing referral rewards:", error);
    }
};


export const getFreezeDetails = async () => {
    try {
        const freezeData = await freezeWalletModel.find({
            lockerDetails: { 
                $elemMatch: { status: "PENDING" } 
            }
        });        
        if (!freezeData) {
             console.log('freezeData not found');
        }
        for (const element of freezeData) {
            const expiredIndexes: number[] = [];
            const completedIndexes: number[] = [];

            const userWallet = await walletModel.findOne({ userId: element.userId });
            if(!userWallet){
                console.log(`Wallet not found for user ${element.userId}`);
                break;
            }

            const packageData = await InvestmentModel.findOne(
                { userId: element.userId },
                {
                    buyPackagesDetails: {
                        $filter: {
                            input: "$buyPackagesDetails",
                            as: "package",
                            cond: { $eq: ["$$package.status", "ACTIVE"] },
                        },
                    },
                }
            ).populate("buyPackagesDetails.packageId");
            for (let i = 0; i < element.lockerDetails.length; i++) {
                const data = element.lockerDetails[i];
                let expiredAt = new Date(new Date(data.createdAt).getTime() + 48 * 60 * 60 * 1000); // Add 48 hours
                if (data.status !== "PENDING") break;
                if (new Date() > expiredAt) {
                    expiredIndexes.push(i);
                    userWallet.totalLockInWeiUsd = (parseFloat(userWallet.totalLockInWeiUsd) - parseFloat(parseEther(data.amount.toString()).toString())).toString();
                }else if (packageData) {
                    // Handle Active Package Check
                    const packages: any = await packageModel.findById(data.packageId);
                    if (!packages) continue;

                    const isMatchingPackage = packageData?.buyPackagesDetails
                        .some((pkg: any) => pkg.packageId.amount >= packages.amount);

                    if (isMatchingPackage) {
                        completedIndexes.push(i);
                        userWallet.totalFlexibleBalanceInWeiUsd = (parseFloat(userWallet.totalFlexibleBalanceInWeiUsd) + parseFloat(parseEther(data.amount.toString()).toString())).toString();
                        userWallet.totalLockInWeiUsd = (parseFloat(userWallet.totalLockInWeiUsd) - parseFloat(parseEther(data.amount.toString()).toString())).toString();
                    }
                }
               
            }
            await userWallet.save();

        
            if (expiredIndexes.length > 0) {
                let updateQuery :any= {};
            
                expiredIndexes.forEach(index => {
                    updateQuery[`lockerDetails.${index}.status`] = "EXPIRE";  // Target specific index
                });
                await freezeWalletModel.updateOne(
                    { _id: element._id },
                    { $set: updateQuery }
                );
        
                console.log(`Updated ${expiredIndexes.length} expired lockers for user:`, element.userId);
            }
            if (completedIndexes.length > 0) {
                let updateQuery :any= {};
            
                completedIndexes.forEach(index => {
                    updateQuery[`lockerDetails.${index}.status`] = "COMPLETED";  // Target specific index
                });
            
                await freezeWalletModel.updateOne(
                    { _id: element._id },
                    { $set: updateQuery }
                );
            
                console.log(`Updated lockers at indexes ${completedIndexes} for user:`, element.userId);
            }
            
        }


        
        return;
    } catch (error) {
        return Error("Server error")
    }
};


