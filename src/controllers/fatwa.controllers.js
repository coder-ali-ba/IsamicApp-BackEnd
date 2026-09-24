import Fatwa from "../models/fatwa.js";
import User from "../models/Users.js";

const createFatwaSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
};

/* =====================================================
   GET ALL FATWAS - ADMIN
===================================================== */

export const getAllFatwasForAdmin = async (req, res) => {
  try {
    const { status, category, search } = req.query;

    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      filter.question = {
        $regex: search,
        $options: "i",
      };
    }

    const fatwas = await Fatwa.find(filter)
      .populate("askedBy", "name email")
      .populate("scholar", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: fatwas.length,
      fatwas,
    });
  } catch (error) {
    console.error("Get All Fatwas Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load fatwas",
    });
  }
};

/* =====================================================
   GET SINGLE FATWA - ADMIN
===================================================== */

export const getFatwaByIdForAdmin = async (req, res) => {
  try {
    const { fatwaId } = req.params;

    const fatwa = await Fatwa.findById(fatwaId)
      .populate("askedBy", "name email")
      .populate("scholar", "name email role");

    if (!fatwa) {
      return res.status(404).json({
        success: false,
        message: "Fatwa not found",
      });
    }

    return res.status(200).json({
      success: true,
      fatwa,
    });
  } catch (error) {
    console.error("Get Fatwa Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load fatwa",
    });
  }
};

/* =====================================================
   CREATE FATWA - ADMIN
===================================================== */

export const createFatwa = async (req, res) => {
  try {
    const {
      question,
      shortAnswer,
      answer,
      category,
      status,
      scholar,
      published,
      primaryReference,
      additionalReferences,
    } = req.body;

    if (!question || !category) {
      return res.status(400).json({
        success: false,
        message: "Question and category are required",
      });
    }

    if (
      scholar &&
      !(await User.exists({
        _id: scholar,
        role: { $in: ["scholar", "teacher"] },
      }))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid scholar",
      });
    }

    let finalStatus = status || "Pending";

    if (answer?.trim() && !status) {
      finalStatus = "Answered";
    }

    const fatwa = await Fatwa.create({
      question: question.trim(),
      shortAnswer: shortAnswer?.trim() || "",
      answer: answer?.trim() || "",
      category,
      status: finalStatus,
      scholar: scholar || null,
      published: typeof published === "boolean" ? published : false,
      primaryReference: primaryReference?.trim() || "",
      additionalReferences: additionalReferences?.trim() || "",
    });

    const baseSlug = createFatwaSlug(question);

    fatwa.slug = `${baseSlug || "fatwa"}-${fatwa._id.toString().slice(-8)}`;

    await fatwa.save();

    const populatedFatwa = await Fatwa.findById(fatwa._id).populate(
      "scholar",
      "name email role",
    );

    return res.status(201).json({
      success: true,
      message: "Fatwa created successfully",
      fatwa: populatedFatwa,
    });
  } catch (error) {
    console.error("Create Fatwa Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create fatwa",
    });
  }
};

/* =====================================================
   UPDATE FATWA - ADMIN
===================================================== */

