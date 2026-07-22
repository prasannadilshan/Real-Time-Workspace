import type { WebSocket } from "ws";
import { canReadDocument } from "../../services/documentAccess.js";
import type {
  RoomMember,
  SocketContext,
  WsPresenceJoin,
  WsPresenceLeave,
  WsServerJoined,
  WsServerLeft,
} from "../../types/index.js";
import { sendJson } from "../index.js";

export type JoinResult =
  | { ok: true; payload: WsServerJoined }
  | { ok: false; status: number; message: string };

export type LeaveResult =
  | { ok: true; payload: WsServerLeft }
  | { ok: false; status: number; message: string };

export class RoomManager {
  private rooms = new Map<string, Map<string, RoomMember>>();

  private getDocumentId(options: Record<string, unknown>): string | undefined {
    const documentId = options.documentId;
    if (typeof documentId !== "string" || documentId.length === 0) return undefined;
    return documentId;
  }

  async join(
    ws: WebSocket,
    ctx: SocketContext,
    options: Record<string, unknown>,
  ): Promise<JoinResult> {
    const documentId = this.getDocumentId(options);
    if (!documentId) {
      return { ok: false, status: 400, message: "documentId is required" };
    }
    if (!ctx.user || !ctx.sessionId || !ctx.accessToken) {
      return { ok: false, status: 401, message: "Unauthorized" };
    }

    const access = await canReadDocument(ctx.accessToken, documentId);
    if (!access.allowed) {
      return { ok: false, status: access.status, message: access.message };
    }

    if (ctx.activeDocumentId && ctx.activeDocumentId !== documentId) {
      this.leave(ws, ctx);
    }

    const room = this.getOrCreateRoom(documentId);
    room.set(ctx.sessionId, {
      ws,
      profileId: ctx.user.profileId,
      sessionId: ctx.sessionId,
      role: access.role,
    });

    ctx.activeDocumentId = documentId;
    ctx.role = access.role;

    const joined: WsServerJoined = {
      type: "joined",
      documentId,
      profileId: ctx.user.profileId,
      role: access.role,
    };

    const presenceJoin: WsPresenceJoin = {
      type: "presence:join",
      documentId,
      profileId: ctx.user.profileId,
      sessionId: ctx.sessionId,
    };
    this.broadcastToRoom(documentId, presenceJoin, ctx.sessionId);

    return { ok: true, payload: joined };
  }

  leave(_ws: WebSocket, ctx: SocketContext): LeaveResult {
    const currentDocumentId = ctx.activeDocumentId;
    const sessionId = ctx.sessionId;
    if (!currentDocumentId || !sessionId || !ctx.user) {
      return { ok: false, status: 400, message: "No active room to leave" };
    }

    const room = this.rooms.get(currentDocumentId);
    if (!room) {
      delete ctx.activeDocumentId;
      return { ok: false, status: 404, message: "Room not found" };
    }

    room.delete(sessionId);
    if (room.size === 0) this.rooms.delete(currentDocumentId);

    const left: WsServerLeft = { type: "left", documentId: currentDocumentId };

    const presenceLeave: WsPresenceLeave = {
      type: "presence:leave",
      documentId: currentDocumentId,
      profileId: ctx.user.profileId,
      sessionId,
    };
    this.broadcastToRoom(currentDocumentId, presenceLeave, sessionId);

    delete ctx.activeDocumentId;
    delete ctx.role;
    return { ok: true, payload: left };
  }

  disconnect(_ws: WebSocket, ctx: SocketContext): void {
    const currentDocumentId = ctx.activeDocumentId;
    const sessionId = ctx.sessionId;
    if (!currentDocumentId || !sessionId || !ctx.user) return;

    const room = this.rooms.get(currentDocumentId);
    if (!room) return;

    room.delete(sessionId);
    if (room.size === 0) this.rooms.delete(currentDocumentId);

    const presenceLeave: WsPresenceLeave = {
      type: "presence:leave",
      documentId: currentDocumentId,
      profileId: ctx.user.profileId,
      sessionId,
    };
    this.broadcastToRoom(currentDocumentId, presenceLeave, sessionId);

    delete ctx.activeDocumentId;
    delete ctx.role;
  }

  private getOrCreateRoom(documentId: string): Map<string, RoomMember> {
    let room = this.rooms.get(documentId);
    if (!room) {
      room = new Map<string, RoomMember>();
      this.rooms.set(documentId, room);
    }
    return room;
  }

  private broadcastToRoom(
    documentId: string,
    payload: unknown,
    excludeSessionId?: string,
  ) {
    const room = this.rooms.get(documentId);
    if (!room) return;
    for (const [sessionId, member] of room) {
      if (excludeSessionId && sessionId === excludeSessionId) continue;
      if (member.ws.readyState === member.ws.OPEN) {
        sendJson(member.ws, payload);
      }
    }
  }
}

let roomManagerInstance: RoomManager | undefined;

export function getRoomManager(): RoomManager {
  if (!roomManagerInstance) {
    roomManagerInstance = new RoomManager();
  }
  return roomManagerInstance;
}
