import Class from "../models/Class.js";
import ClassEnrollment from "../models/classEnrollment.js";
import User from "../models/Users.js";

const getTeacherStudents = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Find classes belonging to the logged-in teacher/scholar
    const classes = await Class.find({
      teacher: teacherId,
    })
      .select("_id title category level scheduledAt status")
      .sort({ scheduledAt: -1 })
      .lean();

    const classIds = classes.map((item) => item._id);

    if (classIds.length === 0) {
      return res.status(200).json({
        success: true,
        students: [],
        classes: [],
        stats: {
          totalStudents: 0,
          registered: 0,
          attended: 0,
          cancelled: 0,
        },
      });
    }

    // Find enrollments only for this teacher's classes
    const enrollments = await ClassEnrollment.find({
      class: { $in: classIds },
    })
      .populate({
        path: "student",
        model: "User",
        select: "_id name email role isActive isVerified",
      })
      .populate({
        path: "class",
        model: "Class",
        select: "_id title category level scheduledAt status",
      })
      .sort({ registeredAt: -1 })
      .lean();

    // Remove invalid/deleted student records
    const validEnrollments = enrollments.filter(
      (enrollment) =>
        enrollment.student &&
        enrollment.class &&
        enrollment.student.role === "student"
    );

    // Aggregate classes for each student
    const studentMap = new Map();

    validEnrollments.forEach((enrollment) => {
      const student = enrollment.student;
      const classData = enrollment.class;

      const studentId = student._id.toString();

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          isActive: student.isActive,
          isVerified: student.isVerified,
          classes: [],
          enrollmentCount: 0,
          registeredCount: 0,
          attendedCount: 0,
          cancelledCount: 0,
          latestRegisteredAt: enrollment.registeredAt,
        });
      }

      const studentData = studentMap.get(studentId);

      studentData.classes.push({
        enrollmentId: enrollment._id,
        classId: classData._id,
        title: classData.title,
        category: classData.category,
        level: classData.level,
        scheduledAt: classData.scheduledAt,
        classStatus: classData.status,
        enrollmentStatus: enrollment.status,
        registeredAt: enrollment.registeredAt,
      });

      studentData.enrollmentCount += 1;

      if (enrollment.status === "Registered") {
        studentData.registeredCount += 1;
      }

      if (enrollment.status === "Attended") {
        studentData.attendedCount += 1;
      }

      if (enrollment.status === "Cancelled") {
        studentData.cancelledCount += 1;
      }

      if (
        !studentData.latestRegisteredAt ||
        new Date(enrollment.registeredAt) >
          new Date(studentData.latestRegisteredAt)
      ) {
        studentData.latestRegisteredAt = enrollment.registeredAt;
      }
    });

    const students = Array.from(studentMap.values());

    // Statistics based on unique students
    const stats = {
      totalStudents: students.length,
      registered: students.filter(
        (student) => student.registeredCount > 0
      ).length,
      attended: students.filter(
        (student) => student.attendedCount > 0
      ).length,
      cancelled: students.filter(
        (student) => student.cancelledCount > 0
      ).length,
    };

    return res.status(200).json({
      success: true,
      students,
      classes,
      stats,
    });
  } catch (error) {
    console.error("Get teacher students error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};


const getTeacherStudent = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { studentId } = req.params;

    // Make sure the student exists
    const student = await User.findOne({
      _id: studentId,
      role: "student",
    }).select("_id name email role isActive isVerified createdAt");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Find teacher's classes
    const teacherClasses = await Class.find({
      teacher: teacherId,
    }).select("_id title category level scheduledAt status");

    const classIds = teacherClasses.map((item) => item._id);

    // Find this student's enrollments ONLY in teacher's classes
    const enrollments = await ClassEnrollment.find({
      student: studentId,
      class: { $in: classIds },
    })
      .populate({
        path: "class",
        model: "Class",
        select: "_id title category level scheduledAt status",
      })
      .sort({ registeredAt: -1 })
      .lean();

    if (enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: "This student is not enrolled in any of your classes",
      });
    }

    const summary = {
      totalClasses: enrollments.length,
      registered: enrollments.filter(
        (item) => item.status === "Registered"
      ).length,
      attended: enrollments.filter(
        (item) => item.status === "Attended"
      ).length,
      cancelled: enrollments.filter(
        (item) => item.status === "Cancelled"
      ).length,
    };

    return res.status(200).json({
      success: true,
      student,
      enrollments,
      summary,
    });
  } catch (error) {
    console.error("Get teacher student error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student details",
    });
  }
};


export {
  getTeacherStudents,
  getTeacherStudent,
};