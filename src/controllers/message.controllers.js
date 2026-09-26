// import mongoose from "mongoose";
// import Message from "../models/Message.js";
// import User from "../models/Users.js";

// /* =========================================================
//    CREATE MESSAGE
//    Public / Authenticated User
// ========================================================= */

// export const createMessage = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       subject,
//       message,
//     } = req.body;

//     if (!name || !email || !subject || !message) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, subject and message are required",
//       });
//     }

//     const newMessage = await Message.create({
//       sender: req.user?._id || null,
//       recipient: null,

//       name: name.trim(),
//       email: email.toLowerCase().trim(),
//       subject: subject.trim(),
//       message: message.trim(),

//       status: "unread",
//       recipientStatus: "unread",
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Message sent successfully",
//       data: newMessage,
//     });
//   } catch (error) {
//     console.error("Create Message Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to send message",
//     });
//   }
// };


// /* =========================================================
//    GET MESSAGE RECIPIENTS - ADMIN

//    Students / Teachers / Scholars only
// ========================================================= */

// export const getMessageRecipientsForAdmin = async (req, res) => {
//   try {
//     const users = await User.find({
//       role: {
//         $in: ["student", "teacher", "scholar"],
//       },
//       isActive: true,
//     })
//       .select("_id name email role isActive isVerified")
//       .sort({ name: 1 })
//       .lean();

//     return res.status(200).json({
//       success: true,
//       count: users.length,
//       users,
//     });
//   } catch (error) {
//     console.error(
//       "Get Message Recipients Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to load message recipients",
//     });
//   }
// };


// /* =========================================================
//    CREATE MESSAGE - ADMIN

//    Admin → Student / Teacher / Scholar
// ========================================================= */

// export const createAdminMessage = async (req, res) => {
//   try {
//     const {
//       recipient,
//       subject,
//       message,
//     } = req.body;

//     if (!recipient || !subject || !message) {
//       return res.status(400).json({
//         success: false,
//         message: "Recipient, subject and message are required",
//       });
//     }

//     // Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(recipient)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid recipient",
//       });
//     }

//     // Find recipient
//     const recipientUser = await User.findById(recipient)
//       .select("_id name email role isActive isVerified")
//       .lean();

//     if (!recipientUser) {
//       return res.status(404).json({
//         success: false,
//         message: "Recipient not found",
//       });
//     }

//     // Only these roles can receive admin messages
//     if (
//       !["student", "teacher", "scholar"].includes(
//         recipientUser.role
//       )
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Messages can only be sent to students, teachers or scholars",
//       });
//     }

//     // Do not send to inactive accounts
//     if (!recipientUser.isActive) {
//       return res.status(400).json({
//         success: false,
//         message: "Recipient account is inactive",
//       });
//     }

//     const newMessage = await Message.create({
//       // Authenticated admin
//       sender: req.user._id,

//       // Selected user
//       recipient: recipientUser._id,

//       // Keep sender information for easy display
//       name: req.user.name,
//       email: req.user.email,

//       subject: subject.trim(),
//       message: message.trim(),

//       // Admin already knows this message was sent
//       status: "read",

//       // Recipient has not opened it yet
//       recipientStatus: "unread",
//     });

//     const populatedMessage = await Message.findById(
//       newMessage._id
//     )
//       .populate(
//         "sender",
//         "name email role isActive isVerified"
//       )
//       .populate(
//         "recipient",
//         "name email role isActive isVerified"
//       )
//       .lean();

//     return res.status(201).json({
//       success: true,
//       message: "Message sent successfully",
//       data: populatedMessage,
//     });
//   } catch (error) {
//     console.error(
//       "Create Admin Message Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to send message",
//     });
//   }
// };


// /* =========================================================
//    GET ALL MESSAGES - ADMIN
// ========================================================= */

// export const getAllMessagesForAdmin = async (req, res) => {
//   try {
//     const { search, status } = req.query;

//     const filter = {};

//     if (
//       status &&
//       ["read", "unread"].includes(status)
//     ) {
//       filter.status = status;
//     }

//     const messages = await Message.find(filter)
//       .populate(
//         "sender",
//         "name email role isActive isVerified"
//       )
//       .populate(
//         "recipient",
//         "name email role isActive isVerified"
//       )
//       .sort({ createdAt: -1 })
//       .lean();

//     let filteredMessages = messages;

