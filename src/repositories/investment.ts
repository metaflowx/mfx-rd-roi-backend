import { Types } from 'mongoose';
import InvestmentModel from '../models/investmentModel';
import { IPackage } from '../models/packageModel';

export const addInvestment = async (userId: Types.ObjectId, packageId: Types.ObjectId) => {
    try {
        let investment = await InvestmentModel.findOne({ userId });

        if (investment) {
            // ✅ Check if the same package is already purchased
            const packageExists = investment.buyPackagesDetails.some(detail => detail.packageId.toString() === packageId.toString() && detail.status === "ACTIVE");
            if (packageExists) {
                return { success: false, message: "You have already purchased this package." };
            }

            // ✅ If package not purchased, push new package details
            investment.buyPackagesDetails.push({
                packageId,
                investmentDate: new Date(),
                status: "ACTIVE"
            });

        } else {
            // ✅ If no investment record exists, create a new one
            investment = new InvestmentModel({
                userId,
                buyPackagesDetails: [{
                    packageId,
                    investmentDate: new Date(),
                    status: "ACTIVE"
                }]
            });
        }

        await investment.save(); // ✅ Save the investment data
        return { success: true, message: "Investment recorded successfully", data: investment };

    } catch (error) {
        console.error("Investment creation error:", error);
        return { success: false, message: "Investment creation failed", error };
    }
}


interface InvestmentStats {
    todaysSumOfInvestmentEarnings: number;
    yesterdaysSumOfInvestmentEarnings: number;
    totalSumOfInvestmentEarnings: number;
    totalSumOfInvestmentBonus: number;
    totalSumOfInvestment: number;
}

export const calculateInvestmentStats = (packageData: any): InvestmentStats => {
    const now = new Date();
    let todaysSumOfInvestmentEarnings = 0;
    let yesterdaysSumOfInvestmentEarnings = 0;
    let totalSumOfInvestmentEarnings = 0;
    let totalSumOfInvestmentBonus = 0;
    let totalSumOfInvestment = 0;

    if (!packageData || !packageData.buyPackagesDetails || packageData.buyPackagesDetails.length === 0) {
        return {
            todaysSumOfInvestmentEarnings: 0,
            yesterdaysSumOfInvestmentEarnings: 0,
            totalSumOfInvestmentEarnings: 0,
            totalSumOfInvestmentBonus: 0,
            totalSumOfInvestment: 0
        }
    }

   const calculate = packageData.buyPackagesDetails.map((investment: any) => {
        const packageDetails = investment.packageId as IPackage;

        /// Check if packageDetails is populated
        if (!packageDetails || typeof packageDetails !== 'object') {
            console.error('Package details not populated for investment:', investment);
            return investment; // Skip calculations for this investment
        }

        const investmentDate = new Date(investment.investmentDate);
        const timeDifference = now.getTime() - investmentDate.getTime();
        const daysSinceInvestment = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

        /// Calculate today's earnings (if investment is still active)
        if (daysSinceInvestment < packageDetails.durationInDays) {
            todaysSumOfInvestmentEarnings += packageDetails.dailyEarnings;
        }

        /// Calculate yesterday's earnings (if investment was active yesterday)
        if (daysSinceInvestment > 0 && daysSinceInvestment <= packageDetails.durationInDays) {
            yesterdaysSumOfInvestmentEarnings += packageDetails.dailyEarnings;
        }

        /// Calculate total earnings (capped at durationInDays)
        const totalEarningsDays = Math.min(daysSinceInvestment, packageDetails.durationInDays);
        totalSumOfInvestmentEarnings += totalEarningsDays * packageDetails.dailyEarnings;

        /// Calculate total bonus (capped at durationInDays)
        totalSumOfInvestmentBonus += totalEarningsDays * (packageDetails.totalBonus || 0); // Use bonus field if available

        /// Calculate total bonus (capped at durationInDays)
        totalSumOfInvestment += packageDetails.amount ; 
        /// Return the package with expireAt
        return {
            ...investment
        };
    });

    return {
        todaysSumOfInvestmentEarnings,
        yesterdaysSumOfInvestmentEarnings,
        totalSumOfInvestmentEarnings,
        totalSumOfInvestmentBonus,
        totalSumOfInvestment
    };
};