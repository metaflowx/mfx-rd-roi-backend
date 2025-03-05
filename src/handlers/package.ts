import { Context } from 'hono';
import PackageModel from '../models/packageModel'; 
import UserModel from '../models/userModel'; 
import walletModel from '../models/walletModel'; 
import mongoose, { Schema, Document, Types } from 'mongoose';
import { addInvestment } from '../repositories/investment'; // Import function
import { distributeReferralRewards } from '../repositories/referral'; // Import the function
import { formatUnits, parseEther, parseUnits } from "viem";
import { updateWalletBalance } from '../repositories/wallet';


// **1. Add Package Package**
export const addPackage = async (c: Context) => {
    try {
        const { name, amount, dailyEarnings,dailyBonus,description, durationInDays, totalReturns,totalBonus } = await c.req.json();

        // Validate input
        if (!name || !amount || !dailyEarnings || !dailyBonus || !durationInDays || !totalReturns || !totalBonus || !description) {
            return c.json({ message: 'All fields are required' }, 400);
        }

        // Check if package already exists
        const existingPackage = await PackageModel.findOne({ name });
        if (existingPackage) {
            return c.json({ message: 'Package already exists' }, 400);
        }

        // Create new package
        const newPackage = await PackageModel.create({
            name,
            amount,
            description,
            dailyEarnings,
            dailyBonus,
            durationInDays,
            totalReturns,
            totalBonus
        });

        return c.json({ message: 'Package created successfully', package: newPackage }, 200);
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

/// 2. Edit Package Package
export const editPackage = async (c: Context) => {
    try {
        let id = c.req.param("id"); /// Get ID from request params
        const updateData = await c.req.json();

        
        const updatedPackage = await PackageModel.findByIdAndUpdate({_id:id}, updateData, { new: true });

        if (!updatedPackage) {
            return c.json({ message: 'Package not found' }, 404);
        }

        return c.json({ message: 'Package updated successfully', package: updatedPackage });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

/// 3. Delete Package Package
export const deletePackage = async (c: Context) => {
    try {
        const { id } = c.req.param(); // Get ID from request params

        const deletedPackage = await PackageModel.findByIdAndDelete(id);

        if (!deletedPackage) {
            return c.json({ message: 'Package not found' }, 404);
        }

        return c.json({ message: 'Package deleted successfully' });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

export const getPackageById = async (c: Context) => {
    try {
        const { id } = c.req.param(); /// Get ID from request params

        /// ✅ Check if package exists
        const packageData = await PackageModel.findById(id);
        if (!packageData) {
            return c.json({ message: "Package not found" }, 404);
        }

        return c.json({ package: packageData }, 200);
    } catch (error) {
        console.error("Server error:", error);
        return c.json({ message: "Server error", error }, 500);
    }
};

/// 4. Get All Package Packages
export const getPackages = async (c: Context) => {
    try {
        const packages = await PackageModel.find();
        return c.json({ packages });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};


export const buyPackagePlan = async (c: Context) => {
    try {
        const userData = c.get('user'); 
        const {packageId } = await c.req.json();

        /// ✅ Validate request body
        if (!userData._id || !packageId) {
            return c.json({ message: "User ID and Package ID are required." }, 400);
        }
        
        /// ✅ Check if  package exists
        const packageData = await PackageModel.findById(packageId);
        if (!packageData) {
            return c.json({ message: "Package not found." }, 404);
        }

        /// ✅ Check if user exists
        const wallet = await walletModel.findOne({userId: userData._id})
        if (!wallet) {
            return c.json({ message: "User wallet not found." }, 404);
        }

        if (packageData.amount > parseFloat(formatUnits(BigInt(wallet.totalBalanceInWeiUsd), 18))) {
            return c.json({ message: "Insufficient balance." }, 400);
        }

        /// ✅ Call investment function (Prevents duplicate purchases)
        const investmentResponse = await addInvestment(userData._id as Types.ObjectId, packageId);
        if (!investmentResponse.success) {
            return c.json({ message: investmentResponse.message }, 400);
        }

        await updateWalletBalance(userData._id,`-${parseEther(packageData.amount.toString())}`)
 
        /// ✅ Distribute referral rewards
        await distributeReferralRewards(userData._id as Types.ObjectId, packageData.amount);

        return c.json({ message: "Package plan purchased successfully"}, 200);

    } catch (error) {
        console.error("Server error:", error);
        return c.json({ message: "Server error", error }, 500);
    }
};