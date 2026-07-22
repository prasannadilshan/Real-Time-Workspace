import type { JwtPayload } from "shared";
import type { WebSocket } from "ws";

export type WsClientAuthMessage = { type: "auth"; token: string };
export type WsServerAuthOk = {
  type: "authenticated";
  profileId: string;
  sessionId: string;
};

export type WsClientJoinMessage = { type: "join"; documentId: string };
export type WsClientLeaveMessage = { type: "leave"; documentId?: string };

export type WsServerJoined = {
  type: "joined";
  documentId: string;
  profileId: string;
  role: "owner" | "editor" | "viewer";
};

export type WsServerLeft = {
  type: "left";
  documentId: string;
};

export type WsPresenceJoin = {
  type: "presence:join";
  documentId: string;
  profileId: string;
  sessionId: string;
};

export type WsPresenceLeave = {
  type: "presence:leave";
  documentId: string;
  profileId: string;
  sessionId: string;
};

export type SocketContext = {
  authenticated: boolean;
  user?: JwtPayload;
  accessToken?: string;
  sessionId?: string;
  activeDocumentId?: string;
  role?: "owner" | "editor" | "viewer";
};

export type RoomMember = {
  ws: WebSocket;
  profileId: string;
  sessionId: string;
  role: "owner" | "editor" | "viewer";
};
