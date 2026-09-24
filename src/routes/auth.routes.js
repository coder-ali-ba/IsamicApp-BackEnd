import express from "express";
import { getAdminDashboard, getAllUsersForAdmin, getMe, getTeachersForAdmin, login, logout, register, updateUserRoleByAdmin, updateUserStatusByAdmin } from "../controllers/auth.controllers.js";
import { loginLimiter } from "../middlewares/rateLimit.middleware.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";



const auth_router = express.Router();

auth_router.post("/register", register);
auth_router.post("/login", loginLimiter , login);
auth_router.get("/me", requireAuth, getMe);

auth_router.get(
  "/teachers",
  requireAuth,
  requireRole("admin"),
  getTeachersForAdmin
);

auth_router.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  getAllUsersForAdmin
);

auth_router.get(
  "/admin/dashboard",
  requireAuth,
  requireRole("admin"),
  getAdminDashboard
);

auth_router.patch(
  "/admin/users/:userId/role",
  requireAuth,
  requireRole("admin"),
  updateUserRoleByAdmin
);

auth_router.patch(
  "/admin/users/:userId/status",
  requireAuth,
  requireRole("admin"),
  updateUserStatusByAdmin
);

auth_router.post("/logout", logout);

export default auth_router;