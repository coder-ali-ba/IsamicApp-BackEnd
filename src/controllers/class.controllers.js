import mongoose from "mongoose";

import Class from "../models/Class.js";
import ClassEnrollment from "../models/classEnrollment.js";
import User from "../models/Users.js";

/* --------------------------------
   Helpers
-------------------------------- */

const getClassStatus = (classItem) => {
  if (classItem.status === "Cancelled") {
    return "Cancelled";
  }

  if (classItem.status === "Completed") {
    return "Completed";
  }

  const now = new Date();
  const start = new Date(classItem.scheduledAt);

  const end = new Date(start.getTime() + classItem.durationMinutes * 60 * 1000);

  if (now >= start && now < end) {
    return "Live";
  }

  if (now < start) {
    return "Upcoming";
  }

  return "Completed";
};

const formatClass = (classItem, students = 0) => {
  const item = classItem.toObject ? classItem.toObject() : classItem;

  return {
    ...item,
    id: item._id,
    status: getClassStatus(item),
    students,
    duration: `${item.durationMinutes} min`,
  };
};

const getEnrollmentCounts = async (classIds) => {
  if (!classIds.length) {
    return new Map();
  }

  const enrollmentCounts = await ClassEnrollment.aggregate([
    {
      $match: {
        class: { $in: classIds },
        status: { $in: ["Registered", "Attended"] },
      },
    },
    {
      $group: {
        _id: "$class",
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    enrollmentCounts.map((item) => [item._id.toString(), item.count]),
  );
};

/* ================================================================
   TEACHER / SCHOLAR
================================================================ */

/* --------------------------------
   Get Teacher Classes
-------------------------------- */

export const getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const classes = await Class.find({
      teacher: teacherId,
    })
      .sort({ scheduledAt: 1 })
      .lean();

    const classIds = classes.map((item) => item._id);

    const countMap = await getEnrollmentCounts(classIds);

    const formattedClasses = classes.map((item) =>
      formatClass(item, countMap.get(item._id.toString()) || 0),
    );

    res.status(200).json({
      success: true,
      classes: formattedClasses,
    });
  } catch (error) {
    console.error("Get teacher classes error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
    });
  }
};

/* --------------------------------
   Get Single Teacher Class
-------------------------------- */

export const getTeacherClassById = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classItem = await Class.findOne({
      _id: classId,
      teacher: req.user._id,
    })
      .populate("teacher", "name email role")
      .lean();

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found or you do not have access",
      });
    }

    const students = await ClassEnrollment.countDocuments({
      class: classId,
      status: { $in: ["Registered", "Attended"] },
    });

    res.status(200).json({
      success: true,
      class: formatClass(classItem, students),
    });
  } catch (error) {
    console.error("Get teacher class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch class",
    });
  }
};


/* --------------------------------
   Create Class - Teacher/Scholar
-------------------------------- */

export const createTeacherClass = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      scheduledAt,
      durationMinutes,
      maxStudents,
      meetingUrl,
      learningOutcomes,
      topics,
      requirements,
    } = req.body;

    if (
      !title ||
      !category ||
      !level ||
      !scheduledAt ||
      !durationMinutes ||
      !maxStudents
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const scheduledDate = new Date(scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled date",
      });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message:
          "Class must be scheduled for a future date",
      });
    }

    const cleanArray = (value) => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    };

    const classItem = await Class.create({
      title: title.trim(),

      description:
        typeof description === "string"
          ? description.trim()
          : "",

      category,
      level,

      teacher: req.user._id,

      scheduledAt: scheduledDate,

      durationMinutes: Number(durationMinutes),

      maxStudents: Number(maxStudents),

      meetingUrl:
        typeof meetingUrl === "string"
          ? meetingUrl.trim()
          : "",

      learningOutcomes: cleanArray(
        learningOutcomes
      ),

      topics: cleanArray(topics),

      requirements: cleanArray(
        requirements
      ),

      status: "Scheduled",
    });

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: formatClass(classItem, 0),
    });
  } catch (error) {
    console.error(
      "Create teacher class error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create class",
    });
  }
};
/* --------------------------------
   Update Class - Teacher/Scholar
-------------------------------- */

