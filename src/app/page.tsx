'use client';

import React, { useState } from 'react';
import { Lobby } from '@/components/mahjong/Lobby';
import { Table } from '@/components/mahjong/Table';
import { getSocket } from '@/lib/socket';

export default function Home() {
  const [inGame, setInGame] = useState(false);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('Player');
  const [gameMinFan, setGameMinFan] = useState<number>(0);

  const handleStartSolo = (options: { playerName: string; minFan: number; includeFlowers: boolean }) => {
    setPlayerName(options.playerName || 'Player');
    setGameMinFan(options.minFan ?? 0);
    setMultiplayerRoomId(null);
    setInGame(true);
  };

  const handleJoinRoom = ({ roomId, playerName: name, minFan }: { roomId: string; playerName: string; minFan: number }) => {
    setPlayerName(name || 'Player');
    setGameMinFan(minFan ?? 0);
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
          minFan={gameMinFan}
          onBackToLobby={() => setInGame(false)}
        />
      )}
    </div>
  );
}
