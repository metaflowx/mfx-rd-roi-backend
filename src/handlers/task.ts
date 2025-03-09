import { Context } from 'hono';
import TaskModel from '../models/taskModel';
import packageModel from '../models/packageModel';
import mongoose, { Types } from 'mongoose';
import { v2 as cloudinary } from "cloudinary";
import taskModel from '../models/taskModel';
import walletModel from '../models/walletModel';
import { parseEther } from 'viem';
import investmentModel from '../models/investmentModel';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Task (Admin Only)
export const createTask = async (c: Context) => {
    try {
       
        // Extract fields and file path from context
        const { title, type, description, points, image } = await c.req.json();
        
        /// Validate input
        if (!title || !type || !description || !points || !image ) {
            return c.json({ message: 'All fields are required' }, 400);
        }
        const existingTask = await TaskModel.findOne({title:title});
        if (existingTask) {
            return c.json({ message: "Task already exist." }, 404);
        }

        // Save task in the database
        const newTask = await TaskModel.create({
            title,
            type,
            description,
            image: image,
            points,
        });

        return c.json({ message: 'Task created successfully', task: newTask }, 200);
    } catch (error) {
        console.error('Error creating task:', error);
        return c.json({ message: 'Server error', error }, 500);
    }
};

// Edit Task (Admin Only)
export const editTask = async (c: Context) => {
    try {
        const id = c.req.param("id"); // Task ID from URL params
        const { title, type, description, points, image } = await c.req.json(); // Extract all fields from request body

        // Find the existing task
        const existingTask = await TaskModel.findById(id);
        if (!existingTask) {
            return c.json({ message: "Task not found" }, 404);
        }

        // Update only provided fields
        if (title) existingTask.title = title;
        if (type) existingTask.type = type;
        if (description) existingTask.description = description;
        if (points) existingTask.points = points;
        if (image) existingTask.image = image; // Image URL in string format

        // Save the updated task
        await existingTask.save();

        return c.json({ message: "Task updated successfully", task: existingTask });
    } catch (error) {
        console.error("Error updating task:", error);
        return c.json({ message: "Server error", error }, 500);
    }
};


// Delete Task (Admin Only)
export const deleteTask = async (c: Context) => {
    try {
        const id = c.req.param('id');

        const deletedTask = await TaskModel.findByIdAndDelete(id);

        if (!deletedTask) {
            return c.json({ message: 'Task not found' }, 404);
        }

        return c.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        return c.json({ message: 'Server error', error }, 500);
    }
};

// Get All Tasks
export const getTasks = async (c: Context) => {
    try {
        const tasks = await TaskModel.find().sort({ createdAt: -1 });
        return c.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return c.json({ message: 'Server error', error }, 500);
    }
};

// Get Task Details
export const getTaskById = async (c: Context) => {
    try {
        const id = c.req.param('id');
        const task = await TaskModel.findById(id);

        if (!task) {
            return c.json({ message: 'Task not found' }, 404);
        }

        return c.json({ task });
    } catch (error) {
        console.error('Error fetching task:', error);
        return c.json({ message: 'Server error', error }, 500);
    }
};

