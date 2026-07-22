import mongoose from "mongoose";
import env from "./env.js";

export const connectDB = async (): Promise<void> => {
    if(!env.MONGO_URI) {
        throw new Error("MONGO_URI is not set");
    }
    try {
        mongoose.set("strictQuery", true);
        await mongoose.connect(env.MONGO_URI as string, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB", error);
        process.exit(1);
    }
};

export const disconnectDB = async (): Promise<void> => {
    try {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");

    } catch (error) {
        console.error("Error disconnecting from MongoDB", error);
        process.exit(1);
    }
};