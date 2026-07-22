import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProfileSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    username: { type: String, required: true, trim: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
}, { timestamps: true });

export type Profile = InferSchemaType<typeof ProfileSchema> & {_id: mongoose.Types.ObjectId};

export const Profile = mongoose.models.Profile || mongoose.model<Profile>("Profile", ProfileSchema);