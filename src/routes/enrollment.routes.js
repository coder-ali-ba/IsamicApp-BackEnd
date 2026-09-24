import express from "express";

import {
  enrollInCourse,
  getAllEnrollmentsForAdmin,
  getMyEnrollments,
} from "../controllers/enrollment.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/courses/:courseId",
  requireAuth,
  requireRole("student"),
  enrollInCourse
);

router.get(
  "/my",
  requireAuth,
  requireRole("student"),
  getMyEnrollments
);

// ADMIN
router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  getAllEnrollmentsForAdmin
);

export default router;