import mongoose, { Schema, Document } from 'mongoose';

export interface IInvite extends Document {
    documentId: mongoose.Types.ObjectId;
    inviterProfileId: mongoose.Types.ObjectId;
    inviteeProfileId: mongoose.Types.ObjectId;
    role: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Date;
    updatedAt: Date;
}

const InviteSchema = new Schema({
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    inviterProfileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    inviteeProfileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }
}, {
    timestamps: true
});

export const Invite = mongoose.model<IInvite>('Invite', InviteSchema);
