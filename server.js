import dotenv from "dotenv";

dotenv.config();

import http from "http";
import { Server } from "socket.io";

import app from "./src/app.js";
import connectDB from "./src/configs/db.js";

import { initializeMediasoup } from "./src/services/mediasoup.service.js";
import { registerVideoSocket } from "./src/socket/videoSocket.js";
import { videoSocketAuth } from "./src/socket/videoAuth.js";

const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

/* =========================================================
   START SERVER
========================================================= */

const startServer = async () => {
  try {
    /* -----------------------------------------------------
       DATABASE
    ----------------------------------------------------- */

    await connectDB();

    console.log("✅ Database connected");

    /* -----------------------------------------------------
       HTTP SERVER
    ----------------------------------------------------- */

    const httpServer = http.createServer(app);

    /* -----------------------------------------------------
       SOCKET.IO
    ----------------------------------------------------- */

    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST"],
      },
    });

    /* -----------------------------------------------------
       SOCKET AUTHENTICATION
    ----------------------------------------------------- */

    io.use(videoSocketAuth);

    /* -----------------------------------------------------
       VIDEO / SFU SOCKETS
    ----------------------------------------------------- */

    registerVideoSocket(io);

    /* -----------------------------------------------------
       MEDIASOUP
    ----------------------------------------------------- */

    await initializeMediasoup();

    /* -----------------------------------------------------
       LISTEN
    ----------------------------------------------------- */

    httpServer.listen(PORT, () => {
      console.log(
        `🚀 Server is listening on http://localhost:${PORT}`
      );

      console.log("🎥 IlmHub SFU is ready");
    });
  } catch (error) {
    console.error("❌ Server startup failed:");
    console.error(error);
  }
};

startServer();