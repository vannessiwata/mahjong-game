'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { WinResult, Player } from '@/lib/mahjong/types';
import { Tile } from './Tile';
import { sound } from '@/lib/mahjong/audio';
import { Trophy, RefreshCw, XCircle } from 'lucide-react';

interface WinningModalProps {
  winResult?: WinResult;
  isDraw?: boolean;
  players: Player[];
  onNextRound: () => void;
  onClose: () => void;
}

export const WinningModal: React.FC<WinningModalProps> = ({
  winResult,
  isDraw,
  players,
  onNextRound,
  onClose,
}) => {
  useEffect(() => {
    if (winResult) {
      sound.playWinFanfare();
      // Launch celebratory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899'],
      });
    }
  }, [winResult]);

  if (!winResult && !isDraw) return null;

  // Handle Draw / Liu Ju
  if (isDraw) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 border-2 border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
          <XCircle className="w-16 h-16 text-slate-400 mb-2" />
          <h2 className="text-2xl font-black text-white">Draw / Exhaustive Wall (流局)</h2>
          <p className="text-sm text-slate-300 mt-2">
            The wall has run out of tiles and no player declared a winning hand.
          </p>
          <button
            onClick={onNextRound}
            className="mt-6 px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Next Round (下一局)</span>
          </button>
        </div>
      </div>
    );
  }

  const winner = winResult ? players[winResult.winnerSeat] : null;
  const fromPlayer = winResult && winResult.fromSeat !== undefined ? players[winResult.fromSeat] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950 border-2 border-amber-500/80 max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 mb-3 border border-amber-300">
          <Trophy className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wide">
          {winResult?.isZimo ? 'ZIMO! (自摸食糊)' : 'HU! (食糊)'}
        </h2>

        <p className="text-sm text-amber-200/90 font-medium mt-1">
          Winner: <span className="font-bold text-white text-base">{winner?.name}</span>
          {winResult?.isZimo ? (
            <span className="text-emerald-400 font-bold ml-1.5">(Self-Draw)</span>
          ) : (
            <span className="text-red-400 ml-1.5">
              (Claimed from {fromPlayer?.name})
            </span>
          )}
        </p>

        {/* Winning Tile display */}
        {winResult && (
          <div className="flex flex-col items-center my-4">
            <span className="text-xs text-slate-300 font-medium mb-1.5">Winning Tile (糊牌):</span>
            <Tile tile={winResult.winningTile} size="lg" highlighted />
          </div>
        )}

        {/* Fan breakdown table */}
        <div className="w-full bg-slate-900/90 rounded-2xl border border-amber-500/30 p-3 sm:p-4 my-2 text-left">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex justify-between border-b border-slate-800 pb-1">
            <span>Fan Pattern (番種)</span>
            <span>Fan Points</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            {winResult?.fans.map((f, i) => (
              <div key={i} className="flex justify-between items-center text-xs text-slate-200">
                <span className="font-medium">
                  {f.name} <span className="text-slate-400 font-serif">({f.chinese})</span>
                </span>
                <span className="font-bold text-amber-300 font-mono">+{f.fan} Fan</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-800 font-bold text-sm">
            <span className="text-white">Total Fan (總番數):</span>
            <span className="text-amber-400 text-lg font-mono">{winResult?.totalFan} Fan</span>
          </div>
        </div>

        {/* Score Changes */}
        {winResult && (
          <div className="grid grid-cols-4 gap-2 w-full my-2 text-center">
            {players.map((p) => {
              const diff = winResult.scoreChange[p.seat] || 0;
              return (
                <div key={p.seat} className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-300'
                    }`}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onNextRound}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-lg shadow-emerald-700/30 transition hover:scale-105 flex items-center gap-2 border border-emerald-400/40"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Next Round (下一局)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Review Board
          </button>
        </div>
      </div>
    </div>
  );
};
