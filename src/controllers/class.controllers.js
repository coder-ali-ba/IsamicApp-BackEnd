import mongoose from "mongoose";

import Class from "../models/class.js";
import ClassEnrollment from "../models/classEnrollment.js";

/* --------------------------------
   Helper
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

    const countMap = new Map(
      enrollmentCounts.map((item) => [
        item._id.toString(),
        item.count,
      ])
    );

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
   Create Class
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
        message: "Class must be scheduled for a future date",
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
   Update Class
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
        message: "Class not found or you do not have access",
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
          message: "Class must be scheduled for a future date",
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
      const currentStudents = await ClassEnrollment.countDocuments({
        class: classId,
        status: { $in: ["Registered", "Attended"] },
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
      if (!["Scheduled", "Cancelled", "Completed"].includes(status)) {
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
   Delete Class
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