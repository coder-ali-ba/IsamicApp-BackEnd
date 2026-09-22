import express from "express";
import { getMe, login, logout, register } from "../controllers/auth.controllers.js";
import { loginLimiter } from "../middlewares/rateLimit.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";



const auth_router = express.Router();

auth_router.post("/register", register);
auth_router.post("/login", loginLimiter , login);
auth_router.get("/me", requireAuth, getMe);

auth_router.post("/logout", logout);

export default auth_router;