import { Buffer } from "node:buffer";
import { type RawData, type WebSocket } from "ws";

export function rawDataToString(data: RawData): string {
    if (typeof data === "string") return data;
    if (Buffer.isBuffer(data)) return data.toString("utf8");
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
    return Buffer.concat(data).toString("utf8");
}

export function parseJson(value: string): unknown {
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return undefined;
    }
}

export function parseRawData(data: RawData): Record<string, unknown> {
    const text = rawDataToString(data);
    const parsed = parseJson(text);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return {};
}

export function sendJson(ws: WebSocket, payload: unknown) {
  ws.send(JSON.stringify(payload));
}