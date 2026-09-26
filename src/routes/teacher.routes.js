import express from "express";

import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { getTeacherDashboard } from "../controllers/teacher.controllers.js";
import { getTeacherProfile, updateTeacherProfile } from "../controllers/teacher.profile.controllers.js";



const router = express.Router();

router.get(
  "/dashboard",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherDashboard
);

/* =========================================================
   TEACHER / SCHOLAR PROFILE
========================================================= */

router.get(
  "/profile",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherProfile
);

router.patch(
  "/profile",
  requireAuth,
  requireRole("teacher", "scholar"),
  updateTeacherProfile
);

export default router;