import Course from "../models/Course.js";

export const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      instructor,
      duration,
      lessons,
      price,
      image,
      featured,
      status,
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !level ||
      !instructor ||
      !duration ||
      !lessons
    ) {
      return res.status(400).json({
        success: false,
        message: "Required course fields are missing",
      });
    }

    const course = await Course.create({
      title,
      description,
      category,
      level,
      instructor,
      duration,
      lessons,
      price,
      image,
      featured,
      status,
    });

    const populatedCourse = await course.populate(
      "instructor",
      "name email role"
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: populatedCourse,
    });
  } catch (error) {
    console.error("Create Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      status: "Published",
    })
      .populate("instructor", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Get Courses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({
      _id: courseId,
      status: "Published",
    }).populate("instructor", "name email role");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Get Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByIdAndUpdate(
      courseId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("instructor", "name email role");

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
    console.error("Update Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

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
    console.error("Delete Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


export const getAllCoursesForAdmin = async (req, res) => {
  try {
    const courses = await Course.find({})
      .populate("instructor", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Admin Get Courses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};