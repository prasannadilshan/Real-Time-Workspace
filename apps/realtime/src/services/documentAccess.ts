import { api } from "./api.js";
import { PATHS } from "../constants/index.js";

export type AccessDecision =
  | { allowed: true; role: "owner" | "editor" | "viewer" }
  | { allowed: false; status: number; message: string };

export async function canReadDocument(
  accessToken: string,
  documentId: string,
): Promise<AccessDecision> {
  try {
    const response = await api.get(PATHS.DOCUMENT_BY_ID(documentId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 200) {
      return { allowed: true, role: "viewer" };
    } else {
      return { allowed: false, status: response.status, message: response.data.message };
    }
  } catch (error) {
    return { allowed: false, status: 503, message: "ACL service unavailable" };
  }
}