//     if (search) {
//       const searchText = search
//         .toLowerCase()
//         .trim();

//       filteredMessages = messages.filter((item) => {
//         const name =
//           item.name?.toLowerCase() || "";

//         const email =
//           item.email?.toLowerCase() || "";

//         const subject =
//           item.subject?.toLowerCase() || "";

//         const message =
//           item.message?.toLowerCase() || "";

//         const senderName =
//           item.sender?.name?.toLowerCase() || "";

//         const senderEmail =
//           item.sender?.email?.toLowerCase() || "";

//         const recipientName =
//           item.recipient?.name?.toLowerCase() || "";

//         const recipientEmail =
//           item.recipient?.email?.toLowerCase() || "";

//         return (
//           name.includes(searchText) ||
//           email.includes(searchText) ||
//           subject.includes(searchText) ||
//           message.includes(searchText) ||
//           senderName.includes(searchText) ||
//           senderEmail.includes(searchText) ||
//           recipientName.includes(searchText) ||
//           recipientEmail.includes(searchText)
//         );
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       count: filteredMessages.length,
//       messages: filteredMessages,
//     });
//   } catch (error) {
//     console.error(
//       "Get All Messages Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to load messages",
//     });
//   }
// };


// /* =========================================================
//    GET SINGLE MESSAGE - ADMIN
// ========================================================= */

// export const getMessageByIdForAdmin = async (
//   req,
//   res
// ) => {
//   try {
//     const { messageId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(messageId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid message ID",
//       });
//     }

//     const message = await Message.findById(messageId)
//       .populate(
//         "sender",
//         "name email role isActive isVerified"
//       )
//       .populate(
//         "recipient",
//         "name email role isActive isVerified"
//       )
//       .lean();

//     if (!message) {
//       return res.status(404).json({
//         success: false,
//         message: "Message not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message,
//     });
//   } catch (error) {
//     console.error(
//       "Get Message By ID Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to load message",
//     });
//   }
// };


// /* =========================================================
//    MARK MESSAGE AS READ
//    ADMIN
// ========================================================= */

// export const markMessageAsRead = async (
//   req,
//   res
// ) => {
//   try {
//     const { messageId } = req.params;

//     const message = await Message.findById(
//       messageId
//     );

//     if (!message) {
//       return res.status(404).json({
//         success: false,
//         message: "Message not found",
//       });
//     }

//     message.status = "read";

//     await message.save();

//     return res.status(200).json({
//       success: true,
//       message: "Message marked as read",
//       data: message,
//     });
//   } catch (error) {
//     console.error(
//       "Mark Message Read Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to update message",
//     });
//   }
// };


// /* =========================================================
//    MARK MESSAGE AS UNREAD
//    ADMIN
// ========================================================= */

// export const markMessageAsUnread = async (
//   req,
//   res
// ) => {
//   try {
//     const { messageId } = req.params;

//     const message = await Message.findById(
//       messageId
//     );

//     if (!message) {
//       return res.status(404).json({
//         success: false,
//         message: "Message not found",
//       });
//     }

//     message.status = "unread";

//     await message.save();

//     return res.status(200).json({
//       success: true,
//       message: "Message marked as unread",
//       data: message,
//     });
//   } catch (error) {
//     console.error(
//       "Mark Message Unread Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to update message",
//     });
//   }
// };


// /* =========================================================
//    DELETE MESSAGE - ADMIN
// ========================================================= */

// export const deleteMessageByAdmin = async (
//   req,
//   res
// ) => {
//   try {
//     const { messageId } = req.params;

//     const message =
//       await Message.findByIdAndDelete(
//         messageId
//       );

//     if (!message) {
//       return res.status(404).json({
//         success: false,
//         message: "Message not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Message deleted successfully",
//     });
//   } catch (error) {
//     console.error(
//       "Delete Message Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete message",
//     });
//   }
// };


// /* =========================================================
//    GET MESSAGE RECIPIENTS - TEACHER / SCHOLAR

//    Teacher/Scholar can message:
//    - Admins
//    - Students enrolled in their own classes
// ========================================================= */

// export const getMessageRecipientsForTeacher = async (
//   req,
//   res
// ) => {
//   try {
//     const teacherId = req.user._id;

//     const Class = (
//       await import("../models/Class.js")
//     ).default;

//     const ClassEnrollment = (
//       await import("../models/classEnrollment.js")
//     ).default;

