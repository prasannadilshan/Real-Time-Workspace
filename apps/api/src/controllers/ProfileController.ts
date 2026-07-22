import type { Request, Response } from "express";
import { Profile } from "../models/Profile.js";
import { AppError } from "../utils/appError.js";

export const searchProfiles = async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q) {
        return res.status(200).json({ profiles: [] });
    }

    const currentProfileId = req.user?.profileId;
    if (!currentProfileId) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // Case-insensitive regex search on username, firstName, lastName
    const regex = new RegExp(q, "i");
    const profiles = await Profile.find({
        _id: { $ne: currentProfileId },
        $or: [
            { username: regex },
            { firstName: regex },
            { lastName: regex }
        ]
    })
    .limit(10)
    .select("username firstName lastName")
    .lean();

    return res.status(200).json({ profiles });
};
