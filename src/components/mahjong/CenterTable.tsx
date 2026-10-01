'use client';

import React from 'react';
import { SeatWind } from '@/lib/mahjong/types';
import { Layers, Compass, Clock } from 'lucide-react';

interface CenterTableProps {
  wallCount: number;
  currentTurn: number;
  dealerSeat: number;
  roundWind: SeatWind;
  localPlayerSeat: number;
  timeLeft?: number;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  wallCount,
  currentTurn,
  dealerSeat,
  roundWind,
  localPlayerSeat,
  timeLeft = 120,
}) => {
  const windChars = ['東', '南', '西', '北'];
  const windNames: Record<SeatWind, string> = {
    east: '東風圈',
    south: '南風圈',
    west: '西風圈',
    north: '北風圈',
  };

  // Convert currentTurn to relative position from local player's perspective:
  // 0: Bottom (Local player / You)
  // 1: Right (Right opponent)
  // 2: Top (Top opponent)
  // 3: Left (Left opponent)
  const relTurn = (currentTurn - localPlayerSeat + 4) % 4;
  const isMyTurn = relTurn === 0;

  // Format countdown mm:ss
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = timeLeft <= 20;

  return (
    <div className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-xl sm:rounded-2xl bg-slate-950/95 border border-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between p-1.5 sm:p-2.5 backdrop-blur-md select-none">
      {/* ---------------------------------------------------- */}
      {/* 4 OUTER DIRECTION BEACONS (NO OVERLAPPING NEEDLE)   */}
      {/* ---------------------------------------------------- */}

      {/* TOP BEACON (relTurn === 2) */}
      <div
        className={`absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full flex items-center justify-center transition-all duration-300 ${
          relTurn === 2
            ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110 ring-2 ring-amber-300'
            : 'bg-slate-800/80 text-slate-500'
        }`}
      >
        <span className="text-[9px] font-black leading-none">▲</span>
      </div>

      {/* BOTTOM BEACON (relTurn === 0 / You) */}
      <div
        className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full flex items-center justify-center transition-all duration-300 ${
          relTurn === 0
            ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110 ring-2 ring-amber-300'
            : 'bg-slate-800/80 text-slate-500'
        }`}
      >
        <span className="text-[9px] font-black leading-none">▼</span>
      </div>

      {/* LEFT BEACON (relTurn === 3) */}
      <div
        className={`absolute -left-1.5 top-1/2 -translate-y-1/2 py-2 px-0.5 rounded-full flex items-center justify-center transition-all duration-300 ${
          relTurn === 3
            ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110 ring-2 ring-amber-300'
            : 'bg-slate-800/80 text-slate-500'
        }`}
      >
        <span className="text-[9px] font-black leading-none">◀</span>
      </div>

      {/* RIGHT BEACON (relTurn === 1) */}
      <div
        className={`absolute -right-1.5 top-1/2 -translate-y-1/2 py-2 px-0.5 rounded-full flex items-center justify-center transition-all duration-300 ${
          relTurn === 1
            ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110 ring-2 ring-amber-300'
            : 'bg-slate-800/80 text-slate-500'
        }`}
      >
        <span className="text-[9px] font-black leading-none">▶</span>
      </div>

      {/* ---------------------------------------------------- */}
      {/* INSIDE HUD CONTENT - NEAT, CLEAN, UNCLUTTERED       */}
      {/* ---------------------------------------------------- */}

      {/* Top Header: Round Wind & Dealer Marker */}
      <div className="w-full flex items-center justify-between px-1">
        {/* Round Wind */}
        <div className="flex items-center gap-1 text-amber-300 text-[11px] font-bold">
          <Compass className="w-3 h-3 text-amber-400" />
          <span>{windNames[roundWind] || '東風圈'}</span>
        </div>

        {/* Dealer Marker (莊) */}
        <div className="text-[10px] bg-red-950/90 text-amber-200 px-1.5 py-0.2 rounded font-bold border border-red-500/50 shadow-sm">
          莊: {windChars[dealerSeat]}
        </div>
      </div>

      {/* Center: Remaining Wall Counter & 2-Minute Turn Timer */}
      <div className="my-auto flex flex-col items-center gap-0.5 sm:gap-1">
        {/* Tile Counter */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-950/80 px-1.5 sm:px-2.5 py-0.5 rounded-md border border-emerald-600/40 text-emerald-300 text-[10px] sm:text-xs font-mono font-bold shadow-inner">
          <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
          <span>{wallCount}</span>
        </div>

        {/* Turn Countdown Timer */}
        <div
          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold transition-all ${
            isUrgent
              ? 'bg-red-950/95 text-red-400 border border-red-500/80 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : 'bg-slate-900/90 text-slate-300 border border-slate-700/60'
          }`}
          title="Batas waktu giliran (2 menit)"
        >
          <Clock className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${isUrgent ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Bottom Footer: Turn status badge */}
      <div className="w-full flex justify-center">
        {isMyTurn ? (
          <div className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9.5px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md animate-pulse whitespace-nowrap">
            ▶ <span className="hidden sm:inline">GILIRAN ANDA</span><span className="sm:hidden">ANDA</span> ({windChars[currentTurn]})
          </div>
        ) : (
          <div className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9.5px] font-semibold bg-slate-900 border border-slate-700/80 text-slate-300 whitespace-nowrap">
            <span className="hidden sm:inline">Giliran: </span><span className="text-amber-400 font-bold">{windChars[currentTurn]}</span>
          </div>
        )}
      </div>
    </div>
  );
};
