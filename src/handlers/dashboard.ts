import { Context } from "hono";
import TaskModel from "../models/taskModel";
import UserModel from '../models/userModel';
import PackageModel from '../models/packageModel'; 


// Get All Tasks
export const dashboard = async (c: Context) => {
    try {
        const userCount = await UserModel.countDocuments({ role: "USER" });
        const blockedUserCount = await UserModel.countDocuments({ role: "USER", status: "BLOCK" });
        const activePackageCount = await PackageModel.countDocuments({ status: "ACTIVE" });
        const activeTaskCount = await TaskModel.countDocuments({ status: "ACTIVE" });

        return c.json({ message: "dashboard data fetch successfully", userCount: userCount ,blockUser: blockedUserCount, activePackageCount: activePackageCount, activeTaskCount:activeTaskCount, platefromTotalEarnig: 0 }, 200);

    } catch (error) {
        console.error('Error fetching tasks:', error);
        return c.json({ message: 'Server error', error }, 500);
    }
};
