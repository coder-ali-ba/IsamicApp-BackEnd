import StudentQuestion from "../models/StudentQuestions.js";
import User from "../models/Users.js";

/* =========================================================
   GET AVAILABLE TEACHERS / SCHOLARS
   Student uses this list when asking a question
========================================================= */
export const getQuestionTeachers = async (req, res) => {
  try {
    const teachers = await User.find({
      role: { $in: ["teacher", "scholar"] },
      isActive: true,
    })
      .select("_id name role")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Get Question Teachers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load teachers.",
    });
  }
};


/* =========================================================
   STUDENT — ASK QUESTION
========================================================= */
export const createStudentQuestion = async (req, res) => {
  try {
    const {
      question,
      category,
      teacher,
    } = req.body;

    /* ---------- Validation ---------- */

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    if (question.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Question must contain at least 5 characters.",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Please select a category.",
      });
    }

    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: "Please select a teacher or scholar.",
      });
    }

    /* ---------- Make sure selected person exists ---------- */

    const selectedTeacher = await User.findOne({
      _id: teacher,
      role: { $in: ["teacher", "scholar"] },
      isActive: true,
    });

    if (!selectedTeacher) {
      return res.status(404).json({
        success: false,
        message: "Selected teacher or scholar was not found.",
      });
    }

    /* ---------- Create question ---------- */

    const studentQuestion = await StudentQuestion.create({
      question: question.trim(),
      category,
      student: req.user._id,
      teacher: selectedTeacher._id,
      status: "Pending",
    });

    /* ---------- Return populated question ---------- */

    const populatedQuestion =
      await StudentQuestion.findById(studentQuestion._id)
        .populate("student", "name email")
        .populate("teacher", "name role");

    return res.status(201).json({
      success: true,
      message: "Your question has been sent successfully.",
      question: populatedQuestion,
    });
  } catch (error) {
    console.error("Create Student Question Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit your question.",
    });
  }
};


/* =========================================================
   STUDENT — GET MY QUESTIONS
========================================================= */
export const getMyQuestions = async (req, res) => {
  try {
    const questions = await StudentQuestion.find({
      student: req.user._id,
    })
      .populate("teacher", "name role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Get My Questions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load your questions.",
    });
  }
};


/* =========================================================
   STUDENT — GET SINGLE QUESTION
========================================================= */
export const getMyQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await StudentQuestion.findOne({
      _id: questionId,
      student: req.user._id,
    })
      .populate("teacher", "name role")
      .populate("student", "name email");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    return res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("Get My Question Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the question.",
    });
  }
};


/* =========================================================
   TEACHER / SCHOLAR — GET RECEIVED QUESTIONS
========================================================= */
export const getTeacherQuestions = async (req, res) => {
  try {
    const questions = await StudentQuestion.find({
      teacher: req.user._id,
    })
      .populate("student", "name email")
      .populate("teacher", "name role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Get Teacher Questions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load received questions.",
    });
  }
};


/* =========================================================
   TEACHER / SCHOLAR — GET SINGLE QUESTION
========================================================= */
export const getTeacherQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await StudentQuestion.findOne({
      _id: questionId,
      teacher: req.user._id,
    })
      .populate("student", "name email")
      .populate("teacher", "name role");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    return res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("Get Teacher Question Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the question.",
    });
  }
};


/* =========================================================
   TEACHER / SCHOLAR — ANSWER QUESTION
========================================================= */
export const answerStudentQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Answer is required.",
      });
    }

    if (answer.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Answer must contain at least 5 characters.",
      });
    }

    const question = await StudentQuestion.findOne({
      _id: questionId,
      teacher: req.user._id,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    question.answer = answer.trim();
    question.status = "Answered";
    question.answeredAt = new Date();

    await question.save();

    const updatedQuestion =
      await StudentQuestion.findById(question._id)
        .populate("student", "name email")
        .populate("teacher", "name role");

    return res.status(200).json({
      success: true,
      message: "Answer submitted successfully.",
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Answer Student Question Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit answer.",
    });
  }
};


/* =========================================================
   TEACHER / SCHOLAR — CLOSE QUESTION
========================================================= */
export const closeStudentQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await StudentQuestion.findOne({
      _id: questionId,
      teacher: req.user._id,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    question.status = "Closed";

    await question.save();

    return res.status(200).json({
      success: true,
      message: "Question closed successfully.",
      question,
    });
  } catch (error) {
    console.error("Close Student Question Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to close question.",
    });
  }
};