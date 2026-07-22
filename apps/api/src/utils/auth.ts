import bcrypt from "bcryptjs";
import { type SignOptions } from "jsonwebtoken";
import type { CookieOptions, Request, Response } from "express";
import env from '../config/env.js';
import type { JwtPayload } from "shared";
import { signJwtToken as signJwtTokenShared, verifyJwtToken as verifyJwtTokenShared } from "shared";

// PASSWORD UTILS
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
}

// JWT TOKENS UTILS
export function signJwtToken(
    payload: Pick<JwtPayload, "sub" | "email" | "profileId">,
    type: "access" | "refresh",
    expiresIn: SignOptions["expiresIn"] = "15m"
): string {
    const secret = type === "access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
    if(!secret) {
        console.error("JWT secret is not set", { type });
        throw new Error("Server misconfigured");
    }
    return signJwtTokenShared(payload, secret, type, expiresIn);
}
export function verifyJwtToken(token: string, type: "access" | "refresh"): JwtPayload {
    const secret = type === "access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
    if(!secret) {
        console.error("JWT secret is not set", { type });
        throw new Error("Server misconfigured");
    }
    return verifyJwtTokenShared(token, secret, type);
} 

// AUTH COOKIE UTILS
export const REFRESH_COOKIE_NAME = "token";
export function getRefreshCookieOptions(isProd: boolean): CookieOptions {
    return {
        httpOnly: true,
        secure: isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
    }
}
export function getRefreshTokenFromRequest(req: Request): string | undefined {
    const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    if(typeof tokenFromCookie === "string" && tokenFromCookie.length > 0) return tokenFromCookie;

    return undefined;
}
export function getAccessTokenFromRequest(req: Request): string | undefined {   
    const header = req.headers?.authorization ?? "";
    const tokenFromHeader = /^Bearer\s(.+)$/i.exec(header);
    if(tokenFromHeader && tokenFromHeader.length > 1) return tokenFromHeader[1];

    return undefined;
}
export function setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = env.NODE_ENV === "production";
    const cookieOptions = getRefreshCookieOptions(isProd);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
}
export function clearRefreshCookie(res: Response) {
    const isProd = env.NODE_ENV === "production";
    res.clearCookie(REFRESH_COOKIE_NAME, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
    });
}

//ASSERTIONS UTILS
export function assertAuthSecrets() {
    if(!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET) {
        console.log('Auth secrets are not defined')
        throw new Error("Server misconfigured");
    }
}