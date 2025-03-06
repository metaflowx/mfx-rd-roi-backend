import { Context } from 'hono';
import TaskModel from '../models/taskModel';
import packageModel from '../models/packageModel';
import mongoose from 'mongoose';
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Task (Admin Only)
export const createTask = async (c: Context) => {
    try {
       
        // Extract fields and file path from context
        const fields = c.get("fields") as any;
        const filePath = c.get("filePath") as string;
        if (!fields || !filePath) {
            return c.json({ error: "All fields and image 222 file are required." }, 400);
        }

        const { title, type, description, points } = fields;

        console.log("Received Fields:", title, type, description, points);
        console.log("Stored Image Path:", filePath);

        // Save task in the database
        const newTask = await TaskModel.create({
            title,
            type,
            description,
            image: filePath,
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

        // Validate rating
        if (rating < 1 || rating > 5) {
            return c.json({ message: "Rating must be between 1 and 5" }, 400);
        }
        if (!packageId) {
            return c.json({ message: 'PackageId is required.' }, 400);
        }
        const packageData = await packageModel.findOne(packageId);
        if (!packageData) {
            return c.json({ message: 'Package data not found.' }, 404);
        }

        const task = await TaskModel.findById(taskId);
        if (!task) {
            return c.json({ message: 'Task not found' }, 404);
        }

       // Get today's date at 12 AM
       const todayMidnight = new Date();
       todayMidnight.setHours(0, 0, 0, 0);
        
       // Check if the user has already added a review today
       const hasReviewedToday = task.reviews.some(
           (review) => review.userId.toString() === user._id.toString() && review.packageId.toString() === packageId &&  review.reviewDate >= todayMidnight
       );

       if (hasReviewedToday) {
           return c.json({ message: "You can only add one review per day" }, 403);
       }

        // Add review
        task.reviews.push({ userId: new mongoose.Types.ObjectId(user._id), packageId: new mongoose.Types.ObjectId(packageId), rating, reviewDate: new Date() });
        await task.save();


        return c.json({ message: 'Review added successfully', task });
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