/* --------------------------------
   Update Class - Teacher/Scholar
-------------------------------- */

export const updateTeacherClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classItem = await Class.findOne({
      _id: classId,
      teacher: req.user._id,
    });

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message:
          "Class not found or you do not have access",
      });
    }

    const {
      title,
      description,
      category,
      level,
      scheduledAt,
      durationMinutes,
      maxStudents,
      meetingUrl,
      learningOutcomes,
      topics,
      requirements,
      status,
    } = req.body;

    const cleanArray = (value) => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    };

    /* --------------------------------
       Schedule
    -------------------------------- */

    if (scheduledAt !== undefined) {
      const scheduledDate = new Date(
        scheduledAt
      );

      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid scheduled date",
        });
      }

      if (
        scheduledDate <= new Date() &&
        status !== "Completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Class must be scheduled for a future date",
        });
      }

      classItem.scheduledAt = scheduledDate;
    }

    /* --------------------------------
       Basic Fields
    -------------------------------- */

    if (title !== undefined) {
      classItem.title = title.trim();
    }

    if (description !== undefined) {
      classItem.description = description;
    }

    if (category !== undefined) {
      classItem.category = category;
    }

    if (level !== undefined) {
      classItem.level = level;
    }

    /* --------------------------------
       Duration
    -------------------------------- */

    if (durationMinutes !== undefined) {
      classItem.durationMinutes =
        Number(durationMinutes);
    }

    /* --------------------------------
       Maximum Students
    -------------------------------- */

    if (maxStudents !== undefined) {
      const currentStudents =
        await ClassEnrollment.countDocuments({
          class: classId,
          status: {
            $in: [
              "Registered",
              "Attended",
            ],
          },
        });

      if (
        Number(maxStudents) <
        currentStudents
      ) {
        return res.status(400).json({
          success: false,
          message: `Maximum students cannot be less than current registrations (${currentStudents})`,
        });
      }

      classItem.maxStudents =
        Number(maxStudents);
    }

    /* --------------------------------
       Meeting URL
    -------------------------------- */

    if (meetingUrl !== undefined) {
      classItem.meetingUrl =
        typeof meetingUrl === "string"
          ? meetingUrl.trim()
          : "";
    }

    /* --------------------------------
       Learning Outcomes
    -------------------------------- */

    if (
      learningOutcomes !== undefined
    ) {
      classItem.learningOutcomes =
        cleanArray(learningOutcomes);
    }

    /* --------------------------------
       Topics
    -------------------------------- */

    if (topics !== undefined) {
      classItem.topics =
        cleanArray(topics);
    }

    /* --------------------------------
       Requirements
    -------------------------------- */

    if (requirements !== undefined) {
      classItem.requirements =
        cleanArray(requirements);
    }

    /* --------------------------------
       Status
    -------------------------------- */

    if (status !== undefined) {
      if (
        ![
          "Scheduled",
          "Cancelled",
          "Completed",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid class status",
        });
      }

      classItem.status = status;
    }

    await classItem.save();

    const students =
      await ClassEnrollment.countDocuments({
        class: classId,
        status: {
          $in: [
            "Registered",
            "Attended",
          ],
        },
      });

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      class: formatClass(
        classItem,
        students
      ),
    });
  } catch (error) {
    console.error(
      "Update teacher class error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update class",
    });
  }
};

/* --------------------------------
   Delete Class - Teacher/Scholar
-------------------------------- */

export const deleteTeacherClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classItem = await Class.findOne({
      _id: classId,
      teacher: req.user._id,
    });

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found or you do not have access",
      });
    }

    await ClassEnrollment.deleteMany({
      class: classId,
    });

    await Class.deleteOne({
      _id: classId,
    });

    res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Delete teacher class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete class",
    });
  }
};

/* ================================================================
   ADMIN
================================================================ */

/* --------------------------------
   Get Admin Classes
-------------------------------- */

