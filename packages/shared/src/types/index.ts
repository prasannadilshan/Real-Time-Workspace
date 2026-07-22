// WEB SOCKET AUTH TYPES
export type JwtPayload = {
    sub: string;
    profileId: string;
    email: string;
    type: "access" | "refresh";
    iat?: number;
    exp?: number;
};