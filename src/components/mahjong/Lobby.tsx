'use client';

import React, { useState } from 'react';
import { Users, Bot, Play, Sparkles, BookOpen, Settings, RefreshCw, Copy, Check } from 'lucide-react';
import { RulesModal } from './RulesModal';

interface LobbyProps {
  onStartSolo: (options: { playerName: string; minFan: number; includeFlowers: boolean }) => void;
  onJoinRoom: (options: { roomId: string; playerName: string; minFan: number }) => void;
}

// Generate random 5-character alphanumeric room code (e.g. "HK88M", "MAH77")
const generateRandomRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const Lobby: React.FC<LobbyProps> = ({ onStartSolo, onJoinRoom }) => {
  const [mode, setMode] = useState<'solo' | 'multiplayer'>('solo');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState(generateRandomRoomCode());
  const [minFan, setMinFan] = useState<number>(3);
  const [includeFlowers, setIncludeFlowers] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRandomizeRoom = () => {
    setRoomId(generateRandomRoomCode());
  };

  const handleCopyRoomCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleStart = () => {
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setErrorMessage('⚠️ Silakan masukkan nama pemain terlebih dahulu (Nama wajib diisi)!');
      return;
    }

    if (mode === 'multiplayer') {
      const trimmedRoom = roomId.trim().toUpperCase();
      if (!trimmedRoom) {
        setErrorMessage('⚠️ Room code tidak boleh kosong!');
        return;
      }
      setErrorMessage(null);
      onJoinRoom({ roomId: trimmedRoom, playerName: trimmedName, minFan });
    } else {
      setErrorMessage(null);
      onStartSolo({ playerName: trimmedName, minFan, includeFlowers });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <div className="relative z-10 flex flex-col items-center text-center mb-6">
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
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-5">
        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setMode('solo');
              setErrorMessage(null);
            }}
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
            onClick={() => {
              setMode('multiplayer');
              setErrorMessage(null);
            }}
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

        {/* Error message alert */}
        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 font-medium text-left animate-shake">
            {errorMessage}
          </div>
        )}

        {/* Inputs */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Player Name (Wajib) */}
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold flex items-center gap-1">
                <span>Nama Pemain</span>
                <span className="text-red-400">*</span>
              </label>
              <span className="text-[10px] text-amber-400 font-semibold">(Wajib diisi)</span>
            </div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition"
              placeholder="Masukkan nama Anda (misal: DragonKing)"
              maxLength={15}
              required
            />
          </div>

          {/* Multiplayer Room Code Input */}
          {mode === 'multiplayer' && (
            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-bold">Room Code (Kode Room):</label>
                <button
                  type="button"
                  onClick={handleRandomizeRoom}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition"
                  title="Generate Room Code Baru"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Acak Kode Baru</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-mono font-bold tracking-widest uppercase focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition text-base text-center"
                  placeholder="KODE"
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center justify-center gap-1"
                  title="Salin Kode Room"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                Bagikan kode ini ke teman Anda agar mereka bisa masuk ke room meja yang sama, atau ketik kode room teman Anda.
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
          <span>{mode === 'solo' ? 'Start Solo Game (開始遊戲)' : 'Masuk / Buat Room (進入房間)'}</span>
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
