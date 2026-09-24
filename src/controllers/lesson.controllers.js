import Lesson from "../models/lesson.js";
import Course from "../models/Course.js";

/* =========================
   CREATE LESSON
========================= */

export const createLesson = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      content,
      videoUrl,
      duration,
      order,
      status,
    } = req.body;

    if (!title || !course || !order) {
      return res.status(400).json({
        message: "Title, course and order are required.",
      });
    }

    const existingCourse = await Course.findById(course);

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const lesson = await Lesson.create({
      title,
      description,
      course,
      content,
      videoUrl,
      duration,
      order,
      status,
    });

    // Keep Course.lessons count updated
    await Course.findByIdAndUpdate(course, {
      $inc: { lessons: 1 },
    });

    return res.status(201).json({
      message: "Lesson created successfully.",
      lesson,
    });
  } catch (error) {
    console.error("Create Lesson Error:", error);

    return res.status(500).json({
      message: "Failed to create lesson.",
    });
  }
};


/* =========================
   GET COURSE LESSONS
========================= */

export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const lessons = await Lesson.find({
      course: courseId,
      status: "Published",
    })
      .sort({ order: 1 })
      .select("-content");

    return res.status(200).json({
      lessons,
    });
  } catch (error) {
    console.error("Get Course Lessons Error:", error);

    return res.status(500).json({
      message: "Failed to fetch lessons.",
    });
  }
};


/* =========================
   GET ALL LESSONS FOR ADMIN
========================= */

export const getAllLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const lessons = await Lesson.find({
      course: courseId,
    }).sort({ order: 1 });

    return res.status(200).json({
      lessons,
    });
  } catch (error) {
    console.error("Get Admin Lessons Error:", error);

    return res.status(500).json({
      message: "Failed to fetch lessons.",
    });
  }
};


/* =========================
   GET SINGLE LESSON
========================= */

export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId)
      .populate("course", "title category level");

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    return res.status(200).json({
      lesson,
    });
  } catch (error) {
    console.error("Get Lesson Error:", error);

    return res.status(500).json({
      message: "Failed to fetch lesson.",
    });
  }
};


/* =========================
   UPDATE LESSON
========================= */

export const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const {
      title,
      description,
      content,
      videoUrl,
      duration,
      order,
      status,
    } = req.body;

    lesson.title = title ?? lesson.title;
    lesson.description = description ?? lesson.description;
    lesson.content = content ?? lesson.content;
    lesson.videoUrl = videoUrl ?? lesson.videoUrl;
    lesson.duration = duration ?? lesson.duration;
    lesson.order = order ?? lesson.order;
    lesson.status = status ?? lesson.status;

    await lesson.save();

    return res.status(200).json({
      message: "Lesson updated successfully.",
      lesson,
    });
  } catch (error) {
    console.error("Update Lesson Error:", error);

    return res.status(500).json({
      message: "Failed to update lesson.",
    });
  }
};


/* =========================
   DELETE LESSON
========================= */

export const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const courseId = lesson.course;

    await Lesson.findByIdAndDelete(lessonId);

    // Decrease course lesson count
    await Course.findByIdAndUpdate(courseId, {
      $inc: { lessons: -1 },
    });

    return res.status(200).json({
      message: "Lesson deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Lesson Error:", error);

    return res.status(500).json({
      message: "Failed to delete lesson.",
    });
  }
};


// TEACHER LESSON CONTROLLERS

export const getTeacherLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this course",
      });
    }

    const lessons = await Lesson.find({
      course: courseId,
    }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      lessons,
    });
  } catch (error) {
    console.error("Get teacher lessons error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch lessons",
    });
  }
};

// CREATE LESSON

export const createTeacherLesson = async (req, res) => {
  try {
    const { courseId } = req.params;

    const {
      title,
      description,
      content,
      videoUrl,
      duration,
      order,
      status,
    } = req.body;

    if (!title || !order) {
      return res.status(400).json({
        success: false,
        message: "Title and order are required",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this course",
      });
    }

    const existingLesson = await Lesson.findOne({
      course: courseId,
      order,
    });

    if (existingLesson) {
      return res.status(400).json({
        success: false,
        message: `Lesson order ${order} already exists`,
      });
    }

    const lesson = await Lesson.create({
      title,
      description,
      content,
      videoUrl,
      duration,
      order,
      status: status || "Draft",
      course: courseId,
    });

    await Course.findByIdAndUpdate(courseId, {
      $inc: { lessons: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      lesson,
    });
  } catch (error) {
    console.error("Create teacher lesson error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create lesson",
    });
  }
};

// UPDATE

export const updateTeacherLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const course = await Course.findOne({
      _id: lesson.course,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this lesson",
      });
    }

    const {
      title,
      description,
      content,
      videoUrl,
      duration,
      order,
      status,
    } = req.body;

    if (order && order !== lesson.order) {
      const existingLesson = await Lesson.findOne({
        course: lesson.course,
        order,
        _id: { $ne: lessonId },
      });

      if (existingLesson) {
        return res.status(400).json({
          success: false,
          message: `Lesson order ${order} already exists`,
        });
      }
    }

    lesson.title = title ?? lesson.title;
    lesson.description = description ?? lesson.description;
    lesson.content = content ?? lesson.content;
    lesson.videoUrl = videoUrl ?? lesson.videoUrl;
    lesson.duration = duration ?? lesson.duration;
    lesson.order = order ?? lesson.order;
    lesson.status = status ?? lesson.status;

    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      lesson,
    });
  } catch (error) {
    console.error("Update teacher lesson error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update lesson",
    });
  }
};

//Delete
export const deleteTeacherLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const course = await Course.findOne({
      _id: lesson.course,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this lesson",
      });
    }

    await Lesson.findByIdAndDelete(lessonId);

    await Course.findByIdAndUpdate(course._id, {
      $inc: { lessons: -1 },
    });

    res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (error) {
    console.error("Delete teacher lesson error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete lesson",
    });
  }
};

export const getTeacherLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId).populate(
      "course",
      "title category level instructor"
    );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (
      lesson.course.instructor.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this lesson",
      });
    }

    res.status(200).json({
      success: true,
      lesson,
    });
  } catch (error) {
    console.error("Get teacher lesson error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch lesson",
    });
  }
};