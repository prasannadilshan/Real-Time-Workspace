import { verifyJwtToken as verifyJwtTokenShared } from "shared";
import { type JwtPayload } from "shared";
import env from "../config/env.js";
import { type WsClientAuthMessage } from "../types/index.js";
import { rawDataToString, parseJson } from "./index.js";
import { type RawData } from "ws";

export type AuthenticateWsClientResult = {
  success: false;
  error: string;
} | {
  success: true;
  user: JwtPayload;
  token: string;
};

export function verifyAccessToken(token: string): JwtPayload {
    const secret = env.JWT_ACCESS_SECRET;
    if(!secret) {
        console.error("JWT secret is not set", { type: "access token" });
        throw new Error("Server misconfigured");
    }
    return verifyJwtTokenShared(token, secret, "access");
}

export function isWsClientAuthMessage(value: unknown): value is WsClientAuthMessage {
    if (typeof value !== "object" || value === null) return false;
    const o = value as Record<string, unknown>;
    return o.type === "auth" && typeof o.token === "string" && o.token.length > 0;
}

export function authenticateWsClient(data: RawData, isBinary: boolean): AuthenticateWsClientResult {
  if (isBinary) {
    return { success: false, error: "Expected text JSON auth message" };
  }

  const text = rawDataToString(data);
  const parsed = parseJson(text);
  if (!isWsClientAuthMessage(parsed)) {
    return { success: false, error: "First message must be { type: \"auth\", token }" };
  }

  try {
    const user = verifyAccessToken(parsed.token);
    return { success: true, user, token: parsed.token };
  } catch {
    return { success: false, error: "Invalid or expired token" };
  }
}