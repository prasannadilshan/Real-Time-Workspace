import mongoose, {Schema, type InferSchemaType} from "mongoose";

const userSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
}, { timestamps: true });

export type User = InferSchemaType<typeof userSchema> & {_id: mongoose.Types.ObjectId};

export const User = mongoose.models.User || mongoose.model<User>("User", userSchema);