export const getAdminClasses = async (req, res) => {
  try {
    const { search = "", category = "All", status = "All" } = req.query;

    const query = {};

    if (category !== "All") {
      query.category = category;
    }

    /*
      We don't directly query the calculated statuses
      "Live" and "Upcoming" because those are derived
      from scheduledAt + durationMinutes.

      We fetch the classes first and apply the status
      filter after formatting.
    */

    let classes = await Class.find(query)
      .populate("teacher", "name email role isActive isVerified")
      .sort({ scheduledAt: 1 })
      .lean();

    const classIds = classes.map((item) => item._id);

    const countMap = await getEnrollmentCounts(classIds);

    let formattedClasses = classes.map((item) =>
      formatClass(item, countMap.get(item._id.toString()) || 0),
    );

    /* --------------------------------
       Search
    -------------------------------- */

    const searchText = String(search).trim().toLowerCase();

    if (searchText) {
      formattedClasses = formattedClasses.filter((item) => {
        const teacherName = item.teacher?.name?.toLowerCase() || "";

        const teacherEmail = item.teacher?.email?.toLowerCase() || "";

        return (
          item.title.toLowerCase().includes(searchText) ||
          teacherName.includes(searchText) ||
          teacherEmail.includes(searchText) ||
          item.category.toLowerCase().includes(searchText) ||
          item.level.toLowerCase().includes(searchText)
        );
      });
    }

    /* --------------------------------
       Status Filter
    -------------------------------- */

    if (status !== "All") {
      formattedClasses = formattedClasses.filter(
        (item) => item.status === status,
      );
    }

    res.status(200).json({
      success: true,
      classes: formattedClasses,
    });
  } catch (error) {
    console.error("Get admin classes error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
    });
  }
};

/* --------------------------------
   Get Single Admin Class
-------------------------------- */

export const getAdminClassById = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classItem = await Class.findById(classId)
      .populate("teacher", "name email role isActive isVerified")
      .lean();

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const students = await ClassEnrollment.countDocuments({
      class: classId,
      status: {
        $in: ["Registered", "Attended"],
      },
    });

    res.status(200).json({
      success: true,
      class: formatClass(classItem, students),
    });
  } catch (error) {
    console.error("Get admin class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch class",
    });
  }
};

/* --------------------------------
   Get Teachers/Scholars for Admin
-------------------------------- */

export const getClassTeachersForAdmin = async (req, res) => {
  try {
    const teachers = await User.find({
      role: {
        $in: ["teacher", "scholar"],
      },
      isActive: true,
    })
      .select("_id name email role isActive isVerified")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      teachers,
    });
  } catch (error) {
    console.error("Get class teachers for admin error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch teachers",
    });
  }
};

/* --------------------------------
   Create Class - Admin
-------------------------------- */

export const createAdminClass = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      teacher,
      scheduledAt,
      durationMinutes,
      maxStudents,
      meetingUrl,
      learningOutcomes,
      topics,
      requirements,
    } = req.body;

    const cleanArray = (value) => {
      if (!Array.isArray(value)) return [];

      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    };

    if (
      !title ||
      !category ||
      !level ||
      !teacher ||
      !scheduledAt ||
      !durationMinutes ||
      !maxStudents
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required class fields.",
      });
    }

    const scheduledDate = new Date(scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled date.",
      });
    }

    const teacherUser = await User.findById(teacher);

    if (!teacherUser) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const classItem = await Class.create({
      title,
      description: description || "",
      category,
      level,
      teacher,
      scheduledAt: scheduledDate,
      durationMinutes: Number(durationMinutes),
      maxStudents: Number(maxStudents),
      meetingUrl: meetingUrl || "",

      // New dynamic class details
      learningOutcomes: cleanArray(learningOutcomes),
      topics: cleanArray(topics),
      requirements: cleanArray(requirements),

      status: "Scheduled",
    });

    const populatedClass = await Class.findById(classItem._id).populate(
      "teacher",
      "name email role"
    );

    return res.status(201).json({
      success: true,
      message: "Class created successfully.",
      class: formatClass(populatedClass),
    });
  } catch (error) {
    console.error("createAdminClass error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create class.",
      error: error.message,
    });
  }
};

