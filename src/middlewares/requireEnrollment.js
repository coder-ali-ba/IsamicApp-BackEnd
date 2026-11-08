
import mongoose from "mongoose";
import Enrollment from "../models/Enrollment.js";

export const requireEnrollment = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      status: "active",
      paymentStatus: { $in: ["paid", "not_required"] },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "Please enroll in this course to access its lessons",
      });
    }

    req.enrollment = enrollment;

    return next();
  } catch (error) {
    console.error("Enrollment Middleware Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify course enrollment",
    });
  }
};
