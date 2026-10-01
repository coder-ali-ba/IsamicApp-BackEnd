import mediasoup from "mediasoup";

let worker = null;

const rooms = new Map();

// =========================================================
// MEDIA CODECS
// =========================================================

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

// =========================================================
// WORKER SETTINGS
// =========================================================

const WORKER_SETTINGS = {
  rtcMinPort: Number(
    process.env.MEDIASOUP_MIN_PORT || 40000
  ),

  rtcMaxPort: Number(
    process.env.MEDIASOUP_MAX_PORT || 40100
  ),

  logLevel:
    process.env.MEDIASOUP_LOG_LEVEL || "warn",
};

// =========================================================
// LISTEN INFOS
// =========================================================

const getListenInfos = () => {
  const listenIp =
    process.env.MEDIASOUP_LISTEN_IP?.trim() ||
    "127.0.0.1";

  const announcedAddress =
    process.env.MEDIASOUP_ANNOUNCED_IP?.trim() ||
    "";

  const listenInfos = [
    {
      protocol: "udp",
      ip: listenIp,
    },
    {
      protocol: "tcp",
      ip: listenIp,
    },
  ];

  if (announcedAddress) {
    listenInfos[0].announcedAddress =
      announcedAddress;

    listenInfos[1].announcedAddress =
      announcedAddress;
  }

  return listenInfos;
};

// =========================================================
// WORKER
// =========================================================

export const initializeMediasoup = async () => {
  if (worker) {
    return worker;
  }

  worker = await mediasoup.createWorker(
    WORKER_SETTINGS
  );

  worker.on("died", (error) => {
    console.error(
      "❌ mediasoup worker died:",
      error
    );

    worker = null;

    setTimeout(() => {
      initializeMediasoup().catch(
        (restartError) => {
          console.error(
            "❌ Failed to restart mediasoup worker:",
            restartError
          );
        }
      );
    }, 2000);
  });

  console.log(
    `✅ mediasoup worker started [pid:${worker.pid}]`
  );

  console.log(
    `📡 mediasoup RTC ports: ${WORKER_SETTINGS.rtcMinPort}-${WORKER_SETTINGS.rtcMaxPort}`
  );

  console.log(
    "🌐 mediasoup listen infos:",
    getListenInfos()
  );

  return worker;
};

// =========================================================
// ROOM
// =========================================================

export const getOrCreateRoom = async (
  classId
) => {
  if (!worker) {
    await initializeMediasoup();
  }

  const roomKey = String(classId);

  let room = rooms.get(roomKey);

  if (
    room &&
    !room.router.closed
  ) {
    return room;
  }

  const router =
    await worker.createRouter({
      mediaCodecs,
    });

  room = {
    classId: roomKey,

    router,

    peers: new Map(),

    createdAt: new Date(),
  };

  router.on(
    "workerclose",
    () => {
      rooms.delete(roomKey);
    }
  );

  router.observer.on(
    "close",
    () => {
      rooms.delete(roomKey);
    }
  );

  rooms.set(
    roomKey,
    room
  );

  console.log(
    `🎥 SFU room created [class:${classId}]`
  );

  return room;
};

export const getRoom = (
  classId
) => {
  return rooms.get(
    String(classId)
  );
};

export const removeRoomIfEmpty = (
  classId
) => {
  const room = rooms.get(
    String(classId)
  );

  if (!room) {
    return;
  }

  if (
    room.peers.size === 0
  ) {
    if (
      !room.router.closed
    ) {
      room.router.close();
    }

    rooms.delete(
      String(classId)
    );

    console.log(
      `🧹 SFU room removed [class:${classId}]`
    );
  }
};

// =========================================================
// PEER
// =========================================================

export const createPeer = (
  classId,
  socketId,
  user
) => {
  const room =
    getRoom(classId);

  if (!room) {
    throw new Error(
      "SFU room not found"
    );
  }

  const peer = {
    id: socketId,

    socketId,

    userId:
      user._id.toString(),

    name:
      user.name,

    role:
      user.role,

    transports:
      new Map(),

    producers:
      new Map(),

    consumers:
      new Map(),

    joinedAt:
      new Date(),
  };

  room.peers.set(
    socketId,
    peer
  );

  return peer;
};

export const getPeer = (
  classId,
  socketId
) => {
  const room =
    getRoom(classId);

  if (!room) {
    return null;
  }

  return (
    room.peers.get(
      socketId
    ) || null
  );
};