/* --------------------------------
   Update Class - Admin
-------------------------------- */

export const updateAdminClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const {
      title,
      description,
      category,
      level,
      teacher,
      scheduledAt,
      durationMinutes,
      maxStudents,
      meetingUrl,
      learningOutcomes,
      topics,
      requirements,
      status,
    } = req.body;

    const classItem = await Class.findById(classId);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    const cleanArray = (value) => {
      if (!Array.isArray(value)) return [];

      return value
        .map((item) => String(item).trim())
        .filter(Boolean);
    };

    if (title !== undefined) {
      classItem.title = title;
    }

    if (description !== undefined) {
      classItem.description = description;
    }

    if (category !== undefined) {
      classItem.category = category;
    }

    if (level !== undefined) {
      classItem.level = level;
    }

    if (teacher !== undefined) {
      const teacherUser = await User.findById(teacher);

      if (!teacherUser) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found.",
        });
      }

      classItem.teacher = teacher;
    }

    if (scheduledAt !== undefined) {
      const scheduledDate = new Date(scheduledAt);

      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid scheduled date.",
        });
      }

      classItem.scheduledAt = scheduledDate;
    }

    if (durationMinutes !== undefined) {
      classItem.durationMinutes = Number(durationMinutes);
    }

    if (maxStudents !== undefined) {
      classItem.maxStudents = Number(maxStudents);
    }

    if (meetingUrl !== undefined) {
      classItem.meetingUrl = meetingUrl || "";
    }

    // New dynamic class details
    if (learningOutcomes !== undefined) {
      classItem.learningOutcomes = cleanArray(learningOutcomes);
    }

    if (topics !== undefined) {
      classItem.topics = cleanArray(topics);
    }

    if (requirements !== undefined) {
      classItem.requirements = cleanArray(requirements);
    }

    if (status !== undefined) {
      classItem.status = status;
    }

    await classItem.save();

    const populatedClass = await Class.findById(classItem._id).populate(
      "teacher",
      "name email role"
    );

    return res.status(200).json({
      success: true,
      message: "Class updated successfully.",
      class: formatClass(populatedClass),
    });
  } catch (error) {
    console.error("updateAdminClass error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update class.",
      error: error.message,
    });
  }
};

/* --------------------------------
   Delete Class - Admin
-------------------------------- */

export const deleteAdminClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classItem = await Class.findById(classId);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    /*
      Remove all enrollments belonging to this class
      before deleting the class itself.
    */

    await ClassEnrollment.deleteMany({
      class: classId,
    });

    await Class.deleteOne({
      _id: classId,
    });

    res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete class",
    });
  }
};

/* ================================================================
   STUDENT ACCESS
================================================================ */

/* --------------------------------
   Get Available Classes
-------------------------------- */