//     // Find teacher's classes
//     const teacherClasses = await Class.find({
//       teacher: teacherId,
//     })
//       .select("_id")
//       .lean();

//     const classIds = teacherClasses.map(
//       (item) => item._id
//     );

//     // Find students enrolled in teacher's classes
//     const enrollments =
//       classIds.length > 0
//         ? await ClassEnrollment.find({
//             class: { $in: classIds },
//             status: {
//               $in: ["Registered", "Attended"],
//             },
//           })
//             .populate({
//               path: "student",
//               select:
//                 "_id name email role isActive isVerified",
//             })
//             .lean()
//         : [];

//     const studentMap = new Map();

//     enrollments.forEach((enrollment) => {
//       if (
//         enrollment.student &&
//         enrollment.student.role === "student" &&
//         enrollment.student.isActive
//       ) {
//         studentMap.set(
//           enrollment.student._id.toString(),
//           enrollment.student
//         );
//       }
//     });

//     // Admins
//     const admins = await User.find({
//       role: "admin",
//       isActive: true,
//     })
//       .select("_id name email role isActive isVerified")
//       .sort({ name: 1 })
//       .lean();

//     const students = Array.from(
//       studentMap.values()
//     ).sort((a, b) =>
//       a.name.localeCompare(b.name)
//     );

//     return res.status(200).json({
//       success: true,
//       admins,
//       students,
//     });
//   } catch (error) {
//     console.error(
//       "Get Teacher Message Recipients Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "Failed to load message recipients",
//     });
//   }
// };


// /* =========================================================
//    CREATE MESSAGE - TEACHER / SCHOLAR

//    Teacher/Scholar → Admin / Own Student
// ========================================================= */

// export const createTeacherMessage = async (
//   req,
//   res
// ) => {
//   try {
//     const {
//       recipient,
//       subject,
//       message,
//     } = req.body;

//     if (
//       !recipient ||
//       !subject ||
//       !message
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Recipient, subject and message are required",
//       });
//     }

//     if (
//       !mongoose.Types.ObjectId.isValid(
//         recipient
//       )
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid recipient",
//       });
//     }

//     const recipientUser =
//       await User.findById(recipient)
//         .select(
//           "_id name email role isActive isVerified"
//         )
//         .lean();

//     if (!recipientUser) {
//       return res.status(404).json({
//         success: false,
//         message: "Recipient not found",
//       });
//     }

//     if (!recipientUser.isActive) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Recipient account is inactive",
//       });
//     }

//     const senderRole = req.user.role;

//     if (
//       !["teacher", "scholar"].includes(
//         senderRole
//       )
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied",
//       });
//     }

//     /*
//       Teachers/Scholars can always message admins.
//       Students must belong to one of their classes.
//     */

//     if (recipientUser.role === "student") {
//       const Class = (
//         await import("../models/Class.js")
//       ).default;

//       const ClassEnrollment = (
//         await import(
//           "../models/classEnrollment.js"
//         )
//       ).default;

//       const teacherClasses =
//         await Class.find({
//           teacher: req.user._id,
//         })
//           .select("_id")
//           .lean();

//       const classIds =
//         teacherClasses.map(
//           (item) => item._id
//         );

//       const enrollment =
//         await ClassEnrollment.findOne({
//           student: recipientUser._id,
//           class: {
//             $in: classIds,
//           },
//           status: {
//             $in: [
//               "Registered",
//               "Attended",
//             ],
//           },
//         });

//       if (!enrollment) {
//         return res.status(403).json({
//           success: false,
//           message:
//             "You can only message students enrolled in your classes",
//         });
//       }
//     } else if (
//       recipientUser.role !== "admin"
//     ) {
//       return res.status(403).json({
//         success: false,
//         message:
//           "You can only message admins or students enrolled in your classes",
//       });
//     }

//     const newMessage =
//       await Message.create({
//         sender: req.user._id,
//         recipient:
//           recipientUser._id,

//         name: req.user.name,
//         email: req.user.email,

//         subject: subject.trim(),
//         message: message.trim(),

//         status: "read",
//         recipientStatus: "unread",
//       });

//     const populatedMessage =
//       await Message.findById(
//         newMessage._id
//       )
//         .populate(
//           "sender",
//           "name email role isActive isVerified"
//         )
//         .populate(
//           "recipient",
//           "name email role isActive isVerified"
//         )
//         .lean();

