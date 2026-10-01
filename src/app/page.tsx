'use client';

import React, { useState } from 'react';
import { Lobby } from '@/components/mahjong/Lobby';
import { Table } from '@/components/mahjong/Table';
import { getSocket } from '@/lib/socket';

export default function Home() {
  const [inGame, setInGame] = useState(false);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);

  const handleStartSolo = () => {
    setMultiplayerRoomId(null);
    setInGame(true);
  };

  const handleJoinRoom = ({ roomId, playerName }: { roomId: string; playerName: string; minFan: number }) => {
    setMultiplayerRoomId(roomId);
    try {
      const socket = getSocket();
      socket.connect();
      socket.emit('join_room', { roomId, playerName });
    } catch {
      console.warn('Socket server not reachable, fallback to room view');
    }
    setInGame(true);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {!inGame ? (
        <Lobby
          onStartSolo={handleStartSolo}
          onJoinRoom={handleJoinRoom}
        />
      ) : (
        <Table
          onBackToLobby={() => setInGame(false)}
        />
      )}
    </div>
  );
}
