import Course from "../models/Course.js";
import Lesson from "../models/lesson.js";
import Enrollment from "../models/Enrollment.js";



export const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Get all courses belonging to logged-in teacher
    const courses = await Course.find({
      instructor: teacherId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const courseIds = courses.map((course) => course._id);

    // If teacher has no courses
    if (courseIds.length === 0) {
      return res.status(200).json({
        success: true,
        dashboard: {
          totalCourses: 0,
          publishedCourses: 0,
          totalLessons: 0,
          totalStudents: 0,
          recentCourses: [],
          recentLessons: [],
        },
      });
    }

    // Run independent queries together
    const [
      totalLessons,
      totalStudents,
      recentCourses,
      recentLessons,
    ] = await Promise.all([
      // Total lessons of teacher's courses
      Lesson.countDocuments({
        course: { $in: courseIds },
      }),

      // Unique students enrolled in teacher's courses
      Enrollment.distinct("student", {
        course: { $in: courseIds },
        status: { $in: ["active", "completed"] },
      }),

      // Latest 5 courses
      Course.find({
        instructor: teacherId,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Latest 5 lessons
      Lesson.find({
        course: { $in: courseIds },
      })
        .populate("course", "title")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const publishedCourses = courses.filter(
      (course) => course.status === "Published"
    ).length;

    res.status(200).json({
      success: true,
      dashboard: {
        totalCourses: courses.length,
        publishedCourses,
        totalLessons,
        totalStudents: totalStudents.length,
        recentCourses,
        recentLessons,
      },
    });
  } catch (error) {
    console.error("Teacher dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load teacher dashboard",
    });
  }
};