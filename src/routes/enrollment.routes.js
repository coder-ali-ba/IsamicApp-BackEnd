
import express from "express";

import {
  createEnrollment,
  getMyEnrollments,
  getMyCourseEnrollment,
  getPendingEnrollments,
  approveEnrollmentPayment,
  rejectEnrollmentPayment,
} from "../controllers/enrollment.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require cookie-based JWT authentication.
router.use(requireAuth);

// ========================================
// STUDENT ROUTES
// ========================================

// Get logged-in student's enrollments.
router.get(
  "/my",
  requireRole("student"),
  getMyEnrollments
);

// Create a dummy test enrollment.
router.post(
  "/course/:courseId",
  requireRole("student"),
  createEnrollment
);

// Get logged-in student's enrollments.
router.get(
  "/my",
  requireRole("student"),
  getMyEnrollments
);

// Get enrollment status for a particular course.
router.get(
  "/my/course/:courseId",
  requireRole("student"),
  getMyCourseEnrollment
);

// ========================================
// ADMIN ROUTES
// ========================================

// List pending test enrollments.
router.get(
  "/admin/pending",
  requireRole("admin"),
  getPendingEnrollments
);

// Approve a pending test enrollment.
router.patch(
  "/admin/:enrollmentId/approve",
  requireRole("admin"),
  approveEnrollmentPayment
);

// Reject a pending test enrollment.
router.patch(
  "/admin/:enrollmentId/reject",
  requireRole("admin"),
  rejectEnrollmentPayment
);

export default router;
