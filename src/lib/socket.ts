'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket && typeof window !== 'undefined') {
    // In production, connect to the external Socket.IO server (Railway).
    // In development, fallback to same host (server.js runs alongside Next.js).
    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    socket = io(serverUrl, {
      autoConnect: false,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });
  }
  return socket!;
}
