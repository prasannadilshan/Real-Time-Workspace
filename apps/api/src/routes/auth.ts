import express from "express";
import { register, login, logout, refresh, me } from "../controllers/AuthController.js";
import { requireAuth } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);

export default router;
