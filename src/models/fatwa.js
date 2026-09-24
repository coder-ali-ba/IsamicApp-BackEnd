import mongoose from "mongoose";

const fatwaSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000,
    },

    answer: {
      type: String,
      trim: true,
      default: "",
      maxlength: 10000,
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
        "Other",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Answered", "Rejected", "Closed"],
      default: "Pending",
    },

    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    scholar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    published: {
      type: Boolean,
      default: false,
    },
    shortAnswer: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    primaryReference: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    additionalReferences: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  },
);

fatwaSchema.index({
  status: 1,
  category: 1,
});

fatwaSchema.index({
  createdAt: -1,
});

const Fatwa = mongoose.models.Fatwa || mongoose.model("Fatwa", fatwaSchema);

export default Fatwa;
