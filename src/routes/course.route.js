import express from "express";

import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAllCoursesForAdmin,
  getMyTeacherCourses,
  getTeacherCourseById,
} from "../controllers/course.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */

// Get published courses
router.get("/", getCourses);

//Get For Teacher Courses
router.get(
  "/teacher/my",
  requireAuth,
  requireRole("teacher", "scholar"),
  getMyTeacherCourses
);

router.get(
  "/teacher/my/:courseId",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherCourseById
);


/* =========================
   ADMIN ROUTES
========================= */

// Get ALL courses for admin
// IMPORTANT: This must come BEFORE /:courseId
router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  getAllCoursesForAdmin
);

// Create course
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  createCourse
);

// Update course
router.put(
  "/:courseId",
  requireAuth,
  requireRole("admin"),
  updateCourse
);

// Delete course
router.delete(
  "/:courseId",
  requireAuth,
  requireRole("admin"),
  deleteCourse
);


/* =========================
   SINGLE COURSE
========================= */

// Get single published course
// Keep this AFTER /admin
router.get("/:courseId", getCourseById);



export default router;