import Class from "../models/Class.js";
import ClassEnrollment from "../models/classEnrollment.js";

import {
  getOrCreateRoom,
  getRoom,
  createPeer,
  getPeer,
  removePeer,
  createWebRtcTransport,
  getRouterRtpCapabilities,
} from "../services/mediasoup.service.js";

// =========================================================
// CLASS STATUS
// =========================================================

const getClassStatus = (classItem) => {
  if (classItem.status === "Cancelled") {
    return "Cancelled";
  }

  if (classItem.status === "Completed") {
    return "Completed";
  }

  const now = new Date();

  const start = new Date(classItem.scheduledAt);

  const end = new Date(
    start.getTime() + Number(classItem.durationMinutes) * 60 * 1000,
  );

  if (now >= start && now < end) {
    return "Live";
  }

  if (now < start) {
    return "Upcoming";
  }

  return "Completed";
};

// =========================================================
// VERIFY CLASS ACCESS
// =========================================================

export const verifyClassAccess = async (classId, user) => {
  const classItem = await Class.findById(classId)
    .select("_id title teacher scheduledAt durationMinutes status maxStudents")
    .lean();

  if (!classItem) {
    throw new Error("Class not found");
  }

  const currentStatus = getClassStatus(classItem);

  if (currentStatus !== "Live") {
    throw new Error(`This class is not live. Current status: ${currentStatus}`);
  }

  if (!user || !user._id) {
    throw new Error("Authentication required");
  }

  const userId = user._id.toString();
  const teacherId = classItem.teacher.toString();

  // =====================================================
  // TEACHER / SCHOLAR WHO OWNS THE CLASS
  // =====================================================

  if (["teacher", "scholar"].includes(user.role) && userId === teacherId) {
    return {
      classItem,
      access: "teacher",
    };
  }

  // =====================================================
  // STUDENT MUST BE ENROLLED
  // =====================================================

  if (user.role === "student") {
    const enrollment = await ClassEnrollment.findOne({
      class: classId,
      student: user._id,
      status: {
        $in: ["Registered", "Attended"],
      },
    }).lean();

    if (!enrollment) {
      throw new Error("You must be enrolled in this class to join");
    }

    return {
      classItem,
      access: "student",
    };
  }

  // =====================================================
  // UNAUTHORIZED
  // =====================================================

  throw new Error("You are not authorized to join this class");
};

// =========================================================
// JOIN ROOM
// =========================================================

export const joinRoom = async ({ classId, socketId, user }) => {
  if (!classId) {
    throw new Error("Class ID is required");
  }

  if (!socketId) {
    throw new Error("Socket ID is required");
  }

  if (!user) {
    throw new Error("User is required");
  }

  // -----------------------------------------------------
  // VERIFY USER ACCESS
  // -----------------------------------------------------

  const access = await verifyClassAccess(classId, user);

  // -----------------------------------------------------
  // GET / CREATE SFU ROOM
  // -----------------------------------------------------

  const room = await getOrCreateRoom(classId);

  // -----------------------------------------------------
  // GET EXISTING PEER
  // -----------------------------------------------------

  let peer = getPeer(classId, socketId);

  // -----------------------------------------------------
  // CREATE NEW PEER
  // -----------------------------------------------------

  if (!peer) {
    peer = createPeer(classId, socketId, user);
  }

  // -----------------------------------------------------
  // EXISTING PARTICIPANTS
  // -----------------------------------------------------

  const existingPeers = [];

  for (const [existingSocketId, existingPeer] of room.peers) {
    if (existingSocketId === socketId) {
      continue;
    }

    existingPeers.push({
      socketId: existingPeer.socketId,
      userId: existingPeer.userId,
      name: existingPeer.name,
      role: existingPeer.role,
    });
  }

  // -----------------------------------------------------
  // RETURN ROOM INFORMATION
  // -----------------------------------------------------

  return {
    classId: String(classId),

    peerId: peer.id,

    access: access.access,

    user: {
      id: String(user._id),
      name: user.name || "User",
      role: user.role,
    },

    routerRtpCapabilities: getRouterRtpCapabilities(classId),

    participants: existingPeers,
  };
};

