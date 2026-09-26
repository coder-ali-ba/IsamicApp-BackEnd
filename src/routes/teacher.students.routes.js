import express from "express";

import {
  getTeacherStudents,
  getTeacherStudent,
} from "../controllers/teachers.students.controllers.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";



const router = express.Router();

const teacherAccess = [
  requireAuth,
  requireRole("teacher", "scholar"),
];

// GET all students belonging to teacher's classes
router.get("/", ...teacherAccess, getTeacherStudents);

// GET one student
router.get("/:studentId", ...teacherAccess, getTeacherStudent);

export default router;