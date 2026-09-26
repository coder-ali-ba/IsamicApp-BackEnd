import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "platform",
      unique: true,
      index: true,
    },

    platformName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "IlmHub",
    },

    language: {
      type: String,
      enum: ["English", "Urdu", "Arabic"],
      default: "English",
    },

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    notifications: {
      type: Boolean,
      default: true,
    },

    emailAlerts: {
      type: Boolean,
      default: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformSettings =
  mongoose.models.PlatformSettings ||
  mongoose.model(
    "PlatformSettings",
    platformSettingsSchema
  );

export default PlatformSettings;