// =========================================================
// CREATE WEBRTC TRANSPORT
// =========================================================

export const createTransport = async ({ classId, socketId, direction }) => {
  if (!classId) {
    throw new Error("Class ID is required");
  }

  if (!socketId) {
    throw new Error("Socket ID is required");
  }

  if (direction && !["send", "recv"].includes(direction)) {
    throw new Error("Transport direction must be send or recv");
  }

  // -----------------------------------------------------
  // GET PEER
  // -----------------------------------------------------

  const peer = getPeer(classId, socketId);

  if (!peer) {
    throw new Error("You must join the class first");
  }

  // -----------------------------------------------------
  // CREATE MEDIASOUP TRANSPORT
  // -----------------------------------------------------

  const transport = await createWebRtcTransport(classId);

  // -----------------------------------------------------
  // STORE TRANSPORT INSIDE PEER
  // -----------------------------------------------------

  peer.transports.set(transport.id, transport);

  // -----------------------------------------------------
  // RETURN TRANSPORT PARAMETERS
  // -----------------------------------------------------

  return {
    id: transport.id,

    iceParameters: transport.iceParameters,

    iceCandidates: transport.iceCandidates,

    dtlsParameters: transport.dtlsParameters,

    sctpParameters: transport.sctpParameters,

    direction: direction || null,
  };
};

// =========================================================
// GET PEER TRANSPORT
// =========================================================

export const getPeerTransport = ({ classId, socketId, transportId }) => {
  if (!classId) {
    throw new Error("Class ID is required");
  }

  if (!socketId) {
    throw new Error("Socket ID is required");
  }

  if (!transportId) {
    throw new Error("Transport ID is required");
  }

  const peer = getPeer(classId, socketId);

  if (!peer) {
    throw new Error("Peer not found");
  }

  const transport = peer.transports.get(transportId);

  if (!transport) {
    throw new Error("Transport not found");
  }

  return {
    peer,
    transport,
  };
};

// =========================================================
// CONNECT WEBRTC TRANSPORT
// =========================================================

export const connectTransport = async ({
  classId,
  socketId,
  transportId,
  dtlsParameters,
}) => {
  if (!dtlsParameters) {
    throw new Error("DTLS parameters are required");
  }

  const { transport } = getPeerTransport({
    classId,
    socketId,
    transportId,
  });

  await transport.connect({
    dtlsParameters,
  });

  return {
    connected: true,
    transportId,
  };
};

// =========================================================
// CREATE PRODUCER
// =========================================================

export const createProducer = async ({
  classId,
  socketId,
  transportId,
  kind,
  rtpParameters,
  appData,
}) => {
  if (!kind) {
    throw new Error("Producer kind is required");
  }

  if (!rtpParameters) {
    throw new Error("RTP parameters are required");
  }

  const { peer, transport } = getPeerTransport({
    classId,
    socketId,
    transportId,
  });

  // -----------------------------------------------------
  // PRODUCE
  // -----------------------------------------------------

  const producer = await transport.produce({
    kind,
    rtpParameters,

    appData: {
      ...(appData || {}),

      userId: peer.userId,

      socketId,
    },
  });

  // -----------------------------------------------------
  // STORE PRODUCER
  // -----------------------------------------------------

  peer.producers.set(producer.id, producer);

  // -----------------------------------------------------
  // TRANSPORT CLOSED
  // -----------------------------------------------------

  producer.on("transportclose", () => {
    peer.producers.delete(producer.id);
  });

  // -----------------------------------------------------
  // PRODUCER CLOSED
  // -----------------------------------------------------

  producer.on("close", () => {
    peer.producers.delete(producer.id);
  });

  // -----------------------------------------------------
  // RETURN PRODUCER
  // -----------------------------------------------------

  return {
    id: producer.id,
    producerId: producer.id,
    kind: producer.kind,
  };
};

