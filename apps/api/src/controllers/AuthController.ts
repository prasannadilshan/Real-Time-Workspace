import {registerBodySchema, loginBodySchema} from "../schemas/index.js";
import type { Request, Response } from "express";
import {hashPassword, signJwtToken, setRefreshCookie, verifyPassword, clearRefreshCookie, getRefreshTokenFromRequest, verifyJwtToken} from "../utils/auth.js";
import { User } from "../models/User.js";
import { Profile } from "../models/Profile.js";
import mongoose from "mongoose";
import { AppError } from "../utils/appError.js";

export const register = async (req: Request, res: Response) => {
    const parsed = registerBodySchema.safeParse(req.body);
    if(!parsed.success) {
        console.error('Invalid request body', parsed.error);
        throw new AppError('Invalid request body', 400, "INVALID_REQUEST_BODY");
    }
    const { email, password, firstName, lastName, username } = parsed.data;
    
    const existingUser = await User.findOne({email});
    if(existingUser) {
        console.error('User already exists', email);
        return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({email, password: hashedPassword});
    let profile = null;
    
    try {
        profile = await Profile.create({firstName, lastName, username, userId: user._id});
    } catch (err) {
        // Manual rollback if profile creation fails
        await User.findByIdAndDelete(user._id);
        throw err;
    }

    return res.status(200).json({profile});
}

export const login = async (req: Request, res: Response) => {
    const parsed = loginBodySchema.safeParse(req.body);
    if(!parsed.success) {
        console.error('Invalid request body', parsed.error);    
        throw new AppError('Invalid request body', 400, "INVALID_REQUEST_BODY");
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({email}).select("+password");
    if(!user) {
        console.error('User not found', email);
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isPasswordValid = await verifyPassword(password, user.password);
    if(!isPasswordValid) {
        console.error('Invalid password', email);
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const profile = await Profile.findOne({userId: user._id});
    const params = {sub: user._id.toString(), email: user.email, profileId: profile?._id.toString()};
    const accessToken = signJwtToken(params, "access", "15m");
    const refreshToken = signJwtToken(params, "refresh", "7d");
    setRefreshCookie(res, refreshToken);
    return res.status(200).json({accessToken,profile});
}

export const logout = async (_req: Request, res: Response) => {
    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out successfully" });
};

export const me = async (req: Request, res: Response) => {
    const { sub } = req.user!;
    const profile = await Profile.findOne({ userId: sub }).lean();
    return res.status(200).json({profile});
};

export const refresh = async (req: Request, res: Response) => {
    const token = getRefreshTokenFromRequest(req);
    if(!token) {
        console.error("No refresh token found");
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const payload = verifyJwtToken(token, "refresh");
    const accessToken = signJwtToken({sub: payload.sub, email: payload.email, profileId: payload.profileId}, "access", "15m");
    const refreshToken = signJwtToken({sub: payload.sub, email: payload.email, profileId: payload.profileId}, "refresh", "7d");
    setRefreshCookie(res, refreshToken);
    return res.status(200).json({ accessToken });
};