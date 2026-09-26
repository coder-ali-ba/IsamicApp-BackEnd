import express from "express";

import {
  getTeacherClasses,
  getTeacherClassById,
  createTeacherClass,
  updateTeacherClass,
  deleteTeacherClass,

  getAdminClasses,
  getAdminClassById,
  getClassTeachersForAdmin,
  createAdminClass,
  updateAdminClass,
  deleteAdminClass,
} from "../controllers/class.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ================================================================
   TEACHER / SCHOLAR ACCESS
================================================================ */

const teacherAccess = [
  requireAuth,
  requireRole("teacher", "scholar"),
];

/* --------------------------------
   Teacher Classes
-------------------------------- */

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

/* ================================================================
   ADMIN ACCESS
================================================================ */

const adminAccess = [
  requireAuth,
  requireRole("admin"),
];

/* --------------------------------
   Admin: Teachers / Scholars
   IMPORTANT:
   This route must appear before
   /admin/:classId
-------------------------------- */

router.get(
  "/admin/teachers",
  ...adminAccess,
  getClassTeachersForAdmin
);

/* --------------------------------
   Admin: All Classes
-------------------------------- */

router.get(
  "/admin",
  ...adminAccess,
  getAdminClasses
);

/* --------------------------------
   Admin: Create Class
-------------------------------- */

router.post(
  "/admin",
  ...adminAccess,
  createAdminClass
);

/* --------------------------------
   Admin: Single Class
-------------------------------- */

router.get(
  "/admin/:classId",
  ...adminAccess,
  getAdminClassById
);

/* --------------------------------
   Admin: Update Class
-------------------------------- */

router.put(
  "/admin/:classId",
  ...adminAccess,
  updateAdminClass
);

/* --------------------------------
   Admin: Delete Class
-------------------------------- */

router.delete(
  "/admin/:classId",
  ...adminAccess,
  deleteAdminClass
);

export default router;