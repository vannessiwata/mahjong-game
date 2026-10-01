'use client';

import React, { useState } from 'react';
import { Lobby } from '@/components/mahjong/Lobby';
import { Table } from '@/components/mahjong/Table';
import { getSocket } from '@/lib/socket';

export default function Home() {
  const [inGame, setInGame] = useState(false);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('Player');

  const handleStartSolo = (options: { playerName: string; minFan: number; includeFlowers: boolean }) => {
    setPlayerName(options.playerName || 'Player');
    setMultiplayerRoomId(null);
    setInGame(true);
  };

  const handleJoinRoom = ({ roomId, playerName: name }: { roomId: string; playerName: string; minFan: number }) => {
    setPlayerName(name || 'Player');
    setMultiplayerRoomId(roomId);
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
          roomId={multiplayerRoomId}
          playerName={playerName}
          onBackToLobby={() => setInGame(false)}
        />
      )}
    </div>
  );
}
