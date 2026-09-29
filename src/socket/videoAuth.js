import jwt from "jsonwebtoken";
import User from "../models/Users.js";

const getTokenFromCookie = (cookieHeader) => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader
    .split(";")
    .map((item) => item.trim());

  const tokenCookie = cookies.find(
    (item) => item.startsWith("token=")
  );

  if (!tokenCookie) {
    return null;
  }

  return decodeURIComponent(
    tokenCookie.substring("token=".length)
  );
};

export const videoSocketAuth =
  async (socket, next) => {
    try {
      const token =
        getTokenFromCookie(
          socket.handshake.headers.cookie
        );

      if (!token) {
        return next(
          new Error(
            "Authentication required"
          )
        );
      }

      const decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

      const user =
        await User.findById(
          decoded.userId
        ).select("-password");

      if (!user) {
        return next(
          new Error(
            "User not found"
          )
        );
      }

      if (!user.isActive) {
        return next(
          new Error(
            "Your account is inactive"
          )
        );
      }

      socket.user = user;

      next();
    } catch (error) {
      console.error(
        "Video socket auth error:",
        error.message
      );

      next(
        new Error(
          "Invalid or expired authentication"
        )
      );
    }
  };