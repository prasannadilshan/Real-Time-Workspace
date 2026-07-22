import express from "express";
import { searchProfiles } from "../controllers/ProfileController.js";
import { requireAuth } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.get("/search", requireAuth, searchProfiles);

export default router;
