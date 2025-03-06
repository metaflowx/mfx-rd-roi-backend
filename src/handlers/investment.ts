
import { Context } from 'hono';
import InvestmentModel from '../models/investmentModel';
import packageModel from '../models/packageModel';
import { calculateInvestmentStats } from '../repositories/investment';



export const getActivePlanByUserId = async (c: Context) => {
    try {
        const { userId } = c.req.param(); // Get ID from request params
        const { status } = c.req.query()
        // ✅ Fetch user investment and filter only ACTIVE packages
        const packageData = await InvestmentModel.findOne(
            {userId},
            {
                buyPackagesDetails: {
                    $filter: {
                        input: "$buyPackagesDetails",
                        as: "package",
                        cond: status ? { $eq: ["$$package.status", status] } : true
                    }
                }
            }
        ).populate('buyPackagesDetails.packageId');

        if (!packageData || packageData.buyPackagesDetails.length === 0) {
            return c.json({ message: "No Investments found" }, 404);
        }
        /// Calculate investment stats and add expireAt to each package
        const stats = calculateInvestmentStats(packageData);


        return c.json({ 
            package: packageData,
            stats
        }, 200);
    } catch (error) {
        console.error("Server error:", error);
        return c.json({ message: "Server error", error }, 500);
    }
};
