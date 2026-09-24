import Message from "../models/Message.js";
import User from "../models/Users.js";

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
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
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
   GET ALL MESSAGES - ADMIN
========================================================= */

export const getAllMessagesForAdmin = async (req, res) => {
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
        "name email role isActive"
      )
      .sort({ createdAt: -1 })
      .lean();

    let filteredMessages = messages;

    if (search) {
      const searchText =
        search.toLowerCase().trim();

      filteredMessages =
        messages.filter((item) => {
          const name =
            item.name?.toLowerCase() || "";

          const email =
            item.email?.toLowerCase() || "";

          const subject =
            item.subject?.toLowerCase() || "";

          const message =
            item.message?.toLowerCase() || "";

          return (
            name.includes(searchText) ||
            email.includes(searchText) ||
            subject.includes(searchText) ||
            message.includes(searchText)
          );
        });
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

    const message = await Message.findById(messageId)
      .populate(
        "sender",
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
========================================================= */

export const markMessageAsRead = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(
      messageId
    );

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
========================================================= */

export const markMessageAsUnread = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(
      messageId
    );

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