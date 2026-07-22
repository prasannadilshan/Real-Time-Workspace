import jwt, { type SignOptions } from "jsonwebtoken";
import { type JwtPayload } from "../types/index.js";

export function signJwtToken(
    payload: Pick<JwtPayload, "sub" | "email" | "profileId">,
    secret: string,
    type: "access" | "refresh",
    expiresIn: SignOptions["expiresIn"] = "15m"
): string {
    return jwt.sign(
        { sub: payload.sub, email: payload.email, profileId: payload.profileId, type },
        secret,
        { algorithm: "HS256", expiresIn }
    );
}
export function verifyJwtToken(token: string, secret: string, type: "access" | "refresh"): JwtPayload {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof decoded !== "object" || decoded === null) {
        throw new Error("Invalid token");
    }
    const o = decoded as Record<string, unknown>;
    if (typeof o.sub !== "string" || typeof o.email !== "string" || typeof o.profileId !== "string" || o.type !== type) {
        throw new Error("Invalid token");
    }
    return decoded as JwtPayload;
} 