// =========================================================
// LIST EXISTING PRODUCERS
// =========================================================

export const getExistingProducers = ({ classId, socketId }) => {
  const room = getRoom(classId);

  if (!room) {
    return [];
  }

  const producers = [];

  for (const [peerSocketId, peer] of room.peers) {
    // ---------------------------------------------------
    // DON'T RETURN CURRENT USER'S PRODUCERS
    // ---------------------------------------------------

    if (peerSocketId === socketId) {
      continue;
    }

    for (const producer of peer.producers.values()) {
      if (producer.closed) {
        continue;
      }

      producers.push({
        producerId: producer.id,

        peerId: peer.socketId,

        user: {
          id: peer.userId,
          name: peer.name,
          role: peer.role,
        },

        kind: producer.kind,
      });
    }
  }

  return producers;
};

// =========================================================
// CREATE CONSUMER
// =========================================================

export const createConsumer = async ({
  classId,
  socketId,
  transportId,
  producerId,
  rtpCapabilities,
}) => {
  if (!producerId) {
    throw new Error("Producer ID is required");
  }

  if (!rtpCapabilities) {
    throw new Error("RTP capabilities are required");
  }

  // -----------------------------------------------------
  // GET ROOM
  // -----------------------------------------------------

  const room = getRoom(classId);

  if (!room) {
    throw new Error("Room not found");
  }

  // -----------------------------------------------------
  // GET PEER
  // -----------------------------------------------------

  const peer = getPeer(classId, socketId);

  if (!peer) {
    throw new Error("Peer not found");
  }

  // -----------------------------------------------------
  // GET RECEIVE TRANSPORT
  // -----------------------------------------------------

  const { transport } = getPeerTransport({
    classId,
    socketId,
    transportId,
  });

  // -----------------------------------------------------
  // CHECK CONSUMPTION
  // -----------------------------------------------------

  const canConsume = room.router.canConsume({
    producerId,
    rtpCapabilities,
  });

  if (!canConsume) {
    throw new Error("Cannot consume this producer");
  }

  // -----------------------------------------------------
  // CREATE CONSUMER
  // -----------------------------------------------------

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,

    paused: true,

    appData: {
      socketId,
    },
  });

  // -----------------------------------------------------
  // STORE CONSUMER
  // -----------------------------------------------------

  peer.consumers.set(consumer.id, consumer);

  // -----------------------------------------------------
  // TRANSPORT CLOSED
  // -----------------------------------------------------

  consumer.on("transportclose", () => {
    peer.consumers.delete(consumer.id);
  });

  // -----------------------------------------------------
  // PRODUCER CLOSED
  // -----------------------------------------------------

  consumer.on("producerclose", () => {
    peer.consumers.delete(consumer.id);
  });

  // -----------------------------------------------------
  // RETURN CONSUMER DATA
  // -----------------------------------------------------

  return {
    id: consumer.id,

    producerId: consumer.producerId,

    kind: consumer.kind,

    rtpParameters: consumer.rtpParameters,
  };
};

// =========================================================
// RESUME CONSUMER
// =========================================================

export const resumeConsumer = async ({ classId, socketId, consumerId }) => {
  if (!consumerId) {
    throw new Error("Consumer ID is required");
  }

  const peer = getPeer(classId, socketId);

  if (!peer) {
    throw new Error("Peer not found");
  }

  const consumer = peer.consumers.get(consumerId);

  if (!consumer) {
    throw new Error("Consumer not found");
  }

  await consumer.resume();

  return {
    resumed: true,
    consumerId,
  };
};

// =========================================================
// CLOSE PEER / LEAVE ROOM
// =========================================================

export const leaveRoom = ({ classId, socketId }) => {
  if (!classId || !socketId) {
    return;
  }

  removePeer(classId, socketId);
};
