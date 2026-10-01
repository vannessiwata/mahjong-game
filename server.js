/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room manager for multiplayer games
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: [
        { id: null, name: 'Empty Seat 1', seat: 0, isBot: false, isReady: false },
        { id: null, name: 'Empty Seat 2', seat: 1, isBot: true, isReady: true },
        { id: null, name: 'Empty Seat 3', seat: 2, isBot: true, isReady: true },
        { id: null, name: 'Empty Seat 4', seat: 3, isBot: true, isReady: true },
      ],
      gameState: null,
    });
  }
  return rooms.get(roomId);
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
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

      // Find an available seat
      let assignedSeat = room.players.findIndex((p) => p.id === socket.id);
      if (assignedSeat === -1) {
        assignedSeat = room.players.findIndex((p) => p.id === null);
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

      console.log(`[Room ${roomId}] Player ${playerName} joined seat ${assignedSeat}`);
    });

    // Synchronize game action across players in room
    socket.on('game_action', ({ roomId, actionType, payload }) => {
      // Broadcast action to other players in the room
      socket.to(roomId).emit('peer_game_action', {
        fromSocket: socket.id,
        actionType,
        payload,
      });
    });

    // Chat message in room
    socket.on('send_chat', ({ roomId, sender, message }) => {
      io.to(roomId).emit('receive_chat', {
        sender,
        message,
        time: new Date().toLocaleTimeString(),
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          // Replace disconnected player with bot so match can continue
          room.players[playerIndex] = {
            id: null,
            name: `Bot ${playerIndex + 1}`,
            seat: playerIndex,
            isBot: true,
            isReady: true,
          };
          io.to(roomId).emit('room_updated', { players: room.players });
        }
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Hong Kong Mahjong Server ready on http://${hostname}:${port}`);
  });
});
