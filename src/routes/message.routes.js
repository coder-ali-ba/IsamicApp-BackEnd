import express from "express";

import {
  createMessage,
  createAdminMessage,
  getMessageRecipientsForAdmin,
  getAllMessagesForAdmin,
  getMessageByIdForAdmin,
  markMessageAsRead,
  markMessageAsUnread,
  deleteMessageByAdmin,
  getMessageRecipientsForTeacher,
  createTeacherMessage,
  getMessagesForTeacher,
  getMessageByIdForTeacher,
  markTeacherMessageAsRead,
  markTeacherMessageAsUnread,
  deleteMessageByTeacher,
} from "../controllers/message.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();


/* =========================================================
   Public / User
========================================================= */

router.post(
  "/",
  createMessage
);


/* =========================================================
   Admin
========================================================= */

// Get users that admin can message
router.get(
  "/admin/recipients",
  requireAuth,
  requireRole("admin"),
  getMessageRecipientsForAdmin
);

// Admin sends a new message
router.post(
  "/admin",
  requireAuth,
  requireRole("admin"),
  createAdminMessage
);

// Get all messages
router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  getAllMessagesForAdmin
);

// Get single message
router.get(
  "/admin/:messageId",
  requireAuth,
  requireRole("admin"),
  getMessageByIdForAdmin
);

// Mark as read
router.patch(
  "/admin/:messageId/read",
  requireAuth,
  requireRole("admin"),
  markMessageAsRead
);

// Mark as unread
router.patch(
  "/admin/:messageId/unread",
  requireAuth,
  requireRole("admin"),
  markMessageAsUnread
);

// Delete
router.delete(
  "/admin/:messageId",
  requireAuth,
  requireRole("admin"),
  deleteMessageByAdmin
);


/* =========================================================
   Teacher / Scholar
========================================================= */

// Get available recipients
router.get(
  "/teacher/recipients",
  requireAuth,
  requireRole("teacher", "scholar"),
  getMessageRecipientsForTeacher
);

// Send message
router.post(
  "/teacher",
  requireAuth,
  requireRole("teacher", "scholar"),
  createTeacherMessage
);

// Get inbox / sent / all messages
router.get(
  "/teacher",
  requireAuth,
  requireRole("teacher", "scholar"),
  getMessagesForTeacher
);

// Get single message
router.get(
  "/teacher/:messageId",
  requireAuth,
  requireRole("teacher", "scholar"),
  getMessageByIdForTeacher
);

// Mark read
router.patch(
  "/teacher/:messageId/read",
  requireAuth,
  requireRole("teacher", "scholar"),
  markTeacherMessageAsRead
);

// Mark unread
router.patch(
  "/teacher/:messageId/unread",
  requireAuth,
  requireRole("teacher", "scholar"),
  markTeacherMessageAsUnread
);

// Delete own message
router.delete(
  "/teacher/:messageId",
  requireAuth,
  requireRole("teacher", "scholar"),
  deleteMessageByTeacher
);


export default router;