//     return res.status(201).json({
//       success: true,
//       message:
//         "Message sent successfully",
//       data: populatedMessage,
//     });
//   } catch (error) {
//     console.error(
//       "Create Teacher Message Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "Failed to send message",
//     });
//   }
// };


// /* =========================================================
//    GET TEACHER MESSAGES

//    inbox / sent / all
// ========================================================= */

// export const getMessagesForTeacher =
//   async (req, res) => {
//     try {
//       const teacherId = req.user._id;
//       const {
//         search,
//         type = "inbox",
//       } = req.query;

//       let filter = {};

//       if (type === "inbox") {
//         filter.recipient = teacherId;
//       } else if (type === "sent") {
//         filter.sender = teacherId;
//       } else {
//         filter.$or = [
//           { recipient: teacherId },
//           { sender: teacherId },
//         ];
//       }

//       let messages =
//         await Message.find(filter)
//           .populate(
//             "sender",
//             "name email role isActive isVerified"
//           )
//           .populate(
//             "recipient",
//             "name email role isActive isVerified"
//           )
//           .sort({ createdAt: -1 })
//           .lean();

//       if (search) {
//         const searchText =
//           search.toLowerCase().trim();

//         messages = messages.filter(
//           (item) => {
//             const subject =
//               item.subject?.toLowerCase() ||
//               "";

//             const message =
//               item.message?.toLowerCase() ||
//               "";

//             const senderName =
//               item.sender?.name?.toLowerCase() ||
//               "";

//             const senderEmail =
//               item.sender?.email?.toLowerCase() ||
//               "";

//             const recipientName =
//               item.recipient?.name?.toLowerCase() ||
//               "";

//             const recipientEmail =
//               item.recipient?.email?.toLowerCase() ||
//               "";

//             return (
//               subject.includes(searchText) ||
//               message.includes(searchText) ||
//               senderName.includes(searchText) ||
//               senderEmail.includes(
//                 searchText
//               ) ||
//               recipientName.includes(
//                 searchText
//               ) ||
//               recipientEmail.includes(
//                 searchText
//               )
//             );
//           }
//         );
//       }

//       const unreadCount =
//         await Message.countDocuments({
//           recipient: teacherId,
//           recipientStatus: "unread",
//         });

//       return res.status(200).json({
//         success: true,
//         count: messages.length,
//         unreadCount,
//         messages,
//       });
//     } catch (error) {
//       console.error(
//         "Get Teacher Messages Error:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to load messages",
//       });
//     }
//   };


// /* =========================================================
//    GET SINGLE MESSAGE - TEACHER / SCHOLAR
// ========================================================= */

// export const getMessageByIdForTeacher =
//   async (req, res) => {
//     try {
//       const teacherId = req.user._id;
//       const { messageId } =
//         req.params;

//       if (
//         !mongoose.Types.ObjectId.isValid(
//           messageId
//         )
//       ) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid message ID",
//         });
//       }

//       const message =
//         await Message.findOne({
//           _id: messageId,
//           $or: [
//             { sender: teacherId },
//             { recipient: teacherId },
//           ],
//         })
//           .populate(
//             "sender",
//             "name email role isActive isVerified"
//           )
//           .populate(
//             "recipient",
//             "name email role isActive isVerified"
//           )
//           .lean();

//       if (!message) {
//         return res.status(404).json({
//           success: false,
//           message:
//             "Message not found",
//         });
//       }

//       // Mark incoming message as read
//       if (
//         message.recipient?._id?.toString() ===
//         teacherId.toString()
//       ) {
//         await Message.findByIdAndUpdate(
//           messageId,
//           {
//             recipientStatus: "read",
//           }
//         );

//         message.recipientStatus =
//           "read";
//       }

//       return res.status(200).json({
//         success: true,
//         message,
//       });
//     } catch (error) {
//       console.error(
//         "Get Teacher Message Error:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to load message",
//       });
//     }
//   };


// /* =========================================================
//    MARK TEACHER MESSAGE AS READ
// ========================================================= */

// export const markTeacherMessageAsRead =
//   async (req, res) => {
//     try {
//       const teacherId =
//         req.user._id;

//       const { messageId } =
//         req.params;

//       const message =
//         await Message.findOne({
//           _id: messageId,
//           recipient: teacherId,
//         });

//       if (!message) {
//         return res.status(404).json({
//           success: false,
//           message:
//             "Message not found",
//         });
//       }

