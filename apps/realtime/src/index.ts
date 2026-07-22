import { WebSocketServer } from "ws";
// @ts-ignore
import { setupWSConnection } from "y-websocket/bin/utils.js";
import { verifyAccessToken } from "./utils/auth.js";
import { canReadDocument } from "./services/documentAccess.js";
import env from "./config/env.js";

const port = Number(env.REALTIME_PORT ?? 4001);

const wss = new WebSocketServer({ port });

wss.on("connection", async (ws, req) => {
  // Expected URL format: /<documentId>?token=<accessToken>
  const url = new URL(req.url ?? "", `ws://${req.headers.host}`);
  const documentId = url.pathname.substring(1); // Remove leading slash
  const token = url.searchParams.get("token");

  if (!documentId || !token) {
    ws.close(1008, "Document ID and Auth token are required");
    return;
  }

  try {
    const user = verifyAccessToken(token);
    const access = await canReadDocument(token, documentId);

    if (!access.allowed) {
      ws.close(1008, access.message || "Unauthorized to access this document");
      return;
    }

    // Attach user profile to the request so y-websocket awareness can use it (optional)
    (req as any).user = user;

    // Hand over the WebSocket to Yjs
    setupWSConnection(ws, req, { docName: documentId });

  } catch (err) {
    console.error("WebSocket Auth Error:", err);
    ws.close(1008, "Invalid or expired token");
  }
});

wss.on("listening", () => {
  console.log(`Realtime WS listening on ws://localhost:${port}`);
});
