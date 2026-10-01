'use client';

import React, { useState } from 'react';
import { Users, Bot, Play, Sparkles, BookOpen, Settings } from 'lucide-react';
import { RulesModal } from './RulesModal';

interface LobbyProps {
  onStartSolo: (options: { playerName: string; minFan: number; includeFlowers: boolean }) => void;
  onJoinRoom: (options: { roomId: string; playerName: string; minFan: number }) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStartSolo, onJoinRoom }) => {
  const [mode, setMode] = useState<'solo' | 'multiplayer'>('solo');
  const [playerName, setPlayerName] = useState('Player 1');
  const [roomId, setRoomId] = useState('ROOM88');
  const [minFan, setMinFan] = useState<number>(3);
  const [includeFlowers, setIncludeFlowers] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const handleStart = () => {
    if (mode === 'solo') {
      onStartSolo({ playerName, minFan, includeFlowers });
    } else {
      onJoinRoom({ roomId, playerName, minFan });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <div className="relative z-10 flex flex-col items-center text-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-5xl animate-bounce-subtle">🀄</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-500 tracking-wider">
          HONG KONG MAHJONG
        </h1>
        <p className="text-sm sm:text-base text-emerald-400 font-serif font-bold mt-1 tracking-widest">
          香港麻雀 • 傳統十三張規則
        </p>
        <span className="text-xs text-slate-400 mt-1 max-w-sm">
          Authentic 4-Player Hong Kong Mahjong with AI bots, turn-based claims, real-time fan scoring, and online rooms.
        </span>
      </div>

      {/* Main Mode Selection Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setMode('solo')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition ${
              mode === 'solo'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Solo vs 3 Bots</span>
          </button>
          <button
            onClick={() => setMode('multiplayer')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition ${
              mode === 'multiplayer'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Online Room</span>
          </button>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Player Name */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-slate-300 font-bold">Your Player Name:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-amber-400 outline-none transition"
              placeholder="e.g. Master Mahjong"
              maxLength={15}
            />
          </div>

          {/* Multiplayer Room Code Input */}
          {mode === 'multiplayer' && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-slate-300 font-bold">Room Code (房間號碼):</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-mono font-bold tracking-widest uppercase focus:border-amber-400 outline-none transition"
                placeholder="ROOM88"
                maxLength={8}
              />
              <span className="text-[10px] text-slate-400">
                Share this room code with friends to let them join your table.
              </span>
            </div>
          )}

          {/* Rules Configuration */}
          <div className="flex flex-col gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Settings className="w-3.5 h-3.5" />
              <span>Match Settings</span>
            </div>

            {/* Min Fan selector */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-300">Minimum Fan to Win (起糊番數):</span>
              <div className="flex gap-1.5">
                {[0, 3].map((f) => (
                  <button
                    key={f}
                    onClick={() => setMinFan(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      minFan === f
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 0 ? '0 Fan (雞糊)' : '3 Fan (正宗)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Flowers toggle */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-300">Include Flower & Season Tiles:</span>
              <button
                onClick={() => setIncludeFlowers(!includeFlowers)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  includeFlowers
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {includeFlowers ? '144 Tiles' : '136 Tiles'}
              </button>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-2xl font-black text-white text-base bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 shadow-xl shadow-amber-600/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border border-amber-300/40"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>{mode === 'solo' ? 'Start Solo Game (開始遊戲)' : 'Enter Room (進入房間)'}</span>
        </button>

        {/* Guide button */}
        <button
          onClick={() => setShowRules(true)}
          className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>How to Play & Fan Scoring Guide (胡牌規則)</span>
        </button>
      </div>

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
};
