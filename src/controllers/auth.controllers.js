import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User  from "../models/Users.js"
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Class from "../models/Class.js";

const generateToken = (userId) => {
  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id.toString());

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};



export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        isVerified: req.user.isVerified,
      },
    });
  } catch (error) {
    console.error("Get Me Error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};



export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};



export const getTeachersForAdmin = async (req, res) => {
  try {
    const teachers = await User.find({
      role: { $in: ["teacher", "scholar"] },
      isActive: true,
    })
      .select("name email role isActive")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Get Teachers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


export const getAllUsersForAdmin = async (req, res) => {
  try {
    const { search = "", role = "", status = "" } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (status === "active") {
      query.isActive = true;
    }

    if (status === "inactive") {
      query.isActive = false;
    }

    if (search.trim()) {
      query.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          email: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    const [
      totalUsers,
      students,
      teachers,
      scholars,
      admins,
      activeUsers,
      inactiveUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "scholar" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
    ]);

    return res.status(200).json({
      success: true,
      users,
      stats: {
        totalUsers,
        students,
        teachers,
        scholars,
        admins,
        activeUsers,
        inactiveUsers,
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const updateUserRoleByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "student",
      "teacher",
      "scholar",
      "admin",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Admin apna khud ka role change nahi kar sakta
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = role;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Update User Role Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const updateUserStatusByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    // Admin apna account deactivate nahi kar sakta
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own account status",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = isActive;

    await user.save();

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User activated successfully"
        : "User deactivated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Update User Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalStudents,
      totalTeachers,
      totalScholars,
      totalCourses,
      publishedCourses,
      totalClasses,
      allScheduledClasses,
      recentEnrollments,
      upcomingClasses,
    ] = await Promise.all([
      User.countDocuments({
        role: "student",
      }),

      User.countDocuments({
        role: "teacher",
        isActive: true,
      }),

      User.countDocuments({
        role: "scholar",
        isActive: true,
      }),

      Course.countDocuments(),

      Course.countDocuments({
        status: "Published",
      }),

      Class.countDocuments(),

      Class.find({
        status: "scheduled",
      }).select(
        "scheduledAt durationMinutes"
      ),

      Enrollment.find()
        .populate(
          "student",
          "name email"
        )
        .populate(
          "course",
          "title"
        )
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .lean(),

      Class.find({
        status: "scheduled",
        scheduledAt: {
          $gt: now,
        },
      })
        .populate(
          "teacher",
          "name email role"
        )
        .sort({
          scheduledAt: 1,
        })
        .limit(5)
        .lean(),
    ]);

    // Calculate currently live classes
    const liveClasses = allScheduledClasses.filter(
      (classItem) => {
        const startTime = new Date(
          classItem.scheduledAt
        ).getTime();

        const endTime =
          startTime +
          classItem.durationMinutes *
            60 *
            1000;

        const currentTime = now.getTime();

        return (
          currentTime >= startTime &&
          currentTime <= endTime
        );
      }
    ).length;

    return res.status(200).json({
      success: true,

      stats: {
        totalStudents,

        totalTeachers,

        totalScholars,

        totalTeachersAndScholars:
          totalTeachers +
          totalScholars,

        totalCourses,

        publishedCourses,

        totalClasses,

        liveClasses,
      },

      recentEnrollments,

      upcomingClasses,
    });
  } catch (error) {
    console.error(
      "Admin Dashboard Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load admin dashboard",
    });
  }
};

export const getTeacherByIdForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const teacher = await User.findOne({
      _id: userId,
      role: { $in: ["teacher", "scholar"] },
    }).select(
      "name email role  createdAt"
    );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher or scholar not found",
      });
    }

    return res.status(200).json({
      success: true,
      teacher,
    });
  } catch (error) {
    console.error("Get Teacher By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const updateTeacherByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role } = req.body;

    const allowedRoles = ["teacher", "scholar"];

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email and role are required",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher role",
      });
    }

    const teacher = await User.findOne({
      _id: userId,
      role: { $in: ["teacher", "scholar"] },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher or scholar not found",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const emailExists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: userId },
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email is already in use",
      });
    }

    teacher.name = name.trim();
    teacher.email = normalizedEmail;
    teacher.role = role;

    await teacher.save();

    return res.status(200).json({
      success: true,
      message: "Teacher profile updated successfully",
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        isActive: teacher.isActive,
        isVerified: teacher.isVerified,
      },
    });
  } catch (error) {
    console.error("Update Teacher Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};