import express from "express";

import {
  enrollInCourse,
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

export default router;