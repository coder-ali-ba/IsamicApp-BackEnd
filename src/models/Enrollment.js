// import mongoose from "mongoose";

// const enrollmentSchema = new mongoose.Schema(
//   {
//     student: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },

//     course: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Course",
//       required: true,
//       index: true,
//     },

//     status: {
//       type: String,
//       enum: ["pending", "active", "cancelled", "expired"],
//       default: "pending",
//       index: true,
//     },

//     paymentStatus: {
//       type: String,
//       enum: [
//         "pending",
//         "paid",
//         "failed",
//         "refunded",
//         "not_required",
//       ],
//       default: "pending",
//       index: true,
//     },

//     amount: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     currency: {
//       type: String,
//       default: "PKR",
//       uppercase: true,
//       trim: true,
//     },

//     paymentMethod: {
//       type: String,
//       enum: [
//         "bank_transfer",
//         "jazzcash",
//         "easypaisa",
//         "free",
//         "admin",
//         "other",
//       ],
//       default: "other",
//     },

//     transactionId: {
//       type: String,
//       default: null,
//       trim: true,
//       maxlength: 150,
//     },

//     paymentProofUrl: {
//       type: String,
//       default: null,
//       trim: true,
//       maxlength: 1000,
//     },

//     paymentReviewedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },

//     paymentReviewedAt: {
//       type: Date,
//       default: null,
//     },

//     rejectionReason: {
//       type: String,
//       default: null,
//       trim: true,
//       maxlength: 500,
//     },

//     enrolledAt: {
//       type: Date,
//       default: null,
//     },

//     expiresAt: {
//       type: Date,
//       default: null,
//     },

//     completedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// // One enrollment record per student per course.
// enrollmentSchema.index(
//   { student: 1, course: 1 },
//   { unique: true }
// );

// const Enrollment =
//   mongoose.models.Enrollment ||
//   mongoose.model("Enrollment", enrollmentSchema);

// export default Enrollment;


import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "not_required"],
      default: "pending",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "PKR",
      uppercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["test", "bank_transfer", "jazzcash", "easypaisa", "free", "admin", "other"],
      default: "test",
    },
    transactionId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 150,
    },
    paymentReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    paymentReviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    enrolledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

enrollmentSchema.index(
  { student: 1, course: 1 },
  { unique: true }
);

const Enrollment =
  mongoose.models.Enrollment ||
  mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
