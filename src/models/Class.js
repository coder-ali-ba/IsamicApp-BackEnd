import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
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
      trim: true,
      maxlength: 2000,
      default: "",
    },
    /* --------------------------------
       Learning Content
    -------------------------------- */

    learningOutcomes: {
      type: [String],
      default: [],
    },

    topics: {
      type: [String],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    category: {
      type: String,
      enum: [
        "Quran",
        "Tajweed",
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

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 240,
    },

    maxStudents: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
    },

    meetingUrl: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Scheduled", "Cancelled", "Completed"],
      default: "Scheduled",
      index: true,
    },

    
  },
  {
    timestamps: true,
  }
);

const Class =
  mongoose.models.Class ||
  mongoose.model("Class", classSchema);

export default Class;