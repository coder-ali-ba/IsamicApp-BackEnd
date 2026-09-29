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

/* =========================================================
   CLASS STATUS
========================================================= */

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
    start.getTime() +
      Number(classItem.durationMinutes) * 60 * 1000
  );

  if (now >= start && now < end) {
    return "Live";
  }

  if (now < start) {
    return "Upcoming";
  }

  return "Completed";
};

/* =========================================================
   VERIFY CLASS ACCESS
========================================================= */

export const verifyClassAccess = async (classId, user) => {
  const classItem = await Class.findById(classId)
    .select(
      "_id title teacher scheduledAt durationMinutes status maxStudents"
    )
    .lean();

  if (!classItem) {
    throw new Error("Class not found");
  }

  const currentStatus = getClassStatus(classItem);

  if (currentStatus !== "Live") {
    throw new Error(
      `This class is not live. Current status: ${currentStatus}`
    );
  }

  const userId = user._id.toString();
  const teacherId = classItem.teacher.toString();

  /* Teacher / Scholar who owns the class */

  if (
    ["teacher", "scholar"].includes(user.role) &&
    userId === teacherId
  ) {
    return {
      classItem,
      access: "teacher",
    };
  }

  /* Student must be enrolled */

  if (user.role === "student") {
    const enrollment =
      await ClassEnrollment.findOne({
        class: classId,
        student: user._id,
        status: {
          $in: ["Registered", "Attended"],
        },
      }).lean();

    if (!enrollment) {
      throw new Error(
        "You must be enrolled in this class to join"
      );
    }

    return {
      classItem,
      access: "student",
    };
  }

  throw new Error(
    "You are not authorized to join this class"
  );
};

/* =========================================================
   JOIN ROOM
========================================================= */

export const joinRoom = async ({
  classId,
  socketId,
  user,
}) => {
  const access = await verifyClassAccess(
    classId,
    user
  );

  const room = await getOrCreateRoom(classId);

  let peer = getPeer(classId, socketId);

  if (!peer) {
    peer = createPeer(
      classId,
      socketId,
      user
    );
  }

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

  return {
    classId: String(classId),

    access: access.access,

    routerRtpCapabilities:
      getRouterRtpCapabilities(classId),

    participants: existingPeers,
  };
};

/* =========================================================
   CREATE TRANSPORT
========================================================= */

export const createTransport = async ({
  classId,
  socketId,
}) => {
  const peer = getPeer(classId, socketId);

  if (!peer) {
    throw new Error(
      "You must join the class first"
    );
  }

  const transport =
    await createWebRtcTransport(classId);

  peer.transports.set(
    transport.id,
    transport
  );

  return {
    id: transport.id,

    iceParameters:
      transport.iceParameters,

    iceCandidates:
      transport.iceCandidates,

    dtlsParameters:
      transport.dtlsParameters,

    sctpParameters:
      transport.sctpParameters,
  };
};

/* =========================================================
   GET TRANSPORT
========================================================= */

export const getPeerTransport = ({
  classId,
  socketId,
  transportId,
}) => {
  const peer = getPeer(classId, socketId);

  if (!peer) {
    throw new Error("Peer not found");
  }

  const transport =
    peer.transports.get(transportId);

  if (!transport) {
    throw new Error("Transport not found");
  }

  return {
    peer,
    transport,
  };
};

/* =========================================================
   CONNECT TRANSPORT
========================================================= */

export const connectTransport = async ({
  classId,
  socketId,
  transportId,
  dtlsParameters,
}) => {
  const { transport } =
    getPeerTransport({
      classId,
      socketId,
      transportId,
    });

  await transport.connect({
    dtlsParameters,
  });

  return {
    connected: true,
  };
};

/* =========================================================
   CREATE PRODUCER
========================================================= */

export const createProducer = async ({
  classId,
  socketId,
  transportId,
  kind,
  rtpParameters,
  appData,
}) => {
  const { peer, transport } =
    getPeerTransport({
      classId,
      socketId,
      transportId,
    });

  const producer =
    await transport.produce({
      kind,
      rtpParameters,
      appData: {
        ...(appData || {}),
        userId: peer.userId,
        socketId,
      },
    });

  peer.producers.set(
    producer.id,
    producer
  );

  producer.on("transportclose", () => {
    peer.producers.delete(
      producer.id
    );
  });

  producer.on("close", () => {
    peer.producers.delete(
      producer.id
    );
  });

  return {
    id: producer.id,
  };
};

/* =========================================================
   LIST EXISTING PRODUCERS
========================================================= */

export const getExistingProducers = ({
  classId,
  socketId,
}) => {
  const room = getRoom(classId);

  if (!room) {
    return [];
  }

  const producers = [];

  for (const [peerSocketId, peer] of room.peers) {
    if (peerSocketId === socketId) {
      continue;
    }

    for (const producer of peer.producers.values()) {
      if (producer.closed) {
        continue;
      }

      producers.push({
        producerId: producer.id,
        socketId: peer.socketId,
        userId: peer.userId,
        name: peer.name,
        role: peer.role,
        kind: producer.kind,
      });
    }
  }

  return producers;
};

/* =========================================================
   CREATE CONSUMER
========================================================= */

export const createConsumer = async ({
  classId,
  socketId,
  transportId,
  producerId,
  rtpCapabilities,
}) => {
  const room = getRoom(classId);

  if (!room) {
    throw new Error("Room not found");
  }

  const peer = getPeer(
    classId,
    socketId
  );

  if (!peer) {
    throw new Error("Peer not found");
  }

  const { transport } =
    getPeerTransport({
      classId,
      socketId,
      transportId,
    });

  if (
    !room.router.canConsume({
      producerId,
      rtpCapabilities,
    })
  ) {
    throw new Error(
      "Cannot consume this producer"
    );
  }

  const consumer =
    await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
      appData: {
        socketId,
      },
    });

  peer.consumers.set(
    consumer.id,
    consumer
  );

  consumer.on("transportclose", () => {
    peer.consumers.delete(
      consumer.id
    );
  });

  consumer.on("producerclose", () => {
    peer.consumers.delete(
      consumer.id
    );
  });

  return {
    id: consumer.id,
    producerId: consumer.producerId,
    kind: consumer.kind,
    rtpParameters:
      consumer.rtpParameters,
  };
};

/* =========================================================
   RESUME CONSUMER
========================================================= */

export const resumeConsumer = async ({
  classId,
  socketId,
  consumerId,
}) => {
  const peer = getPeer(
    classId,
    socketId
  );

  if (!peer) {
    throw new Error("Peer not found");
  }

  const consumer =
    peer.consumers.get(
      consumerId
    );

  if (!consumer) {
    throw new Error(
      "Consumer not found"
    );
  }

  await consumer.resume();

  return {
    resumed: true,
  };
};

/* =========================================================
   CLOSE PEER
========================================================= */

export const leaveRoom = ({
  classId,
  socketId,
}) => {
  removePeer(
    classId,
    socketId
  );
};