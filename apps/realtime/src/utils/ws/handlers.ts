import type { RawData, WebSocket } from "ws";
import { parseRawData, sendJson } from "../index.js";
import type { SocketContext } from "../../types/index.js";
import { getRoomManager } from "./roomManager.js";
import type { JoinResult, LeaveResult } from "./roomManager.js";

const roomManager = getRoomManager();

function sendRoomOperationResult(ws: WebSocket, result: JoinResult | LeaveResult) {
  if (result.ok) {
    sendJson(ws, result.payload);
    return;
  }
  sendJson(ws, {
    type: "error",
    message: result.message,
    status: result.status,
  });
}

export async function handleMessage(
  ws: WebSocket,
  ctx: SocketContext,
  data: RawData,
): Promise<void> {
  try {
    const parsed = parseRawData(data);
    switch (parsed.type) {
      case "ping":
        sendJson(ws, { type: "pong", timestamp: Date.now() });
        return;
      case "join":
        {
          const result = await roomManager.join(ws, ctx, parsed);
          sendRoomOperationResult(ws, result);
        }
        return;
      case "leave":
        {
          const result = roomManager.leave(ws, ctx);
          sendRoomOperationResult(ws, result);
        }
        return;
      default:
        sendJson(ws, { type: "error", message: "Unknown message" });
        return;
    }
  } catch {
    sendJson(ws, { type: "error", message: "Internal server error" });
    return;
  }
}
