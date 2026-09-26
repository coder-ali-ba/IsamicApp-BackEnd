import bcrypt from "bcryptjs";
import PlatformSettings from "../models/PlatformSettings.js";

/* ================================================================
   HELPERS
================================================================ */

const getUserRole = (user) => {
  return user?.role || user?.userType || "";
};

const formatProfile = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || user.number || "",
    role: getUserRole(user),
    isActive: user.isActive ?? true,
    isVerified: user.isVerified ?? false,
    imageUrl: user.imageUrl || "",
  };
};

/* ================================================================
   GET ADMIN SETTINGS
   GET /api/settings/admin
================================================================ */

export const getAdminSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne({
      key: "platform",
    }).lean();

    if (!settings) {
      settings = await PlatformSettings.create({
        key: "platform",
        platformName: "IlmHub",
        language: "English",
        maintenanceMode: false,
        notifications: true,
        emailAlerts: true,
        updatedBy: req.user?._id || null,
      });

      settings = settings.toObject();
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: formatProfile(req.user),

        platform: {
          platformName:
            settings.platformName || "IlmHub",

          language:
            settings.language || "English",

          maintenanceMode:
            Boolean(settings.maintenanceMode),
        },

        notifications: {
          notifications:
            settings.notifications !== false,

          emailAlerts:
            settings.emailAlerts !== false,
        },
      },
    });
  } catch (error) {
    console.error(
      "GET ADMIN SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load admin settings",
    });
  }
};

/* ================================================================
   UPDATE ADMIN PROFILE
   PUT /api/settings/admin/profile
================================================================ */

export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Full name must be at least 2 characters",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    /*
     * req.user is the authenticated mongoose document.
     * Using its constructor means we don't have to hard-code
     * a second User model import here.
     */
    const UserModel = req.user.constructor;

    const existingUser =
      await UserModel.findOne({
        email: normalizedEmail,
        _id: {
          $ne: req.user._id,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "This email address is already in use",
      });
    }

    req.user.name = name.trim();
    req.user.email = normalizedEmail;

    /*
     * Your older user structure uses `number`,
     * while the Settings UI calls it phone.
     *
     * Keep the existing database field if available.
     */
    if ("number" in req.user) {
      req.user.number = phone?.trim() || "";
    } else {
      req.user.phone = phone?.trim() || "";
    }

    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: formatProfile(req.user),
    });
  } catch (error) {
    console.error(
      "UPDATE ADMIN PROFILE ERROR:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This email address is already in use",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update admin profile",
    });
  }
};

/* ================================================================
   UPDATE PLATFORM SETTINGS
   PUT /api/settings/admin/platform
================================================================ */

export const updatePlatformSettings = async (
  req,
  res
) => {
  try {
    const {
      platformName,
      language,
      maintenanceMode,
    } = req.body;

    const allowedLanguages = [
      "English",
      "Urdu",
      "Arabic",
    ];

    if (
      platformName !== undefined &&
      !String(platformName).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Platform name cannot be empty",
      });
    }

    if (
      language !== undefined &&
      !allowedLanguages.includes(language)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid platform language",
      });
    }

    if (
      maintenanceMode !== undefined &&
      typeof maintenanceMode !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Maintenance mode must be true or false",
      });
    }

    const settings =
      await PlatformSettings.findOneAndUpdate(
        {
          key: "platform",
        },
        {
          $set: {
            ...(platformName !== undefined && {
              platformName:
                String(platformName).trim(),
            }),

            ...(language !== undefined && {
              language,
            }),

            ...(maintenanceMode !== undefined && {
              maintenanceMode,
            }),

            updatedBy: req.user._id,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Platform settings updated successfully",
      platform: {
        platformName: settings.platformName,
        language: settings.language,
        maintenanceMode:
          settings.maintenanceMode,
      },
    });
  } catch (error) {
    console.error(
      "UPDATE PLATFORM SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update platform settings",
    });
  }
};

/* ================================================================
   UPDATE NOTIFICATIONS
   PUT /api/settings/admin/notifications
================================================================ */

export const updateNotificationSettings = async (
  req,
  res
) => {
  try {
    const {
      notifications,
      emailAlerts,
    } = req.body;

    if (
      notifications !== undefined &&
      typeof notifications !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notifications must be true or false",
      });
    }

    if (
      emailAlerts !== undefined &&
      typeof emailAlerts !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email alerts must be true or false",
      });
    }

    const settings =
      await PlatformSettings.findOneAndUpdate(
        {
          key: "platform",
        },
        {
          $set: {
            ...(notifications !== undefined && {
              notifications,
            }),

            ...(emailAlerts !== undefined && {
              emailAlerts,
            }),

            updatedBy: req.user._id,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Notification settings updated successfully",

      notifications: {
        notifications:
          settings.notifications !== false,

        emailAlerts:
          settings.emailAlerts !== false,
      },
    });
  } catch (error) {
    console.error(
      "UPDATE NOTIFICATION SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update notification settings",
    });
  }
};

/* ================================================================
   CHANGE ADMIN PASSWORD
   PUT /api/settings/admin/password
================================================================ */

export const changeAdminPassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is required",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password is required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from current password",
      });
    }

    /*
     * req.user may have password excluded by the auth
     * middleware, so fetch the authenticated user again.
     */
    const UserModel = req.user.constructor;

    const user =
      await UserModel.findById(req.user._id)
        .select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account does not have a password configured",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect",
      });
    }

    const hashedPassword =
      await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully",
    });
  } catch (error) {
    console.error(
      "CHANGE ADMIN PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to change password",
    });
  }
};