export const updateFatwa = async (req, res) => {
  try {
    const { fatwaId } = req.params;

    const {
      question,
      shortAnswer,
      answer,
      category,
      status,
      scholar,
      published,
      primaryReference,
      additionalReferences,
    } = req.body;

    const fatwa = await Fatwa.findById(fatwaId);

    if (!fatwa) {
      return res.status(404).json({
        success: false,
        message: "Fatwa not found",
      });
    }

    /* =========================
       QUESTION
    ========================= */

    if (question !== undefined) {
      if (!question.trim()) {
        return res.status(400).json({
          success: false,
          message: "Question cannot be empty",
        });
      }

      fatwa.question = question.trim();
    }

    /* =========================
       SHORT ANSWER
    ========================= */

    if (shortAnswer !== undefined) {
      fatwa.shortAnswer = shortAnswer.trim();
    }

    /* =========================
       DETAILED ANSWER
    ========================= */

    if (answer !== undefined) {
      fatwa.answer = answer.trim();
    }

    /* =========================
       CATEGORY
    ========================= */

    if (category !== undefined) {
      fatwa.category = category;
    }

    /* =========================
       STATUS
    ========================= */

    if (status !== undefined) {
      const allowedStatuses = ["Pending", "Answered", "Rejected", "Closed"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fatwa status",
        });
      }

      fatwa.status = status;
    }

    /* =========================
       SCHOLAR
    ========================= */

    if (scholar !== undefined) {
      if (scholar === null || scholar === "") {
        fatwa.scholar = null;
      } else {
        const scholarExists = await User.exists({
          _id: scholar,
          role: {
            $in: ["scholar", "teacher"],
          },
          isActive: true,
        });

        if (!scholarExists) {
          return res.status(400).json({
            success: false,
            message: "Invalid or inactive scholar/teacher",
          });
        }

        fatwa.scholar = scholar;
      }
    }

    /* =========================
       REFERENCES
    ========================= */

    if (primaryReference !== undefined) {
      fatwa.primaryReference = primaryReference.trim();
    }

    if (additionalReferences !== undefined) {
      fatwa.additionalReferences = additionalReferences.trim();
    }

    /* =========================
       PUBLISHED
    ========================= */

    if (published !== undefined) {
      if (published === true && fatwa.status !== "Answered") {
        return res.status(400).json({
          success: false,
          message: "Only answered fatwas can be published",
        });
      }

      fatwa.published = published;
    }

    /* =========================
       SAVE
    ========================= */

    await fatwa.save();

    const updatedFatwa = await Fatwa.findById(fatwa._id)
      .populate("askedBy", "name email")
      .populate("scholar", "name email role");

    return res.status(200).json({
      success: true,
      message: "Fatwa updated successfully",
      fatwa: updatedFatwa,
    });
  } catch (error) {
    console.error("Update Fatwa Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update fatwa",
    });
  }
};

/* =====================================================
   UPDATE FATWA STATUS
===================================================== */

export const updateFatwaStatus = async (req, res) => {
  try {
    const { fatwaId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Pending", "Answered", "Rejected", "Closed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fatwa status",
      });
    }

    const fatwa = await Fatwa.findById(fatwaId);

    if (!fatwa) {
      return res.status(404).json({
        success: false,
        message: "Fatwa not found",
      });
    }

    fatwa.status = status;

    await fatwa.save();

    return res.status(200).json({
      success: true,
      message: "Fatwa status updated successfully",
      fatwa,
    });
  } catch (error) {
    console.error("Update Fatwa Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update fatwa status",
    });
  }
};

/* =====================================================
   DELETE FATWA
===================================================== */

export const deleteFatwa = async (req, res) => {
  try {
    const { fatwaId } = req.params;

    const fatwa = await Fatwa.findById(fatwaId);

    if (!fatwa) {
      return res.status(404).json({
        success: false,
        message: "Fatwa not found",
      });
    }

    await Fatwa.findByIdAndDelete(fatwaId);

    return res.status(200).json({
      success: true,
      message: "Fatwa deleted successfully",
    });
  } catch (error) {
    console.error("Delete Fatwa Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete fatwa",
    });
  }
};

/* =====================================================
   GET SCHOLARS - ADMIN
===================================================== */

/* GET SCHOLARS / TEACHERS - ADMIN */
export const getScholarsForFatwa = async (req, res) => {
  try {
    const scholars = await User.find({
      role: {
        $in: ["scholar", "teacher"],
      },
      isActive: true,
    })
      .select("name email role")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: scholars.length,
      scholars,
    });
  } catch (error) {
    console.error("Get Scholars For Fatwa Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load scholars",
    });
  }
};

/* GET PUBLISHED FATWAS - PUBLIC */
export const getPublishedFatwas = async (req, res) => {
  try {
    const { category, search } = req.query;

    const filter = {
      published: true,
      status: "Answered",
    };

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        {
          question: {
            $regex: search,
            $options: "i",
          },
        },
        {
          shortAnswer: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const fatwas = await Fatwa.find(filter)
      .select(
        "question shortAnswer category scholar primaryReference slug createdAt",
      )
      .populate("scholar", "name role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: fatwas.length,
      fatwas,
    });
  } catch (error) {
    console.error("Get Published Fatwas Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load fatwas",
    });
  }
};

/* GET SINGLE PUBLISHED FATWA - PUBLIC */
export const getPublishedFatwaBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const fatwa = await Fatwa.findOne({
      slug,
      published: true,
      status: "Answered",
    })
      .select(
        "question shortAnswer answer category scholar primaryReference additionalReferences createdAt slug",
      )
      .populate("scholar", "name role");

    if (!fatwa) {
      return res.status(404).json({
        success: false,
        message: "Fatwa not found",
      });
    }

    return res.status(200).json({
      success: true,
      fatwa,
    });
  } catch (error) {
    console.error("Get Published Fatwa Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load fatwa",
    });
  }
};
