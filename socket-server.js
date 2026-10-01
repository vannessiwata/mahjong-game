const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = parseInt(process.env.PORT || '4000', 10);

// In-memory room manager for multiplayer games
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: [
        { id: null, name: 'Empty Seat 1', seat: 0, isBot: false, isReady: false },
        { id: null, name: 'Bot South', seat: 1, isBot: true, isReady: true },
        { id: null, name: 'Bot West', seat: 2, isBot: true, isReady: true },
        { id: null, name: 'Bot North', seat: 3, isBot: true, isReady: true },
      ],
    });
  }
  return rooms.get(roomId);
}

const server = createServer((req, res) => {
  // Simple health check endpoint
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Join room
  socket.on('join_room', ({ roomId, playerName }) => {
    const room = getOrCreateRoom(roomId);
    socket.join(roomId);

    // Find available seat (first empty seat, or replace an existing bot)
    let assignedSeat = room.players.findIndex((p) => p.id === socket.id);
    if (assignedSeat === -1) {
      assignedSeat = room.players.findIndex((p) => p.id === null);
    }
    if (assignedSeat === -1) {
      assignedSeat = room.players.findIndex((p) => p.isBot);
    }

    if (assignedSeat !== -1) {
      room.players[assignedSeat] = {
        id: socket.id,
        name: playerName || `Player ${assignedSeat + 1}`,
        seat: assignedSeat,
        isBot: false,
        isReady: true,
      };
    }

    socket.emit('joined_room', {
      roomId,
      seat: assignedSeat,
      roomPlayers: room.players,
    });

    io.to(roomId).emit('room_updated', {
      players: room.players,
    });

    console.log(`[Room ${roomId}] Player "${playerName}" joined seat ${assignedSeat}`);
  });

  // Sync game action to other players in same room
  socket.on('game_action', ({ roomId, actionType, payload }) => {
    socket.to(roomId).emit('peer_game_action', {
      fromSocket: socket.id,
      actionType,
      payload,
    });
  });

  // Chat message
  socket.on('send_chat', ({ roomId, sender, message }) => {
    io.to(roomId).emit('receive_chat', {
      sender,
      message,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    for (const [roomId, room] of rooms.entries()) {
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        room.players[idx] = {
          id: null,
          name: `Bot ${idx + 1}`,
          seat: idx,
          isBot: true,
          isReady: true,
        };
        io.to(roomId).emit('room_updated', { players: room.players });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`> Socket.IO server running on port ${PORT}`);
});
