import mongoose from "mongoose";

import Class from "../models/class.js";
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

  const end = new Date(
    start.getTime() + classItem.durationMinutes * 60 * 1000
  );

  if (now >= start && now < end) {
    return "Live";
  }

  if (now < start) {
    return "Upcoming";
  }

  return "Completed";
};

const formatClass = (classItem, students = 0) => {
  const item = classItem.toObject
    ? classItem.toObject()
    : classItem;

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
    enrollmentCounts.map((item) => [
      item._id.toString(),
      item.count,
    ])
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
      formatClass(
        item,
        countMap.get(item._id.toString()) || 0
      )
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
        message:
          "Class not found or you do not have access",
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

    const classItem = await Class.create({
      title,
      description,
      category,
      level,
      teacher: req.user._id,
      scheduledAt: scheduledDate,
      durationMinutes: Number(durationMinutes),
      maxStudents: Number(maxStudents),
      meetingUrl: meetingUrl || "",
      status: "Scheduled",
    });

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: formatClass(classItem, 0),
    });
  } catch (error) {
    console.error("Create teacher class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create class",
    });
  }
};

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
      status,
    } = req.body;

    if (scheduledAt !== undefined) {
      const scheduledDate = new Date(scheduledAt);

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

    if (durationMinutes !== undefined) {
      classItem.durationMinutes = Number(durationMinutes);
    }

    if (maxStudents !== undefined) {
      const currentStudents =
        await ClassEnrollment.countDocuments({
          class: classId,
          status: {
            $in: ["Registered", "Attended"],
          },
        });

      if (Number(maxStudents) < currentStudents) {
        return res.status(400).json({
          success: false,
          message: `Maximum students cannot be less than current registrations (${currentStudents})`,
        });
      }

      classItem.maxStudents = Number(maxStudents);
    }

    if (meetingUrl !== undefined) {
      classItem.meetingUrl = meetingUrl;
    }

    if (status !== undefined) {
      if (
        !["Scheduled", "Cancelled", "Completed"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid class status",
        });
      }

      classItem.status = status;
    }

    await classItem.save();

    const students = await ClassEnrollment.countDocuments({
      class: classId,
      status: { $in: ["Registered", "Attended"] },
    });

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      class: formatClass(classItem, students),
    });
  } catch (error) {
    console.error("Update teacher class error:", error);

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
        message:
          "Class not found or you do not have access",
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
    const {
      search = "",
      category = "All",
      status = "All",
    } = req.query;

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
      formatClass(
        item,
        countMap.get(item._id.toString()) || 0
      )
    );

    /* --------------------------------
       Search
    -------------------------------- */

    const searchText = String(search).trim().toLowerCase();

    if (searchText) {
      formattedClasses = formattedClasses.filter((item) => {
        const teacherName =
          item.teacher?.name?.toLowerCase() || "";

        const teacherEmail =
          item.teacher?.email?.toLowerCase() || "";

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
        (item) => item.status === status
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
      .populate(
        "teacher",
        "name email role isActive isVerified"
      )
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
      .select(
        "_id name email role isActive isVerified"
      )
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      teachers,
    });
  } catch (error) {
    console.error(
      "Get class teachers for admin error:",
      error
    );

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
      status,
    } = req.body;

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
        message: "Please provide all required fields",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(teacher)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID",
      });
    }

    const teacherUser = await User.findOne({
      _id: teacher,
      role: {
        $in: ["teacher", "scholar"],
      },
      isActive: true,
    });

    if (!teacherUser) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher or scholar not found or inactive",
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

    const classStatus = status || "Scheduled";

    if (
      !["Scheduled", "Cancelled", "Completed"].includes(
        classStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid class status",
      });
    }

    /*
      A newly created class should normally be future
      scheduled. Therefore Completed is not allowed
      during creation.
    */

    if (classStatus === "Completed") {
      return res.status(400).json({
        success: false,
        message:
          "A new class cannot be created with Completed status",
      });
    }

    const classItem = await Class.create({
      title: title.trim(),
      description: description || "",
      category,
      level,
      teacher: teacherUser._id,
      scheduledAt: scheduledDate,
      durationMinutes: Number(durationMinutes),
      maxStudents: Number(maxStudents),
      meetingUrl: meetingUrl || "",
      status: classStatus,
    });

    const populatedClass = await Class.findById(
      classItem._id
    )
      .populate(
        "teacher",
        "name email role isActive isVerified"
      )
      .lean();

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: formatClass(populatedClass, 0),
    });
  } catch (error) {
    console.error("Create admin class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create class",
    });
  }
};

/* --------------------------------
   Update Class - Admin
-------------------------------- */

export const updateAdminClass = async (req, res) => {
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
      status,
    } = req.body;

    /* --------------------------------
       Teacher
    -------------------------------- */

    if (teacher !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(teacher)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID",
        });
      }

      const teacherUser = await User.findOne({
        _id: teacher,
        role: {
          $in: ["teacher", "scholar"],
        },
        isActive: true,
      });

      if (!teacherUser) {
        return res.status(404).json({
          success: false,
          message:
            "Teacher or scholar not found or inactive",
        });
      }

      classItem.teacher = teacherUser._id;
    }

    /* --------------------------------
       Schedule
    -------------------------------- */

    if (scheduledAt !== undefined) {
      const scheduledDate = new Date(scheduledAt);

      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid scheduled date",
        });
      }

      /*
        Allow past dates only when the class is being
        explicitly marked Completed.
      */

      if (
        scheduledDate <= new Date() &&
        status !== "Completed" &&
        classItem.status !== "Completed"
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
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Class title cannot be empty",
        });
      }

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

    if (durationMinutes !== undefined) {
      const duration = Number(durationMinutes);

      if (
        Number.isNaN(duration) ||
        duration < 15 ||
        duration > 240
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Duration must be between 15 and 240 minutes",
        });
      }

      classItem.durationMinutes = duration;
    }

    /* --------------------------------
       Maximum Students
    -------------------------------- */

    if (maxStudents !== undefined) {
      const maximum = Number(maxStudents);

      if (
        Number.isNaN(maximum) ||
        maximum < 1 ||
        maximum > 500
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum students must be between 1 and 500",
        });
      }

      const currentStudents =
        await ClassEnrollment.countDocuments({
          class: classId,
          status: {
            $in: ["Registered", "Attended"],
          },
        });

      if (maximum < currentStudents) {
        return res.status(400).json({
          success: false,
          message: `Maximum students cannot be less than current registrations (${currentStudents})`,
        });
      }

      classItem.maxStudents = maximum;
    }

    if (meetingUrl !== undefined) {
      classItem.meetingUrl = meetingUrl;
    }

    /* --------------------------------
       Status
    -------------------------------- */

    if (status !== undefined) {
      if (
        !["Scheduled", "Cancelled", "Completed"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid class status",
        });
      }

      classItem.status = status;
    }

    await classItem.save();

    const updatedClass = await Class.findById(
      classItem._id
    )
      .populate(
        "teacher",
        "name email role isActive isVerified"
      )
      .lean();

    const students = await ClassEnrollment.countDocuments({
      class: classId,
      status: {
        $in: ["Registered", "Attended"],
      },
    });

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      class: formatClass(updatedClass, students),
    });
  } catch (error) {
    console.error("Update admin class error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update class",
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