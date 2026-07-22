import type { RequestHandler } from "express";
import env from "../config/env.js";
import { getAccessTokenFromRequest, verifyJwtToken } from "../utils/auth.js";

export const requireAuth: RequestHandler = (req, res, next) => {
    if (!env.JWT_ACCESS_SECRET) {
        console.error("JWT_ACCESS_SECRET is not set");
        return res.status(500).json({ error: "Server misconfigured" });
    }
    const token = getAccessTokenFromRequest(req);
    if (!token) {
        console.error("No access token found");
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const payload = verifyJwtToken(token, "access");
        req.user = { sub: payload.sub, email: payload.email, profileId: payload.profileId };
        next();
    } catch {
        return res.status(401).json({ error: "Unauthorized" });
    }
};