export const getStudentClasses = async (req, res) => {
  try {
    const {
      search = "",
      category = "All",
      level = "All",
      status = "All",
    } = req.query;

    const query = {};

    if (category !== "All") {
      query.category = category;
    }

    if (level !== "All") {
      query.level = level;
    }

    let classes = await Class.find(query)
      .populate("teacher", "name email role")
      .sort({ scheduledAt: 1 })
      .lean();

    const classIds = classes.map((item) => item._id);

    const countMap = await getEnrollmentCounts(classIds);

    let formattedClasses = classes.map((item) =>
      formatClass(item, countMap.get(item._id.toString()) || 0),
    );

    /* --------------------------------
       Search
    -------------------------------- */

    const searchText = String(search).trim().toLowerCase();

    if (searchText) {
      formattedClasses = formattedClasses.filter((item) => {
        const teacherName = item.teacher?.name?.toLowerCase() || "";

        return (
          item.title.toLowerCase().includes(searchText) ||
          item.description?.toLowerCase().includes(searchText) ||
          teacherName.includes(searchText) ||
          item.category.toLowerCase().includes(searchText) ||
          item.level.toLowerCase().includes(searchText)
        );
      });
    }

    /* --------------------------------
       Status Filter
    -------------------------------- */

    if (status !== "All") {
      formattedClasses = formattedClasses.filter(
        (item) => item.status === status,
      );
    }

    /* --------------------------------
       Student Enrollment Status
    -------------------------------- */

    const enrollments = await ClassEnrollment.find({
      student: req.user._id,
      class: { $in: classIds },
    })
      .select("class status")
      .lean();

    const enrollmentMap = new Map(
      enrollments.map((item) => [item.class.toString(), item.status]),
    );

    formattedClasses = formattedClasses.map((item) => ({
      ...item,
      enrollmentStatus: enrollmentMap.get(item.id.toString()) || null,
      isEnrolled: enrollmentMap.has(item.id.toString()),
      seatsRemaining: Math.max(item.maxStudents - item.students, 0),
    }));

    res.status(200).json({
      success: true,
      classes: formattedClasses,
    });
  } catch (error) {
    console.error("Get student classes error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
    });
  }
};

/* --------------------------------
   Get Single Student Class
-------------------------------- */

export const getStudentClassById = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classItem = await Class.findById(classId)
      .populate("teacher", "name email role")
      .lean();

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const students = await ClassEnrollment.countDocuments({
      class: classId,
      status: {
        $in: ["Registered", "Attended"],
      },
    });

    const enrollment = await ClassEnrollment.findOne({
      student: req.user._id,
      class: classId,
    })
      .select("status registeredAt")
      .lean();

    const formattedClass = formatClass(classItem, students);

    res.status(200).json({
      success: true,
      class: {
        ...formattedClass,
        enrollmentStatus: enrollment?.status || null,
        isEnrolled: Boolean(enrollment),
        registeredAt: enrollment?.registeredAt || null,
        seatsRemaining: Math.max(classItem.maxStudents - students, 0),
      },
    });
  } catch (error) {
    console.error("Get student class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch class",
    });
  }
};



/* --------------------------------
   Get My Classes
-------------------------------- */

export const getMyStudentClasses = async (req, res) => {
  try {
    const enrollments = await ClassEnrollment.find({
      student: req.user._id,
    })
      .populate({
        path: "class",
        populate: {
          path: "teacher",
          select: "name email role",
        },
      })
      .sort({ registeredAt: -1 })
      .lean();

    const classes = enrollments
      .filter((item) => item.class)
      .map((item) => {
        const formatted = formatClass(item.class, 0);

        return {
          ...formatted,
          enrollmentStatus: item.status,
          isEnrolled: true,
          registeredAt: item.registeredAt,
        };
      });

    res.status(200).json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("Get my student classes error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch your classes",
    });
  }
};

/* --------------------------------
   Enroll Student
-------------------------------- */

