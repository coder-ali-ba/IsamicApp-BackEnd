import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";

export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const studentId = req.user._id;

    // Check course
    const course = await Course.findOne({
      _id: courseId,
      status: "Published",
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check existing enrollment
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course",
        enrollment: existingEnrollment,
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
    });

    // Increase student count
    await Course.findByIdAndUpdate(courseId, {
      $inc: {
        students: 1,
      },
    });

    const populatedEnrollment = await enrollment.populate([
      {
        path: "student",
        select: "name email role",
      },
      {
        path: "course",
        select: "title category level duration image price",
      },
    ]);

    return res.status(201).json({
      success: true,
      message: "Successfully enrolled in course",
      enrollment: populatedEnrollment,
    });
  } catch (error) {
    console.error("Enroll Course Error:", error);

    // Duplicate index protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
    })
      .populate(
        "course",
        "title description category level duration lessons students price image"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    console.error("Get My Enrollments Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};