//       message.recipientStatus =
//         "read";

//       await message.save();

//       return res.status(200).json({
//         success: true,
//         message:
//           "Message marked as read",
//       });
//     } catch (error) {
//       console.error(
//         "Mark Teacher Message Read Error:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to update message",
//       });
//     }
//   };


// /* =========================================================
//    MARK TEACHER MESSAGE AS UNREAD
// ========================================================= */

// export const markTeacherMessageAsUnread =
//   async (req, res) => {
//     try {
//       const teacherId =
//         req.user._id;

//       const { messageId } =
//         req.params;

//       const message =
//         await Message.findOne({
//           _id: messageId,
//           recipient: teacherId,
//         });

//       if (!message) {
//         return res.status(404).json({
//           success: false,
//           message:
//             "Message not found",
//         });
//       }

//       message.recipientStatus =
//         "unread";

//       await message.save();

//       return res.status(200).json({
//         success: true,
//         message:
//           "Message marked as unread",
//       });
//     } catch (error) {
//       console.error(
//         "Mark Teacher Message Unread Error:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to update message",
//       });
//     }
//   };


// /* =========================================================
//    DELETE TEACHER MESSAGE

//    Teacher can delete only their own
//    sent/received message.
// ========================================================= */

// export const deleteMessageByTeacher =
//   async (req, res) => {
//     try {
//       const teacherId =
//         req.user._id;

//       const { messageId } =
//         req.params;

//       const message =
//         await Message.findOneAndDelete({
//           _id: messageId,
//           $or: [
//             { sender: teacherId },
//             { recipient: teacherId },
//           ],
//         });

//       if (!message) {
//         return res.status(404).json({
//           success: false,
//           message:
//             "Message not found",
//         });
//       }

//       return res.status(200).json({
//         success: true,
//         message:
//           "Message deleted successfully",
//       });
//     } catch (error) {
//       console.error(
//         "Delete Teacher Message Error:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to delete message",
//       });
//     }
//   };



import mongoose from "mongoose";

import Message from "../models/Message.js";
import User from "../models/Users.js";
import Class from "../models/Class.js";
import ClassEnrollment from "../models/classEnrollment.js";


/* =========================================================
   CREATE MESSAGE
   Public / Authenticated User
========================================================= */

export const createMessage = async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message,
    } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, subject and message are required",
      });
    }

    const newMessage = await Message.create({
      sender: req.user?._id || null,
      recipient: null,

      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),

      status: "unread",
      recipientStatus: "unread",
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Create Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};


/* =========================================================
   GET MESSAGE RECIPIENTS - ADMIN

   Students / Teachers / Scholars only
========================================================= */

export const getMessageRecipientsForAdmin = async (
  req,
  res
) => {
  try {
    const users = await User.find({
      role: {
        $in: ["student", "teacher", "scholar"],
      },
      isActive: true,
    })
      .select("_id name email role isActive isVerified")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "Get Message Recipients Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load message recipients",
    });
  }
};


/* =========================================================
   CREATE MESSAGE - ADMIN

   Admin → Student / Teacher / Scholar
========================================================= */

