import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
    title: string;
    type:string;
    description: string;
    image: string; // URL of task image
    points: number;
    status: "ACTIVE" | "INACTIVE";
    reviews: {
        userId: mongoose.Types.ObjectId;
        packageId:mongoose.Types.ObjectId;
        rating: number;
        reviewDate: Date;
    }[];
}

const taskSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        type: { type: String, required: true },
        description: { type: String, required: true },
        image: { type: String, required: true },
        points: { type: Number, required: true },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
        reviews: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
                rating: { type: Number, min: 1, max: 5 },
                reviewDate: { type: Date, default: Date.now, required: true },
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model<ITask>("Task", taskSchema);
