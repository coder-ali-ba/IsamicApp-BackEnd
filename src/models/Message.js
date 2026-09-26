import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // User who sent the message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // User who receives the message
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 5000,
    },

    // Admin's read status for incoming messages
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },

    // Recipient's read status for admin-sent messages
    recipientStatus: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ status: 1 });
messageSchema.index({ recipientStatus: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ email: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ recipient: 1 });

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;