
import mongoose from "mongoose";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";

const isTestMode = () => process.env.PAYMENT_MODE === "test";

// Student: create a test enrollment.
export const createEnrollment = async (req, res) => {
  try {
    if (!isTestMode()) {
      return res.status(503).json({
        success: false,
        message: "Test payment mode is disabled",
      });
    }

    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      status: "Published",
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Published course not found",
      });
    }

    const amount = Number(course.price);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course price",
      });
    }

    let enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: course._id,
    });

    if (enrollment?.status === "active") {
      if (
        !enrollment.expiresAt ||
        enrollment.expiresAt > new Date()
      ) {
        return res.status(409).json({
          success: false,
          message: "You are already enrolled in this course",
          enrollment,
        });
      }

      enrollment.status = "expired";
      await enrollment.save();
    }

    if (!enrollment) {
      enrollment = new Enrollment({
        student: req.user._id,
        course: course._id,
      });
    }

    // All paid-course test enrollments require admin approval.
    enrollment.amount = amount;
    enrollment.currency = "PKR";
    enrollment.paymentMethod = amount === 0 ? "free" : "test";
    enrollment.transactionId =
      amount === 0
        ? null
        : `TEST-${new mongoose.Types.ObjectId().toString()}`;

    enrollment.paymentReviewedBy = null;
    enrollment.paymentReviewedAt = null;
    enrollment.rejectionReason = null;
    enrollment.completedAt = null;
    enrollment.expiresAt = null;

    if (amount === 0) {
      enrollment.status = "active";
      enrollment.paymentStatus = "not_required";
      enrollment.enrolledAt = new Date();
    } else {
      enrollment.status = "pending";
      enrollment.paymentStatus = "pending";
      enrollment.enrolledAt = null;
    }

    await enrollment.save();

    return res.status(201).json({
      success: true,
      message:
        amount === 0
          ? "Free course enrollment successful"
          : "Test enrollment created. Awaiting admin approval.",
      enrollment,
    });
  } catch (error) {
    console.error("Create Enrollment Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Enrollment already exists. Refresh and try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create enrollment",
    });
  }
};

// Student: list own enrollments.
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
    })
      .populate("course", "title description image price category level")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    console.error("Get My Enrollments Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch enrollments",
    });
  }
};

// Student: get own enrollment for one course.
export const getMyCourseEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
    })
      .populate("course", "title image price category level")
      .lean();

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    return res.status(200).json({
      success: true,
      enrollment,
    });
  } catch (error) {
    console.error("Get Course Enrollment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch enrollment",
    });
  }
};

// Admin: list pending test payments.
export const getPendingEnrollments = async (req, res) => {
  try {
    if (!isTestMode()) {
      return res.status(503).json({
        success: false,
        message: "Test payment mode is disabled",
      });
    }

    const enrollments = await Enrollment.find({
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "test",
    })
      .populate("student", "name email")
      .populate("course", "title price category")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    console.error("Get Pending Enrollments Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch pending enrollments",
    });
  }
};

// Admin: approve a test enrollment.
export const approveEnrollmentPayment = async (req, res) => {
  try {
    if (!isTestMode()) {
      return res.status(503).json({
        success: false,
        message: "Test payment mode is disabled",
      });
    }

    const { enrollmentId } = req.params;

    if (!mongoose.isValidObjectId(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID",
      });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      {
        _id: enrollmentId,
        status: "pending",
        paymentStatus: "pending",
        paymentMethod: "test",
      },
      {
        $set: {
          status: "active",
          paymentStatus: "paid",
          enrolledAt: new Date(),
          paymentReviewedBy: req.user._id,
          paymentReviewedAt: new Date(),
          rejectionReason: null,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("student", "name email")
      .populate("course", "title price");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Pending test enrollment not found or already reviewed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Test enrollment approved. Course access activated.",
      enrollment,
    });
  } catch (error) {
    console.error("Approve Enrollment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to approve enrollment",
    });
  }
};

// Admin: reject a test enrollment.
export const rejectEnrollmentPayment = async (req, res) => {
  try {
    if (!isTestMode()) {
      return res.status(503).json({
        success: false,
        message: "Test payment mode is disabled",
      });
    }

    const { enrollmentId } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.isValidObjectId(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID",
      });
    }

    if (
      typeof rejectionReason !== "string" ||
      !rejectionReason.trim() ||
      rejectionReason.trim().length > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a rejection reason (maximum 500 characters)",
      });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      {
        _id: enrollmentId,
        status: "pending",
        paymentStatus: "pending",
        paymentMethod: "test",
      },
      {
        $set: {
          status: "cancelled",
          paymentStatus: "failed",
          paymentReviewedBy: req.user._id,
          paymentReviewedAt: new Date(),
          rejectionReason: rejectionReason.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("student", "name email")
      .populate("course", "title price");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Pending test enrollment not found or already reviewed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Test enrollment rejected",
      enrollment,
    });
  } catch (error) {
    console.error("Reject Enrollment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject enrollment",
    });
  }
};
