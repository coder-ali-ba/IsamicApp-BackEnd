
import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PDF", "Document", "Link", "Other"],
      default: "PDF",
    },
  },
  { _id: true }
);

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    videoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    resources: {
      type: [resourceSchema],
      default: [],
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true, timestamps: true }
);

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    lessons: {
      type: [lessonSchema],
      default: [],
    },
  },
  { _id: true, timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: [
        "Quran",
        "Hadith",
        "Arabic",
        "Fiqh",
        "Seerah",
        "Islamic Studies",
      ],
      required: true,
    },

    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      required: true,
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    duration: {
      type: String,
      required: true,
    },

    // Legacy field retained for existing frontend compatibility.
    lessons: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    modules: {
      type: [moduleSchema],
      default: [],
    },

    learningOutcomes: {
      type: [String],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    language: {
      type: String,
      default: "Urdu",
      trim: true,
    },

    students: {
      type: Number,
      default: 0,
      min: 0,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    image: {
      type: String,
      default: "",
    },

    featured: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);

export default Course;
