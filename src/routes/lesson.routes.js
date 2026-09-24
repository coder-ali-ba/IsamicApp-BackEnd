import express from "express";

import {
  createLesson,
  getLessonsByCourse,
  getAllLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
  deleteTeacherLesson,
  updateTeacherLesson,
  createTeacherLesson,
  getTeacherLessonsByCourse,
  getTeacherLessonById,
} from "../controllers/lesson.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();


// Teacher lesson routes
router.get(
  "/teacher/course/:courseId",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherLessonsByCourse
);

router.post(
  "/teacher/course/:courseId",
  requireAuth,
  requireRole("teacher", "scholar"),
  createTeacherLesson
);

router.put(
  "/teacher/:lessonId",
  requireAuth,
  requireRole("teacher", "scholar"),
  updateTeacherLesson
);

router.delete(
  "/teacher/:lessonId",
  requireAuth,
  requireRole("teacher", "scholar"),
  deleteTeacherLesson
);

router.get(
  "/teacher/:lessonId",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherLessonById
);

/* =========================
   PUBLIC / STUDENT
========================= */

// Get published lessons of a course
router.get(
  "/course/:courseId",
  requireAuth,
  getLessonsByCourse
);

// Get single lesson
router.get(
  "/:lessonId",
  requireAuth,
  getLessonById
);


/* =========================
   ADMIN
========================= */

// Get ALL lessons of a course
router.get(
  "/admin/course/:courseId",
  requireAuth,
  requireRole("admin"),
  getAllLessonsByCourse
);

// Create lesson
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  createLesson
);

// Update lesson
router.put(
  "/:lessonId",
  requireAuth,
  requireRole("admin"),
  updateLesson
);

// Delete lesson
router.delete(
  "/:lessonId",
  requireAuth,
  requireRole("admin"),
  deleteLesson
);

export default router;