import mongoose from "mongoose";

const classEnrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    status: {
      type: String,
      enum: ["Registered", "Attended", "Cancelled"],
      default: "Registered",
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

classEnrollmentSchema.index(
  { student: 1, class: 1 },
  { unique: true }
);

const ClassEnrollment = mongoose.model(
  "ClassEnrollment",
  classEnrollmentSchema
);

export default ClassEnrollment;