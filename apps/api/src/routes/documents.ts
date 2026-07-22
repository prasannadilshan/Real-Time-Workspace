import express from "express";
import {getDocuments, getDocument, createDocument, updateDocument, deleteDocument} from "../controllers/DocumentController.js"
import {requireAuth} from "../middleware/auth.js";
const router: express.Router = express.Router();

router.get("/", requireAuth, getDocuments);
router.get("/:id", requireAuth, getDocument);
router.post("/", requireAuth, createDocument);
router.put("/:id", requireAuth, updateDocument);
router.delete("/:id", requireAuth, deleteDocument);

export default router;