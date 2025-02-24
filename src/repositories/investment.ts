import { Types } from 'mongoose';
import InvestmentModel from '../models/investmentModel';

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
};
