import express from "express";

import {
  getAdminSettings,
  updateAdminProfile,
  updatePlatformSettings,
  updateNotificationSettings,
  changeAdminPassword,
} from "../controllers/settings.controllers.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";



const router = express.Router();

/* ================================================================
   ADMIN ACCESS
================================================================ */

const adminAccess = [
  requireAuth,
  requireRole("admin"),
];

/* ================================================================
   GET SETTINGS
   GET /api/settings/admin
================================================================ */

router.get(
  "/admin",
  ...adminAccess,
  getAdminSettings
);

/* ================================================================
   PROFILE
   PUT /api/settings/admin/profile
================================================================ */

router.put(
  "/admin/profile",
  ...adminAccess,
  updateAdminProfile
);

/* ================================================================
   PLATFORM
   PUT /api/settings/admin/platform
================================================================ */

router.put(
  "/admin/platform",
  ...adminAccess,
  updatePlatformSettings
);

/* ================================================================
   NOTIFICATIONS
   PUT /api/settings/admin/notifications
================================================================ */

router.put(
  "/admin/notifications",
  ...adminAccess,
  updateNotificationSettings
);

/* ================================================================
   PASSWORD
   PUT /api/settings/admin/password
================================================================ */

router.put(
  "/admin/password",
  ...adminAccess,
  changeAdminPassword
);

export default router;

