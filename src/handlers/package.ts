import { Context } from 'hono';
import PacakgeModel from '../models/packageModel'; 
import UserModel from '../models/userModel'; 
import mongoose, { Schema, Document, Types } from 'mongoose';
import { addInvestment } from '../repositories/investment'; // Import function
import { distributeReferralRewards } from '../repositories/referral'; // Import the function

// **1. Add Pacakge Package**
export const addPacakge = async (c: Context) => {
    try {
        const { name, amount, dailyEarnings, durationInDays, totalReturns, bonus } = await c.req.json();

        // Validate input
        if (!name || !amount || !dailyEarnings || !durationInDays || !totalReturns || !bonus) {
            return c.json({ message: 'All fields are required' }, 400);
        }

        // Check if package already exists
        const existingPackage = await PacakgeModel.findOne({ name });
        if (existingPackage) {
            return c.json({ message: 'Pacakge already exists' }, 400);
        }

        // Create new package
        const newPackage = await PacakgeModel.create({
            name,
            amount,
            dailyEarnings,
            durationInDays,
            totalReturns,
            bonus
        });

        return c.json({ message: 'Pacakge created successfully', package: newPackage }, 200);
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

// **2. Edit Pacakge Package**
export const editPacakge = async (c: Context) => {
    try {
        let id = c.req.param("id"); // Get ID from request params
        const updateData = await c.req.json();

        
        const updatedPackage = await PacakgeModel.findByIdAndUpdate({_id:new mongoose.Types.ObjectId(id)}, updateData, { new: true });

        if (!updatedPackage) {
            return c.json({ message: 'Pacakge not found' }, 404);
        }

        return c.json({ message: 'Pacakge updated successfully', package: updatedPackage });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

// **3. Delete Pacakge Package**
export const deletePacakge = async (c: Context) => {
    try {
        const { id } = c.req.param(); // Get ID from request params

        const deletedPackage = await PacakgeModel.findByIdAndDelete(id);

        if (!deletedPackage) {
            return c.json({ message: 'Pacakge not found' }, 404);
        }

        return c.json({ message: 'Pacakge deleted successfully' });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};

export const getPackageById = async (c: Context) => {
    try {
        const { id } = c.req.param(); // Get ID from request params

        // ✅ Check if package exists
        const packageData = await PacakgeModel.findById(id);
        if (!packageData) {
            return c.json({ message: "Package not found" }, 404);
        }

        return c.json({ package: packageData }, 200);
    } catch (error) {
        console.error("Server error:", error);
        return c.json({ message: "Server error", error }, 500);
    }
};

// **4. Get All Pacakge Packages**
export const getPacakges = async (c: Context) => {
    try {
        const packages = await PacakgeModel.find();
        return c.json({ packages });
    } catch (error) {
        return c.json({ message: 'Server error', error }, 500);
    }
};


export const buyPacakgePlan = async (c: Context) => {
    try {
        const userData = c.get('user'); // Extract user ID from middleware
        console.log("userData======>>>",userData)
        const {packageId } = await c.req.json();

        // ✅ Validate request body
        if (!userData._id || !packageId) {
            return c.json({ message: "User ID and Package ID are required" }, 400);
        }

        // ✅ Check if user exists
        const user = await UserModel.findById(userData._id);
        if (!user) {
            return c.json({ message: "User not found" }, 404);
        }

        // ✅ Check if  package exists
        const packageData = await PacakgeModel.findById(packageId);
        if (!packageData) {
            return c.json({ message: "Pacakge not found" }, 404);
        }

        // ✅ Call investment function (Prevents duplicate purchases)
        const investmentResponse = await addInvestment(user._id, packageId);
        if (!investmentResponse.success) {
            return c.json({ message: investmentResponse.message }, 400);
        }
 
        // ✅ Distribute referral rewards
        await distributeReferralRewards(user._id, packageData.amount);

        // ✅ Update user package details
        user.membershipPackage = packageData.name;
        user.totalPacakge += packageData.amount; // Add to total package amount

        console.log("user=====>>>",user)
        // await user.save(); // Save updated user data

        return c.json({
            message: "Pacakge plan purchased successfully",
            user
        }, 200);

    } catch (error) {
        console.error("Server error:", error);
        return c.json({ message: "Server error", error }, 500);
    }
};