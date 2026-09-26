import User from "../models/Users.js";

/* =========================================================
   GET TEACHER / SCHOLAR PROFILE
========================================================= */

export const getTeacherProfile = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId)
      .select("_id name email role isActive isVerified createdAt updatedAt")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!["teacher", "scholar"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Teacher Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load profile",
    });
  }
};


/* =========================================================
   UPDATE TEACHER / SCHOLAR PROFILE
========================================================= */

export const updateTeacherProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { name } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters",
      });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name cannot exceed 100 characters",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!["teacher", "scholar"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    user.name = trimmedName;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select("_id name email role isActive isVerified createdAt updatedAt")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Teacher Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};