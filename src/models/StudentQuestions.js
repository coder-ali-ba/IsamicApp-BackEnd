import mongoose from "mongoose";

const studentQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 5000,
    },

    category: {
      type: String,
      enum: [
        "Aqeedah",
        "Fiqh",
        "Worship",
        "Family",
        "Finance",
        "Business",
        "Marriage",
        "Divorce",
        "Halal & Haram",
        "Quran",
        "Hadith",
        "General",
        "Other",
      ],
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    answer: {
      type: String,
      trim: true,
      default: "",
      maxlength: 10000,
    },

    status: {
      type: String,
      enum: ["Pending", "Answered", "Closed"],
      default: "Pending",
    },

    answeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

studentQuestionSchema.index({
  student: 1,
  createdAt: -1,
});

studentQuestionSchema.index({
  teacher: 1,
  status: 1,
  createdAt: -1,
});

const StudentQuestion =
  mongoose.models.StudentQuestion ||
  mongoose.model("StudentQuestion", studentQuestionSchema);

export default StudentQuestion;