// Add Review to Task
export const addReview = async (c: Context) => {
    try {
        const { rating , packageId } = await c.req.json();
        const taskId = c.req.param('id');
        const user = c.get('user');

        /// Validate rating
        if (rating < 1 || rating > 5) {
            return c.json({ message: "Rating must be between 1 and 5" }, 400);
        }
        if (!packageId) {
            return c.json({ message: 'PackageId is required.' }, 400);
        }
        const packageData = await investmentModel.findOne(
            { userId: new mongoose.Types.ObjectId(user._id) },
            {
                buyPackagesDetails: {
                    $filter: {
                        input: "$buyPackagesDetails",
                        as: "package",
                        cond: {
                            $and: [
                                { $eq: ["$$package.packageId", new mongoose.Types.ObjectId(packageId)] }, // Match packageId
                                { $eq: ["$$package.status", 'ACTIVE'] } 
                            ]
                        }
                    }
                }
            }
        ).populate("buyPackagesDetails.packageId") as any

        if( packageData && packageData.buyPackagesDetails.length===0) {
            return c.json({ message: 'Package data not found.' }, 404);
        }
    
        const task = await TaskModel.findById(taskId);
        if (!task) {
            return c.json({ message: 'Task not found' }, 404);
        }

       /// Get today's date at 12 AM
       const todayMidnight = new Date();
       todayMidnight.setHours(0, 0, 0, 0);
        
       /// Check if the user has already added a review today
       const hasReviewedToday = task.reviews.some(
           (review) => review.userId.toString() === user._id.toString() && review.packageId.toString() === packageId &&  review.reviewDate >= todayMidnight
       );

       if (hasReviewedToday) {
           return c.json({ message: "You can only add one review per day" }, 403);
       }

        /// Add review
        task.reviews.push({ userId: new mongoose.Types.ObjectId(user._id), packageId: new mongoose.Types.ObjectId(packageId), rating, reviewDate: new Date() });
        await task.save();


        const {completed:completedTasks} = await  getProgress(user._id,packageId) as any
        if ( completedTasks === packageData.buyPackagesDetails[0].packageId.requiredTask) {
            const userWallet = await walletModel.findOne({ userId:user._id });
            if (!userWallet) {
                return c.json({ success: false, message: "Wallet not found" },400);
            }
            const today = new Date();
            const daysPassed = Math.ceil((today.getTime() - packageData.buyPackagesDetails[0].investmentDate.getTime()) / (1000 * 60 * 60 * 24));
            const daysToReceiveBonus= Number(packageData.buyPackagesDetails[0].packageId.totalBonus)/Number(packageData.buyPackagesDetails[0].packageId.dailyBonus)
            /// Calculate the number of days the user has been receiving bonus
            if (daysPassed <= daysToReceiveBonus) {
                userWallet.totalFlexibleBalanceInWeiUsd = (parseFloat(userWallet.totalFlexibleBalanceInWeiUsd) + parseFloat(parseEther((parseFloat(packageData.buyPackagesDetails[0].packageId.dailyEarnings) + parseFloat(packageData.buyPackagesDetails[0].packageId.dailyBonus)).toString()).toString())).toString();
            } else {
                userWallet.totalFlexibleBalanceInWeiUsd = (parseFloat(userWallet.totalFlexibleBalanceInWeiUsd) + parseFloat(parseEther(packageData.buyPackagesDetails[0].packageId.dailyEarnings.toString()).toString())).toString()
            }
            await userWallet.save();

            return c.json({ success: true, message: "Task completed & Wallet updated!" },200)
        }

        return c.json({ message: 'Review added successfully',task},200);
    } catch (error) {
        console.error('Error adding review:', error);
        return c.json({ message: 'Server error', error }, 500);
    }
};


// upload image
export const uploadImage = async (c: Context) => {
    try {
        const formData = await c.req.formData();
        console.log("Received Form Data:", formData);
    
        const image = formData.get("image");
    
        if (!(image instanceof File)) {
          return c.json({ error: "Image file is required." }, 400);
        }
    
        // Upload to Cloudinary
        const buffer = Buffer.from(await image.arrayBuffer());
        const uploadedImage: any = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({ folder: "uploads" }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }).end(buffer);
        });
    
        console.log("✅ Uploaded to Cloudinary:", uploadedImage.secure_url);
    
        return c.json({ message: "Image uploaded successfully", url: uploadedImage.secure_url }, 200);
    } catch (error) {
    console.error("❌ Upload Error:", error);
    return c.json({ message: "Server error", error }, 500);
    }
};


const getProgress = async (userId: string, packageId: string) => {
    try {
        // User ka specific package find karo
        const userPackage = await packageModel.findById(packageId);
        if (!userPackage) {
            return { success: false, message: "User package not found" };
        }

        // Aaj ka date calculate karo
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Count how many tasks are completed today for this package
        const completedTasks = await taskModel.countDocuments({
            "reviews.userId": userId,
            "reviews.packageId": packageId, // Filter by package
            "reviews.reviewDate": { $gte: today, $lt: tomorrow },
        });

        return {
            success: true,
            message: `Tasks completed: ${completedTasks}/${userPackage.requiredTask}`,
            completed: completedTasks,
            requiredTask: userPackage.requiredTask
        };
    } catch (error) {
        console.error("Error getting task progress:", error);
        return { success: false, message: "Internal server error" };
    }
}

export const getTaskProgress = async (c: Context) => {
    try {
        const user = c.get("user"); // Authenticated user
        const packageId = c.req.param("packageId"); // Package ID from URL
        const data = await  getProgress(user._id,packageId)
        return c.json({...data});
    } catch (error) {
        console.error("Error getting task progress:", error);
        return c.json({ success: false, message: "Internal server error" }, 500);
    }
};