export const createAdminMessage = async (
  req,
  res
) => {
  try {
    const {
      recipient,
      subject,
      message,
    } = req.body;

    if (!recipient || !subject || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient, subject and message are required",
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(recipient)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipient",
      });
    }

    // Find recipient
    const recipientUser = await User.findById(
      recipient
    )
      .select(
        "_id name email role isActive isVerified"
      )
      .lean();

    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // Only these roles can receive admin messages
    if (
      !["student", "teacher", "scholar"].includes(
        recipientUser.role
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Messages can only be sent to students, teachers or scholars",
      });
    }

    // Do not send to inactive accounts
    if (!recipientUser.isActive) {
      return res.status(400).json({
        success: false,
        message: "Recipient account is inactive",
      });
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      recipient: recipientUser._id,

      name: req.user.name,
      email: req.user.email,

      subject: subject.trim(),
      message: message.trim(),

      // Admin already knows this message was sent
      status: "read",

      // Recipient has not opened it yet
      recipientStatus: "unread",
    });

    const populatedMessage =
      await Message.findById(newMessage._id)
        .populate(
          "sender",
          "name email role isActive isVerified"
        )
        .populate(
          "recipient",
          "name email role isActive isVerified"
        )
        .lean();

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error(
      "Create Admin Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};


/* =========================================================
   GET ALL MESSAGES - ADMIN
========================================================= */

export const getAllMessagesForAdmin = async (
  req,
  res
) => {
  try {
    const { search, status } = req.query;

    const filter = {};

    if (
      status &&
      ["read", "unread"].includes(status)
    ) {
      filter.status = status;
    }

    const messages = await Message.find(filter)
      .populate(
        "sender",
        "name email role isActive isVerified"
      )
      .populate(
        "recipient",
        "name email role isActive isVerified"
      )
      .sort({ createdAt: -1 })
      .lean();

    let filteredMessages = messages;

    if (search) {
      const searchText = search
        .toLowerCase()
        .trim();

      filteredMessages = messages.filter(
        (item) => {
          const name =
            item.name?.toLowerCase() || "";

          const email =
            item.email?.toLowerCase() || "";

          const subject =
            item.subject?.toLowerCase() || "";

          const message =
            item.message?.toLowerCase() || "";

          const senderName =
            item.sender?.name?.toLowerCase() || "";

          const senderEmail =
            item.sender?.email?.toLowerCase() || "";

          const recipientName =
            item.recipient?.name?.toLowerCase() || "";

          const recipientEmail =
            item.recipient?.email?.toLowerCase() || "";

          return (
            name.includes(searchText) ||
            email.includes(searchText) ||
            subject.includes(searchText) ||
            message.includes(searchText) ||
            senderName.includes(searchText) ||
            senderEmail.includes(searchText) ||
            recipientName.includes(searchText) ||
            recipientEmail.includes(searchText)
          );
        }
      );
    }

    return res.status(200).json({
      success: true,
      count: filteredMessages.length,
      messages: filteredMessages,
    });
  } catch (error) {
    console.error(
      "Get All Messages Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load messages",
    });
  }
};


/* =========================================================
   GET SINGLE MESSAGE - ADMIN
========================================================= */

export const getMessageByIdForAdmin = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(messageId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    const message =
      await Message.findById(messageId)
        .populate(
          "sender",
          "name email role isActive isVerified"
        )
        .populate(
          "recipient",
          "name email role isActive isVerified"
        )
        .lean();

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error(
      "Get Message By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load message",
    });
  }
};


/* =========================================================
   MARK MESSAGE AS READ
   ADMIN
========================================================= */

export const markMessageAsRead = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;

    const message =
      await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.status = "read";

    await message.save();

    return res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error(
      "Mark Message Read Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update message",
    });
  }
};


/* =========================================================
   MARK MESSAGE AS UNREAD
   ADMIN
========================================================= */

export const markMessageAsUnread = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;

    const message =
      await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.status = "unread";

    await message.save();

    return res.status(200).json({
      success: true,
      message: "Message marked as unread",
      data: message,
    });
  } catch (error) {
    console.error(
      "Mark Message Unread Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update message",
    });
  }
};


/* =========================================================
   DELETE MESSAGE - ADMIN
========================================================= */

export const deleteMessageByAdmin = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;

    const message =
      await Message.findByIdAndDelete(
        messageId
      );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};


/* =========================================================
   GET MESSAGE RECIPIENTS - TEACHER / SCHOLAR

   Teacher/Scholar can message:
   - Admins
   - Students enrolled in their own classes
========================================================= */

export const getMessageRecipientsForTeacher =
  async (req, res) => {
    try {
      const teacherId = req.user._id;

      // Find classes belonging to the
      // logged-in teacher/scholar
      const teacherClasses =
        await Class.find({
          teacher: teacherId,
        })
          .select("_id")
          .lean();

      const classIds =
        teacherClasses.map(
          (item) => item._id
        );

      // Find students enrolled in
      // teacher's classes
      const enrollments =
        classIds.length > 0
          ? await ClassEnrollment.find({
              class: {
                $in: classIds,
              },
              status: {
                $in: [
                  "Registered",
                  "Attended",
                ],
              },
            })
              .populate({
                path: "student",
                select:
                  "_id name email role isActive isVerified",
              })
              .lean()
          : [];

      // Remove duplicate students
      const studentMap = new Map();

      enrollments.forEach(
        (enrollment) => {
          const student =
            enrollment.student;

          if (
            student &&
            student.role === "student" &&
            student.isActive
          ) {
            studentMap.set(
              student._id.toString(),
              student
            );
          }
        }
      );

      const students =
        Array.from(
          studentMap.values()
        ).sort((a, b) =>
          a.name.localeCompare(
            b.name
          )
        );

      // Get active administrators
      const admins =
        await User.find({
          role: "admin",
          isActive: true,
        })
          .select(
            "_id name email role isActive isVerified"
          )
          .sort({ name: 1 })
          .lean();

      return res.status(200).json({
        success: true,
        admins,
        students,
      });
    } catch (error) {
      console.error(
        "Get Teacher Message Recipients Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load message recipients",
      });
    }
  };


