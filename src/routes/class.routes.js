import express from "express";

import {
  getTeacherClasses,
  getTeacherClassById,
  createTeacherClass,
  updateTeacherClass,
  deleteTeacherClass,
} from "../controllers/class.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

const teacherAccess = [
  requireAuth,
  requireRole("teacher", "scholar"),
];

/*
  IMPORTANT:
  Specific routes before :classId
*/

router.get(
  "/teacher/my",
  ...teacherAccess,
  getTeacherClasses
);

router.post(
  "/teacher/my",
  ...teacherAccess,
  createTeacherClass
);

router.get(
  "/teacher/my/:classId",
  ...teacherAccess,
  getTeacherClassById
);

router.put(
  "/teacher/my/:classId",
  ...teacherAccess,
  updateTeacherClass
);

router.delete(
  "/teacher/my/:classId",
  ...teacherAccess,
  deleteTeacherClass
);

export default router;