export const removePeer = (
  classId,
  socketId
) => {
  const room =
    getRoom(classId);

  if (!room) {
    return;
  }

  const peer =
    room.peers.get(socketId);

  if (!peer) {
    return;
  }

  // -------------------------------------------------------
  // CLOSE CONSUMERS
  // -------------------------------------------------------

  for (
    const consumer of
    peer.consumers.values()
  ) {
    try {
      if (!consumer.closed) {
        consumer.close();
      }
    } catch {}
  }

  // -------------------------------------------------------
  // CLOSE PRODUCERS
  // -------------------------------------------------------

  for (
    const producer of
    peer.producers.values()
  ) {
    try {
      if (!producer.closed) {
        producer.close();
      }
    } catch {}
  }

  // -------------------------------------------------------
  // CLOSE TRANSPORTS
  // -------------------------------------------------------

  for (
    const transport of
    peer.transports.values()
  ) {
    try {
      if (!transport.closed) {
        transport.close();
      }
    } catch {}
  }

  room.peers.delete(
    socketId
  );

  removeRoomIfEmpty(
    classId
  );
};

// =========================================================
// WEBRTC TRANSPORT
// =========================================================

export const createWebRtcTransport =
  async (classId) => {
    const room =
      getRoom(classId);

    if (!room) {
      throw new Error(
        "SFU room not found"
      );
    }

    const listenInfos =
      getListenInfos();

    console.log(
      `🚚 Creating WebRTC transport [class:${classId}]`
    );

    console.log(
      "📡 Transport listen infos:",
      listenInfos
    );

    const transport =
      await room.router.createWebRtcTransport(
        {
          listenInfos,

          enableUdp: true,

          enableTcp: true,

          preferUdp: true,

          preferTcp: false,

          initialAvailableOutgoingBitrate:
            1000000,

          enableSctp: true,

          numSctpStreams: {
            OS: 1024,
            MIS: 1024,
          },

          appData: {
            classId:
              String(classId),
          },
        }
      );

    // -----------------------------------------------------
    // ICE STATE
    // -----------------------------------------------------

    transport.on(
      "icestatechange",
      (state) => {
        console.log(
          `🧊 ICE state [transport:${transport.id}]: ${state}`
        );
      }
    );

    // -----------------------------------------------------
    // DTLS STATE
    // -----------------------------------------------------

    transport.on(
      "dtlsstatechange",
      (state) => {
        console.log(
          `🔐 DTLS state [transport:${transport.id}]: ${state}`
        );

        if (
          state === "failed" ||
          state === "closed"
        ) {
          console.error(
            `❌ DTLS failed/closed [transport:${transport.id}]`
          );
        }

        if (
          state === "closed" &&
          !transport.closed
        ) {
          transport.close();
        }
      }
    );

    // -----------------------------------------------------
    // SCTP STATE
    // -----------------------------------------------------

    transport.on(
      "sctpstatechange",
      (state) => {
        console.log(
          `📦 SCTP state [transport:${transport.id}]: ${state}`
        );
      }
    );

    // -----------------------------------------------------
    // CLOSE
    // -----------------------------------------------------

    transport.observer.on(
      "close",
      () => {
        console.log(
          `🔴 WebRTC transport closed [transport:${transport.id}]`
        );
      }
    );

    // -----------------------------------------------------
    // IMPORTANT TRANSPORT INFORMATION
    // -----------------------------------------------------

    console.log(
      `✅ WebRTC transport created [transport:${transport.id}]`
    );

    console.log(
      "   ICE parameters:",
      transport.iceParameters
    );

    console.log(
      "   ICE candidates:",
      transport.iceCandidates
    );

    console.log(
      "   DTLS parameters:",
      transport.dtlsParameters
    );

    return transport;
  };

// =========================================================
// PUBLIC ROOM STATS
// =========================================================

export const getRoomStats = (
  classId
) => {
  const room =
    getRoom(classId);

  if (!room) {
    return {
      exists: false,
      participants: 0,
    };
  }

  return {
    exists: true,

    participants:
      room.peers.size,

    producers:
      [
        ...room.peers.values(),
      ].reduce(
        (total, peer) =>
          total +
          peer.producers.size,
        0
      ),

    consumers:
      [
        ...room.peers.values(),
      ].reduce(
        (total, peer) =>
          total +
          peer.consumers.size,
        0
      ),
  };
};

// =========================================================
// ROUTER RTP CAPABILITIES
// =========================================================

export const getRouterRtpCapabilities = (
  classId
) => {
  const room =
    getRoom(classId);

  if (!room) {
    throw new Error(
      "SFU room not found"
    );
  }

  return room.router
    .rtpCapabilities;
};