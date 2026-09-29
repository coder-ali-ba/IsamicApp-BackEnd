import mediasoup from "mediasoup";

let worker = null;

const rooms = new Map();

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {},
  },
];

const WORKER_SETTINGS = {
  rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT || 40000),
  rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT || 40100),
  logLevel: process.env.MEDIASOUP_LOG_LEVEL || "warn",
};

const getListenInfos = () => {
  const listenIp =
    process.env.MEDIASOUP_LISTEN_IP || "127.0.0.1";

  const announcedAddress =
    process.env.MEDIASOUP_ANNOUNCED_IP || "";

  const info = {
    protocol: "udp",
    ip: listenIp,
  };

  if (announcedAddress) {
    info.announcedAddress = announcedAddress;
  }

  return [info];
};

/* =========================================================
   WORKER
========================================================= */

export const initializeMediasoup = async () => {
  if (worker) {
    return worker;
  }

  worker = await mediasoup.createWorker(WORKER_SETTINGS);

  worker.on("died", (error) => {
    console.error("❌ mediasoup worker died:", error);

    worker = null;

    setTimeout(() => {
      initializeMediasoup().catch((restartError) => {
        console.error(
          "❌ Failed to restart mediasoup worker:",
          restartError
        );
      });
    }, 2000);
  });

  console.log(
    `✅ mediasoup worker started [pid:${worker.pid}]`
  );

  return worker;
};

/* =========================================================
   ROOM
========================================================= */

export const getOrCreateRoom = async (classId) => {
  if (!worker) {
    await initializeMediasoup();
  }

  let room = rooms.get(String(classId));

  if (room && !room.router.closed) {
    return room;
  }

  const router = await worker.createRouter({
    mediaCodecs,
  });

  room = {
    classId: String(classId),
    router,
    peers: new Map(),
    createdAt: new Date(),
  };

  router.on("workerclose", () => {
    rooms.delete(String(classId));
  });

  router.observer.on("close", () => {
    rooms.delete(String(classId));
  });

  rooms.set(String(classId), room);

  console.log(
    `🎥 SFU room created [class:${classId}]`
  );

  return room;
};

export const getRoom = (classId) => {
  return rooms.get(String(classId));
};

export const removeRoomIfEmpty = (classId) => {
  const room = rooms.get(String(classId));

  if (!room) {
    return;
  }

  if (room.peers.size === 0) {
    if (!room.router.closed) {
      room.router.close();
    }

    rooms.delete(String(classId));

    console.log(
      `🧹 SFU room removed [class:${classId}]`
    );
  }
};

/* =========================================================
   PEER
========================================================= */

export const createPeer = (classId, socketId, user) => {
  const room = getRoom(classId);

  if (!room) {
    throw new Error("SFU room not found");
  }

  const peer = {
    socketId,
    userId: user._id.toString(),
    name: user.name,
    role: user.role,

    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),

    joinedAt: new Date(),
  };

  room.peers.set(socketId, peer);

  return peer;
};

export const getPeer = (classId, socketId) => {
  const room = getRoom(classId);

  if (!room) {
    return null;
  }

  return room.peers.get(socketId) || null;
};

export const removePeer = (classId, socketId) => {
  const room = getRoom(classId);

  if (!room) {
    return;
  }

  const peer = room.peers.get(socketId);

  if (!peer) {
    return;
  }

  for (const consumer of peer.consumers.values()) {
    if (!consumer.closed) {
      consumer.close();
    }
  }

  for (const producer of peer.producers.values()) {
    if (!producer.closed) {
      producer.close();
    }
  }

  for (const transport of peer.transports.values()) {
    if (!transport.closed) {
      transport.close();
    }
  }

  room.peers.delete(socketId);

  removeRoomIfEmpty(classId);
};

/* =========================================================
   TRANSPORT
========================================================= */

export const createWebRtcTransport = async (classId) => {
  const room = getRoom(classId);

  if (!room) {
    throw new Error("SFU room not found");
  }

  const transport = await room.router.createWebRtcTransport({
    listenInfos: getListenInfos(),

    enableUdp: true,
    enableTcp: true,
    preferUdp: true,

    initialAvailableOutgoingBitrate: 1000000,

    enableSctp: true,
    numSctpStreams: {
      OS: 1024,
      MIS: 1024,
    },

    appData: {
      classId: String(classId),
    },
  });

  transport.on("dtlsstatechange", (state) => {
    if (state === "closed") {
      if (!transport.closed) {
        transport.close();
      }
    }
  });

  transport.on("icestatechange", (state) => {
    console.log(
      `ICE state [transport:${transport.id}]: ${state}`
    );
  });

  return transport;
};

/* =========================================================
   PUBLIC
========================================================= */

export const getRoomStats = (classId) => {
  const room = getRoom(classId);

  if (!room) {
    return {
      exists: false,
      participants: 0,
    };
  }

  return {
    exists: true,
    participants: room.peers.size,
    producers: [...room.peers.values()].reduce(
      (total, peer) => total + peer.producers.size,
      0
    ),
    consumers: [...room.peers.values()].reduce(
      (total, peer) => total + peer.consumers.size,
      0
    ),
  };
};

export const getRouterRtpCapabilities = (classId) => {
  const room = getRoom(classId);

  if (!room) {
    throw new Error("SFU room not found");
  }

  return room.router.rtpCapabilities;
};