/* =========================================================
   CREATE MESSAGE - TEACHER / SCHOLAR

   Teacher/Scholar → Admin / Own Student
========================================================= */

export const createTeacherMessage =
  async (req, res) => {
    try {
      const {
        recipient,
        subject,
        message,
      } = req.body;

      if (
        !recipient ||
        !subject ||
        !message
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Recipient, subject and message are required",
        });
      }

      // Validate recipient ID
      if (
        !mongoose.Types.ObjectId.isValid(
          recipient
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid recipient",
        });
      }

      // Find recipient
      const recipientUser =
        await User.findById(recipient)
          .select(
            "_id name email role isActive isVerified"
          )
          .lean();

      if (!recipientUser) {
        return res.status(404).json({
          success: false,
          message: "Recipient not found",
        });
      }

      // Recipient must be active
      if (!recipientUser.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "Recipient account is inactive",
        });
      }

      // Make sure sender is actually
      // teacher or scholar
      if (
        !["teacher", "scholar"].includes(
          req.user.role
        )
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      /*
        Teacher/Scholar can always
        message an admin.
      */

      if (
        recipientUser.role === "admin"
      ) {
        // Allowed
      }

      /*
        Student must belong to one
        of the teacher's classes.
      */

      else if (
        recipientUser.role === "student"
      ) {
        const teacherClasses =
          await Class.find({
            teacher: req.user._id,
          })
            .select("_id")
            .lean();

        const classIds =
          teacherClasses.map(
            (item) => item._id
          );

        const enrollment =
          await ClassEnrollment.findOne({
            student:
              recipientUser._id,

            class: {
              $in: classIds,
            },

            status: {
              $in: [
                "Registered",
                "Attended",
              ],
            },
          });

        if (!enrollment) {
          return res.status(403).json({
            success: false,
            message:
              "You can only message students enrolled in your classes",
          });
        }
      }

      /*
        No other role is allowed.
      */

      else {
        return res.status(403).json({
          success: false,
          message:
            "You can only message admins or students enrolled in your classes",
        });
      }

      // Create message
      const newMessage =
        await Message.create({
          sender: req.user._id,

          recipient:
            recipientUser._id,

          name: req.user.name,

          email: req.user.email,

          subject:
            subject.trim(),

          message:
            message.trim(),

          // Sender already knows
          // that the message was sent
          status: "read",

          // Recipient has not opened it
          recipientStatus: "unread",
        });

      // Populate sender and recipient
      const populatedMessage =
        await Message.findById(
          newMessage._id
        )
          .populate(
            "sender",
            "name email role isActive isVerified"
          )
          .populate(
            "recipient",
            "name email role isActive isVerified"
          )
          .lean();

      return res.status(201).json({
        success: true,
        message:
          "Message sent successfully",
        data: populatedMessage,
      });
    } catch (error) {
      console.error(
        "Create Teacher Message Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to send message",
      });
    }
  };


/* =========================================================
   GET TEACHER MESSAGES

   inbox / sent / all
========================================================= */

