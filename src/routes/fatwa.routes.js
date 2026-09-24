import express from "express";

import {
  createFatwa,
  deleteFatwa,
  getAllFatwasForAdmin,
  getFatwaByIdForAdmin,
  getPublishedFatwaBySlug,
  getPublishedFatwas,
  getScholarsForFatwa,
  updateFatwa,
  updateFatwaStatus,
} from "../controllers/fatwa.controllers.js";

import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware.js";

const fatwaRouter = express.Router();

/*
|--------------------------------------------------------------------------
| Admin Fatwa Routes
|--------------------------------------------------------------------------
*/

/* Get all fatwas */
fatwaRouter.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  getAllFatwasForAdmin
);

/* Get scholars for assignment */
fatwaRouter.get(
  "/admin/scholars",
  requireAuth,
  requireRole("admin"),
  getScholarsForFatwa
);

/* Get single fatwa */
fatwaRouter.get(
  "/admin/:fatwaId",
  requireAuth,
  requireRole("admin"),
  getFatwaByIdForAdmin
);

/* Create fatwa */
fatwaRouter.post(
  "/admin",
  requireAuth,
  requireRole("admin"),
  createFatwa
);

/* Update fatwa */
fatwaRouter.patch(
  "/admin/:fatwaId",
  requireAuth,
  requireRole("admin"),
  updateFatwa
);

/* Update status */
fatwaRouter.patch(
  "/admin/:fatwaId/status",
  requireAuth,
  requireRole("admin"),
  updateFatwaStatus
);

/* Delete */
fatwaRouter.delete(
  "/admin/:fatwaId",
  requireAuth,
  requireRole("admin"),
  deleteFatwa
);

/* PUBLIC FATWA ROUTES */

fatwaRouter.get(
  "/",
  getPublishedFatwas
);

fatwaRouter.get(
  "/:slug",
  getPublishedFatwaBySlug
);

export default fatwaRouter;