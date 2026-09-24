import express from "express";

import {
  createMessage,
  getAllMessagesForAdmin,
  getMessageByIdForAdmin,
  markMessageAsRead,
  markMessageAsUnread,
  deleteMessageByAdmin,
} from "../controllers/message.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public / User
|--------------------------------------------------------------------------
*/

router.post("/", createMessage);


/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/

router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  getAllMessagesForAdmin
);

router.get(
  "/admin/:messageId",
  requireAuth,
  requireRole("admin"),
  getMessageByIdForAdmin
);

router.patch(
  "/admin/:messageId/read",
  requireAuth,
  requireRole("admin"),
  markMessageAsRead
);

router.patch(
  "/admin/:messageId/unread",
  requireAuth,
  requireRole("admin"),
  markMessageAsUnread
);

router.delete(
  "/admin/:messageId",
  requireAuth,
  requireRole("admin"),
  deleteMessageByAdmin
);

export default router;