export const enrollStudentInClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const classItem = await Class.findById(classId)
      .populate("teacher", "name email role");

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const currentStatus = getClassStatus(classItem);

    /* --------------------------------
       Class Status Validation
    -------------------------------- */

    if (classItem.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This class has been cancelled",
      });
    }

    if (
      currentStatus === "Completed" ||
      classItem.status === "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message: "This class has already been completed",
      });
    }

    if (currentStatus === "Live") {
      return res.status(400).json({
        success: false,
        message: "You cannot enroll in a class that is already live",
      });
    }

    /* --------------------------------
       Check Existing Enrollment
    -------------------------------- */

    const existingEnrollment =
      await ClassEnrollment.findOne({
        student: req.user._id,
        class: classId,
      });

    if (existingEnrollment) {
      /*
        If the previous enrollment was cancelled,
        allow the student to re-enroll.
      */
      if (existingEnrollment.status === "Cancelled") {
        const students =
          await ClassEnrollment.countDocuments({
            class: classId,
            status: {
              $in: ["Registered", "Attended"],
            },
          });

        if (students >= classItem.maxStudents) {
          return res.status(400).json({
            success: false,
            message: "This class is full",
          });
        }

        existingEnrollment.status = "Registered";
        existingEnrollment.registeredAt = new Date();

        await existingEnrollment.save();

        const updatedStudents =
          await ClassEnrollment.countDocuments({
            class: classId,
            status: {
              $in: ["Registered", "Attended"],
            },
          });

        const formattedClass = formatClass(
          classItem,
          updatedStudents
        );

        return res.status(200).json({
          success: true,
          message: "You have re-enrolled successfully",
          enrollment: existingEnrollment,
          class: {
            ...formattedClass,
            enrollmentStatus: "Registered",
            isEnrolled: true,
            registeredAt:
              existingEnrollment.registeredAt,
            seatsRemaining: Math.max(
              classItem.maxStudents -
                updatedStudents,
              0
            ),
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this class",
      });
    }

    /* --------------------------------
       Check Available Seats
    -------------------------------- */

    const students =
      await ClassEnrollment.countDocuments({
        class: classId,
        status: {
          $in: ["Registered", "Attended"],
        },
      });

    if (students >= classItem.maxStudents) {
      return res.status(400).json({
        success: false,
        message: "This class is full",
      });
    }

    /* --------------------------------
       Create Enrollment
    -------------------------------- */

    const enrollment =
      await ClassEnrollment.create({
        student: req.user._id,
        class: classId,
        status: "Registered",
        registeredAt: new Date(),
      });

    /* --------------------------------
       Get Updated Enrollment Count
    -------------------------------- */

    const updatedStudents =
      await ClassEnrollment.countDocuments({
        class: classId,
        status: {
          $in: ["Registered", "Attended"],
        },
      });

    const formattedClass = formatClass(
      classItem,
      updatedStudents
    );

    return res.status(201).json({
      success: true,
      message: "Successfully enrolled in class",
      enrollment,
      class: {
        ...formattedClass,
        enrollmentStatus: "Registered",
        isEnrolled: true,
        registeredAt: enrollment.registeredAt,
        seatsRemaining: Math.max(
          classItem.maxStudents -
            updatedStudents,
          0
        ),
      },
    });
  } catch (error) {
    console.error(
      "Enroll student error:",
      error
    );

    /*
      Handles the unique index:
      student + class
    */
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this class",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to enroll in class",
    });
  }
};


/* --------------------------------
   Cancel Enrollment
-------------------------------- */

export const cancelStudentEnrollment = async (
  req,
  res
) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const enrollment =
      await ClassEnrollment.findOne({
        student: req.user._id,
        class: classId,
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "You are not enrolled in this class",
      });
    }

    if (enrollment.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Your enrollment is already cancelled",
      });
    }

    const classItem = await Class.findById(
      classId
    ).populate(
      "teacher",
      "name email role"
    );

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const currentStatus =
      getClassStatus(classItem);

    /* --------------------------------
       Prevent Cancellation After Start
    -------------------------------- */

    if (
      currentStatus === "Live" ||
      currentStatus === "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment cannot be cancelled after the class has started",
      });
    }

    /* --------------------------------
       Cancel Enrollment
    -------------------------------- */

    enrollment.status = "Cancelled";

    await enrollment.save();

    /* --------------------------------
       Get Updated Enrollment Count
    -------------------------------- */

    const updatedStudents =
      await ClassEnrollment.countDocuments({
        class: classId,
        status: {
          $in: ["Registered", "Attended"],
        },
      });

    const formattedClass = formatClass(
      classItem,
      updatedStudents
    );

    return res.status(200).json({
      success: true,
      message: "Enrollment cancelled successfully",
      enrollment,
      class: {
        ...formattedClass,
        enrollmentStatus: "Cancelled",
        isEnrolled: false,
        registeredAt:
          enrollment.registeredAt,
        seatsRemaining: Math.max(
          classItem.maxStudents -
            updatedStudents,
          0
        ),
      },
    });
  } catch (error) {
    console.error(
      "Cancel student enrollment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to cancel enrollment",
    });
  }
};
