
import { Context } from 'hono';
import InvestmentModel from '../models/investmentModel'; 



export const getActivePlanByuserId = async (c: Context) => {
    try {
        const { userId } = c.req.param(); // Get ID from request params
        
        // ✅ Fetch user investment and filter only ACTIVE packages
        const packageData = await InvestmentModel.findOne(
            { userId }, // Filter by userId
            { 
                buyPackagesDetails: { 
                    $filter: { 
                        input: "$buyPackagesDetails",
                        as: "package",
                        cond: { $eq: ["$$package.status", "ACTIVE"] } // Only ACTIVE plans
                    }
                }
            }
        );

        if (!packageData || packageData.buyPackagesDetails.length === 0) {
            return c.json({ message: "No active investments found" }, 404);
        }

        return c.json({ package: packageData }, 200);
    } catch (error) {
        console.error("Server error:", error);
        return c.json({ message: "Server error", error }, 500);
    }
};
