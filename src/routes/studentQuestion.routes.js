import express from "express";

import {
  getQuestionTeachers,
  createStudentQuestion,
  getMyQuestions,
  getMyQuestionById,
  getTeacherQuestions,
  getTeacherQuestionById,
  answerStudentQuestion,
  closeStudentQuestion,
} from "../controllers/student.question.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const studentQuestionRouter = express.Router();

/* =========================================================
   STUDENT
========================================================= */

/* Available teachers / scholars */
studentQuestionRouter.get(
  "/teachers",
  requireAuth,
  requireRole("student"),
  getQuestionTeachers
);

/* Ask a question */
studentQuestionRouter.post(
  "/",
  requireAuth,
  requireRole("student"),
  createStudentQuestion
);

/* My questions */
studentQuestionRouter.get(
  "/my",
  requireAuth,
  requireRole("student"),
  getMyQuestions
);

/* Single question */
studentQuestionRouter.get(
  "/my/:questionId",
  requireAuth,
  requireRole("student"),
  getMyQuestionById
);


/* =========================================================
   TEACHER / SCHOLAR
========================================================= */

/* Received questions */
studentQuestionRouter.get(
  "/teacher",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherQuestions
);

/* Single received question */
studentQuestionRouter.get(
  "/teacher/:questionId",
  requireAuth,
  requireRole("teacher", "scholar"),
  getTeacherQuestionById
);

/* Answer question */
studentQuestionRouter.patch(
  "/teacher/:questionId/answer",
  requireAuth,
  requireRole("teacher", "scholar"),
  answerStudentQuestion
);

/* Close question */
studentQuestionRouter.patch(
  "/teacher/:questionId/close",
  requireAuth,
  requireRole("teacher", "scholar"),
  closeStudentQuestion
);

export default studentQuestionRouter;