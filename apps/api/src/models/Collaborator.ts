import mongoose, {Schema, type InferSchemaType} from "mongoose";

const CollaboratorSchema = new Schema({
    documentId: {type: Schema.Types.ObjectId, ref: "Document", required: true, index: true},
    profileId: {type: Schema.Types.ObjectId, ref: "Profile", required: true, index: true},
    role: {type: String, enum: ["editor", "viewer"], default: "viewer", required: true},
}, {timestamps: true});

CollaboratorSchema.index({ documentId: 1, profileId: 1 }, { unique: true });

export type Collaborator = InferSchemaType<typeof CollaboratorSchema> & {_id: mongoose.Types.ObjectId};

export const Collaborator = mongoose.models.Collaborator || mongoose.model<Collaborator>("Collaborator", CollaboratorSchema);