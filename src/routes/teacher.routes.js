import express from "express";

import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { getTeacherDashboard } from "../controllers/teacher.controllers.js";



const router = express.Router();

router.get(
  "/dashboard",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherDashboard
);

export default router;