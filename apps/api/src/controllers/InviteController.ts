import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { Invite } from "../models/Invite.js";
import { Collaborator } from "../models/Collaborator.js";
import { Document as DocModel } from "../models/Document.js";
import mongoose from "mongoose";

export const sendInvite = async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const { profileId, role } = req.body;
    const inviterProfileId = req.user?.profileId;

    if (!inviterProfileId) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (!mongoose.Types.ObjectId.isValid(documentId) || !mongoose.Types.ObjectId.isValid(profileId)) {
        throw new AppError("Invalid ID format", 400, "INVALID_ID");
    }

    // Check if a collaborator record already exists
    const existingCollab = await Collaborator.findOne({ documentId, profileId });
    if (existingCollab) {
        return res.status(400).json({ error: "User is already a collaborator" });
    }

    // Check if pending invite already exists
    const existingInvite = await Invite.findOne({ documentId, inviteeProfileId: profileId, status: 'pending' });
    if (existingInvite) {
        return res.status(400).json({ error: "Invite already sent" });
    }

    const invite = await Invite.create({
        documentId,
        inviterProfileId,
        inviteeProfileId: profileId,
        role: role || 'viewer',
        status: 'pending'
    });

    return res.status(201).json({ invite });
};

export const getMyInvites = async (req: Request, res: Response) => {
    const profileId = req.user?.profileId;
    if (!profileId) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const invites = await Invite.find({ inviteeProfileId: profileId, status: 'pending' })
        .populate('documentId', 'title')
        .populate('inviterProfileId', 'firstName lastName username')
        .sort({ createdAt: -1 });

    return res.status(200).json({ invites });
};

export const acceptInvite = async (req: Request, res: Response) => {
    const { inviteId } = req.params;
    const profileId = req.user?.profileId;

    if (!profileId) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const invite = await Invite.findOne({ _id: inviteId, inviteeProfileId: profileId, status: 'pending' });
    if (!invite) {
        throw new AppError("Invite not found or already processed", 404, "NOT_FOUND");
    }

    invite.status = 'accepted';
    await invite.save();

    // Create collaborator
    const collab = await Collaborator.create({
        documentId: invite.documentId,
        profileId: invite.inviteeProfileId,
        role: invite.role
    });

    return res.status(200).json({ invite, collaborator: collab });
};

export const declineInvite = async (req: Request, res: Response) => {
    const { inviteId } = req.params;
    const profileId = req.user?.profileId;

    if (!profileId) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const invite = await Invite.findOne({ _id: inviteId, inviteeProfileId: profileId, status: 'pending' });
    if (!invite) {
        throw new AppError("Invite not found or already processed", 404, "NOT_FOUND");
    }

    invite.status = 'declined';
    await invite.save();

    return res.status(200).json({ message: "Invite declined" });
};
