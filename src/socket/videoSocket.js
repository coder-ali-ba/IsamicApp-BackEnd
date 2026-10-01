import {
  joinRoom,
  createTransport,
  connectTransport,
  createProducer,
  getExistingProducers,
  createConsumer,
  resumeConsumer,
  leaveRoom,
} from "./videoRoomManager.js";

export const registerVideoSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Video socket connected: ${socket.id}`);

    // =====================================================
    // JOIN CLASS
    // =====================================================

    socket.on("join-class", async (payload, callback) => {
      try {
        const { classId } = payload || {};

        if (!classId) {
          throw new Error("Class ID is required");
        }

        const result = await joinRoom({
          classId,
          socketId: socket.id,
          user: socket.user,
        });

        socket.join(`class:${classId}`);

        socket.data.classId = String(classId);
        socket.data.access = result.access;

        callback({
          success: true,
          data: result,
        });

        socket.to(`class:${classId}`).emit("participant-joined", {
          socketId: socket.id,
          userId: socket.user._id.toString(),
          name: socket.user.name,
          role: socket.user.role,
        });

        console.log(`🎥 ${socket.user.name} joined class ${classId}`);
      } catch (error) {
        console.error("join-class error:", error);

        callback({
          success: false,
          message: error.message || "Unable to join class",
        });
      }
    });

    // =====================================================
    // CREATE WEBRTC TRANSPORT
    // =====================================================

    socket.on("create-transport", async (payload, callback) => {
      try {
        const classId = socket.data.classId;

        if (!classId) {
          throw new Error("Join a class first");
        }

        const { direction } = payload || {};

        const transport = await createTransport({
          classId,
          socketId: socket.id,
          direction,
        });

        callback({
          success: true,
          data: transport,
        });

        console.log(
          `🚚 ${direction || "unknown"} transport created for ${socket.user.name}`,
        );
      } catch (error) {
        console.error("create-transport error:", error);

        callback({
          success: false,
          message: error.message || "Failed to create transport",
        });
      }
    });

    // =====================================================
    // CONNECT WEBRTC TRANSPORT
    // =====================================================

    socket.on("connect-transport", async (payload, callback) => {
      try {
        const { transportId, dtlsParameters } = payload || {};

        const classId = socket.data.classId;

        if (!classId) {
          throw new Error("Join a class first");
        }

        if (!transportId) {
          throw new Error("Transport ID is required");
        }

        if (!dtlsParameters) {
          throw new Error("DTLS parameters are required");
        }

        const result = await connectTransport({
          classId,
          socketId: socket.id,
          transportId,
          dtlsParameters,
        });

        callback({
          success: true,
          data: result,
        });

        console.log(`🔗 Transport connected: ${transportId}`);
      } catch (error) {
        console.error("connect-transport error:", error);

        callback({
          success: false,
          message: error.message || "Failed to connect transport",
        });
      }
    });

    // =====================================================
    // PRODUCE AUDIO / VIDEO
    // =====================================================

    socket.on("produce", async (payload, callback) => {
      try {
        const { transportId, kind, rtpParameters, appData } = payload || {};

        const classId = socket.data.classId;

        if (!classId) {
          throw new Error("Join a class first");
        }

        if (!transportId) {
          throw new Error("Transport ID is required");
        }

        if (!kind) {
          throw new Error("Producer kind is required");
        }

        if (!rtpParameters) {
          throw new Error("RTP parameters are required");
        }

        const result = await createProducer({
          classId,
          socketId: socket.id,
          transportId,
          kind,
          rtpParameters,
          appData,
        });

        callback({
          success: true,
          data: result,
        });

        socket.to(`class:${classId}`).emit("new-producer", {
          producerId: result.producerId,

          peerId: socket.id,

          user: {
            id: socket.user._id.toString(),
            name: socket.user.name,
            role: socket.user.role,
          },

          kind,
        });

        console.log(`🎤 ${kind} producer created by ${socket.user.name}`);
      } catch (error) {
        console.error("produce error:", error);

        callback({
          success: false,
          message: error.message || "Failed to create producer",
        });
      }
    });

    // =====================================================
    // EXISTING PRODUCERS
    // =====================================================

    socket.on("get-producers", async (_, callback) => {
      try {
        const classId = socket.data.classId;

        if (!classId) {
          throw new Error("Join a class first");
        }

        const producers = getExistingProducers({
          classId,
          socketId: socket.id,
        });

        callback({
          success: true,
          data: producers,
          producers,
        });
      } catch (error) {
        console.error("get-producers error:", error);

        callback({
          success: false,
          message: error.message || "Failed to get producers",
        });
      }
    });

    // =====================================================
    // CONSUME
    // =====================================================

    socket.on("consume", async (payload, callback) => {
      try {
        const { transportId, producerId, rtpCapabilities } = payload || {};

        const classId = socket.data.classId;

        if (!classId) {
          throw new Error("Join a class first");
        }

        if (!transportId) {
          throw new Error("Transport ID is required");
        }

        if (!producerId) {
          throw new Error("Producer ID is required");
        }

        if (!rtpCapabilities) {
          throw new Error("RTP capabilities are required");
        }

        const result = await createConsumer({
          classId,
          socketId: socket.id,
          transportId,
          producerId,
          rtpCapabilities,
        });

        callback({
          success: true,
          data: result,
        });

        console.log(`🎧 Consumer created for ${socket.user.name}`);
      } catch (error) {
        console.error("consume error:", error);

        callback({
          success: false,
          message: error.message || "Failed to consume producer",
        });
      }
    });

    // =====================================================
    // RESUME CONSUMER
    // =====================================================

    socket.on("resume-consumer", async (payload, callback) => {
      try {
        const { consumerId } = payload || {};

        const classId = socket.data.classId;

        if (!classId) {
          throw new Error("Join a class first");
        }

        if (!consumerId) {
          throw new Error("Consumer ID is required");
        }

        const result = await resumeConsumer({
          classId,
          socketId: socket.id,
          consumerId,
        });

        callback({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("resume-consumer error:", error);

        callback({
          success: false,
          message: error.message || "Failed to resume consumer",
        });
      }
    });

    // =====================================================
    // DISCONNECT
    // =====================================================

    socket.on("disconnect", () => {
      const classId = socket.data.classId;

      if (classId) {
        leaveRoom({
          classId,
          socketId: socket.id,
        });

        socket.to(`class:${classId}`).emit("participant-left", {
          socketId: socket.id,
        });
      }

      console.log(`🔌 Video socket disconnected: ${socket.id}`);
    });
  });
};
