import express from "express";
import {
    getCollaborators,
    getCollaborator,
    addCollaborator,
    removeCollaborator,
    updateCollaborator,
} from "../controllers/CollaboratorController.js";
import { requireAuth } from "../middleware/auth.js";

/** Parent `/api/documents/:documentId/collaborators` supplies `documentId` */
const router: express.Router = express.Router({ mergeParams: true });

router.get("/", requireAuth, getCollaborators);
router.post("/", requireAuth, addCollaborator);
/** `:id` = Collaborator document `_id` */
router.get("/:id", requireAuth, getCollaborator);
router.put("/:id", requireAuth, updateCollaborator);
router.delete("/:id", requireAuth, removeCollaborator);

export default router;
