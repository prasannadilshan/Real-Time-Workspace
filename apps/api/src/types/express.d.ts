import type { JwtPayload } from "../utils/auth.js";

declare global {
    namespace Express {
        interface Request {
            user?: Pick<JwtPayload, "sub" | "profileId" | "email">;
        }
    }
}

export {};