export const getMessagesForTeacher =
  async (req, res) => {
    try {
      const teacherId =
        req.user._id;

      const {
        search,
        type = "inbox",
      } = req.query;

      let filter = {};

      if (type === "inbox") {
        filter.recipient =
          teacherId;
      } else if (type === "sent") {
        filter.sender =
          teacherId;
      } else {
        filter.$or = [
          {
            recipient:
              teacherId,
          },
          {
            sender:
              teacherId,
          },
        ];
      }

      let messages =
        await Message.find(filter)
          .populate(
            "sender",
            "name email role isActive isVerified"
          )
          .populate(
            "recipient",
            "name email role isActive isVerified"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      // Search
      if (search) {
        const searchText =
          search
            .toLowerCase()
            .trim();

        messages =
          messages.filter(
            (item) => {
              const subject =
                item.subject?.toLowerCase() ||
                "";

              const message =
                item.message?.toLowerCase() ||
                "";

              const senderName =
                item.sender?.name?.toLowerCase() ||
                "";

              const senderEmail =
                item.sender?.email?.toLowerCase() ||
                "";

              const recipientName =
                item.recipient?.name?.toLowerCase() ||
                "";

              const recipientEmail =
                item.recipient?.email?.toLowerCase() ||
                "";

              return (
                subject.includes(
                  searchText
                ) ||
                message.includes(
                  searchText
                ) ||
                senderName.includes(
                  searchText
                ) ||
                senderEmail.includes(
                  searchText
                ) ||
                recipientName.includes(
                  searchText
                ) ||
                recipientEmail.includes(
                  searchText
                )
              );
            }
          );
      }

      // Count unread messages
      const unreadCount =
        await Message.countDocuments({
          recipient: teacherId,
          recipientStatus:
            "unread",
        });

      return res.status(200).json({
        success: true,
        count: messages.length,
        unreadCount,
        messages,
      });
    } catch (error) {
      console.error(
        "Get Teacher Messages Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load messages",
      });
    }
  };


/* =========================================================
   GET SINGLE MESSAGE - TEACHER / SCHOLAR
========================================================= */

export const getMessageByIdForTeacher =
  async (req, res) => {
    try {
      const teacherId =
        req.user._id;

      const { messageId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          messageId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid message ID",
        });
      }

      const message =
        await Message.findOne({
          _id: messageId,

          $or: [
            {
              sender:
                teacherId,
            },
            {
              recipient:
                teacherId,
            },
          ],
        })
          .populate(
            "sender",
            "name email role isActive isVerified"
          )
          .populate(
            "recipient",
            "name email role isActive isVerified"
          )
          .lean();

      if (!message) {
        return res.status(404).json({
          success: false,
          message:
            "Message not found",
        });
      }

      // If teacher is recipient,
      // mark the message as read.
      if (
        message.recipient?._id?.toString() ===
        teacherId.toString()
      ) {
        await Message.findByIdAndUpdate(
          messageId,
          {
            recipientStatus:
              "read",
          }
        );

        message.recipientStatus =
          "read";
      }

      return res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error(
        "Get Teacher Message Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load message",
      });
    }
  };


/* =========================================================
   MARK TEACHER MESSAGE AS READ
========================================================= */

export const markTeacherMessageAsRead =
  async (req, res) => {
    try {
      const teacherId =
        req.user._id;

      const { messageId } =
        req.params;

      const message =
        await Message.findOne({
          _id: messageId,
          recipient: teacherId,
        });

      if (!message) {
        return res.status(404).json({
          success: false,
          message:
            "Message not found",
        });
      }

      message.recipientStatus =
        "read";

      await message.save();

      return res.status(200).json({
        success: true,
        message:
          "Message marked as read",
      });
    } catch (error) {
      console.error(
        "Mark Teacher Message Read Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update message",
      });
    }
  };


/* =========================================================
   MARK TEACHER MESSAGE AS UNREAD
========================================================= */

export const markTeacherMessageAsUnread =
  async (req, res) => {
    try {
      const teacherId =
        req.user._id;

      const { messageId } =
        req.params;

      const message =
        await Message.findOne({
          _id: messageId,
          recipient: teacherId,
        });

      if (!message) {
        return res.status(404).json({
          success: false,
          message:
            "Message not found",
        });
      }

      message.recipientStatus =
        "unread";

      await message.save();

      return res.status(200).json({
        success: true,
        message:
          "Message marked as unread",
      });
    } catch (error) {
      console.error(
        "Mark Teacher Message Unread Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update message",
      });
    }
  };


/* =========================================================
   DELETE TEACHER MESSAGE

   Teacher can delete only their own
   sent/received message.
========================================================= */

export const deleteMessageByTeacher =
  async (req, res) => {
    try {
      const teacherId =
        req.user._id;

      const { messageId } =
        req.params;

      const message =
        await Message.findOneAndDelete({
          _id: messageId,

          $or: [
            {
              sender:
                teacherId,
            },
            {
              recipient:
                teacherId,
            },
          ],
        });

      if (!message) {
        return res.status(404).json({
          success: false,
          message:
            "Message not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Message deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Teacher Message Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete message",
      });
    }
  };

