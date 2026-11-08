
import mongoose from "mongoose";
import Course from "../models/Course.js";

const INSTRUCTOR_FIELDS = "name email role";

const isValidId = (id) => mongoose.isValidObjectId(id);

const sendError = (res, error, label) => {
  console.error(`${label}:`, error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID or field value",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
};

// Only fields that can be changed through the course API.
const EDITABLE_FIELDS = [
  "title",
  "description",
  "category",
  "level",
  "instructor",
  "duration",
  "price",
  "image",
  "featured",
  "status",
  "modules",
  "learningOutcomes",
  "requirements",
  "language",
];

const pickCourseFields = (body) => {
  const data = {};

  for (const field of EDITABLE_FIELDS) {
    if (Object.hasOwn(body, field)) {
      data[field] = body[field];
    }
  }

  if (Object.hasOwn(data, "instructor")) {
    if (!isValidId(data.instructor)) {
      const error = new Error("Invalid instructor ID");
      error.name = "ValidationError";
      throw error;
    }
  }

  return data;
};

const countLessons = (modules = []) =>
  modules.reduce(
    (total, module) => total + (module.lessons?.length || 0),
    0
  );

// Public API must never expose private lesson video/PDF URLs.
const toPublicCourse = (course) => {
  const data = course.toObject
    ? course.toObject()
    : { ...course };

  data.modules = (data.modules || []).map((module) => ({
    _id: module._id,
    title: module.title,
    description: module.description,
    order: module.order,
    lessons: (module.lessons || []).map((lesson) => ({
      _id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      durationMinutes: lesson.durationMinutes,
      order: lesson.order,
      isPreview: lesson.isPreview,
    })),
  }));

  return data;
};

const populateInstructor = (query) =>
  query.populate("instructor", INSTRUCTOR_FIELDS);

// CREATE COURSE
export const createCourse = async (req, res) => {
  try {
    const data = pickCourseFields(req.body);

    const requiredFields = [
      "title",
      "description",
      "category",
      "level",
      "instructor",
      "duration",
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
    );

    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: "Required course fields are missing",
        missingFields,
      });
    }

    // The legacy frontend can still send a numeric lesson count.
    const legacyLessons = req.body.lessons;

    if (
      legacyLessons !== undefined &&
      (!Number.isInteger(Number(legacyLessons)) ||
        Number(legacyLessons) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Lessons must be a non-negative integer",
      });
    }

    if (data.modules !== undefined) {
      if (!Array.isArray(data.modules)) {
        return res.status(400).json({
          success: false,
          message: "Modules must be an array",
        });
      }

      data.lessons = countLessons(data.modules);
    } else {
      data.lessons = Number(legacyLessons ?? 0);
    }

    // Never trust a client-supplied student count.
    delete data.students;

    const course = await Course.create(data);

    const populatedCourse = await populateInstructor(
      Course.findById(course._id)
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: populatedCourse,
    });
  } catch (error) {
    return sendError(res, error, "Create Course Error");
  }
};

// GET ALL PUBLISHED COURSES - PUBLIC
export const getCourses = async (req, res) => {
  try {
    const courses = await populateInstructor(
      Course.find({ status: "Published" }).sort({
        createdAt: -1,
      })
    );

    const publicCourses = courses.map(toPublicCourse);

    return res.status(200).json({
      success: true,
      count: publicCourses.length,
      courses: publicCourses,
    });
  } catch (error) {
    return sendError(res, error, "Get Courses Error");
  }
};

// GET SINGLE PUBLISHED COURSE - PUBLIC
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await populateInstructor(
      Course.findOne({
        _id: courseId,
        status: "Published",
      })
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      course: toPublicCourse(course),
    });
  } catch (error) {
    return sendError(res, error, "Get Course Error");
  }
};

// UPDATE COURSE - ADMIN
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const data = pickCourseFields(req.body);

    if (data.modules !== undefined) {
      if (!Array.isArray(data.modules)) {
        return res.status(400).json({
          success: false,
          message: "Modules must be an array",
        });
      }

      data.lessons = countLessons(data.modules);
    }

    // Legacy frontend compatibility.
    if (
      req.body.lessons !== undefined &&
      data.modules === undefined
    ) {
      const lessons = Number(req.body.lessons);

      if (!Number.isInteger(lessons) || lessons < 0) {
        return res.status(400).json({
          success: false,
          message: "Lessons must be a non-negative integer",
        });
      }

      data.lessons = lessons;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid course fields provided",
      });
    }

    const course = await populateInstructor(
      Course.findByIdAndUpdate(courseId, data, {
        new: true,
        runValidators: true,
      })
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    return sendError(res, error, "Update Course Error");
  }
};

// DELETE COURSE - ADMIN
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await Course.findByIdAndDelete(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    return sendError(res, error, "Delete Course Error");
  }
};

// GET ALL COURSES - ADMIN
export const getAllCoursesForAdmin = async (req, res) => {
  try {
    const courses = await populateInstructor(
      Course.find({}).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    return sendError(res, error, "Admin Get Courses Error");
  }
};

// GET COURSES BELONGING TO LOGGED-IN TEACHER
export const getMyTeacherCourses = async (req, res) => {
  try {
    const courses = await populateInstructor(
      Course.find({ instructor: req.user._id }).sort({
        createdAt: -1,
      })
    );

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    return sendError(res, error, "Get Teacher Courses Error");
  }
};

// GET SINGLE COURSE BELONGING TO LOGGED-IN TEACHER
export const getTeacherCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await populateInstructor(
      Course.findOne({
        _id: courseId,
        instructor: req.user._id,
      })
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found or you do not have access to this course",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    return sendError(res, error, "Get Teacher Course Error");
  }
};
