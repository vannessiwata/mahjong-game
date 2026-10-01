'use client';

import React from 'react';
import { Player } from '@/lib/mahjong/types';
import { Tile } from './Tile';
import { Bot, User } from 'lucide-react';

interface OpponentHandProps {
  player: Player;
  position: 'top' | 'left' | 'right';
  isTurn: boolean;
  statusText?: string;
}

export const OpponentHand: React.FC<OpponentHandProps> = ({
  player,
  position,
  isTurn,
  statusText,
}) => {
  const windChars = ['東', '南', '西', '北'];
  const windLabels = ['East', 'South', 'West', 'North'];

  // Status banner / bubble
  const statusBubble = statusText ? (
    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce whitespace-nowrap z-20">
      {statusText}
    </div>
  ) : null;

  // Player info badge
  const playerInfo = (
    <div
      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border backdrop-blur-md transition-all shadow-md ${
        isTurn
          ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 ring-2 ring-amber-400/40'
          : 'bg-slate-950/60 border-slate-700/60 text-slate-300'
      }`}
    >
      <div className="relative">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-800 to-teal-600 flex items-center justify-center font-bold text-white shadow-inner">
          {player.isBot ? <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-200" /> : <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
        </div>
        <span className="absolute -bottom-1 -right-1 text-[8px] sm:text-[10px] bg-slate-900 border border-amber-500 text-amber-400 rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center font-bold">
          {windChars[player.seat]}
        </span>
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1 leading-none">
          <span className="font-semibold text-[10px] sm:text-xs text-white truncate max-w-[50px] sm:max-w-[90px]">
            {player.name}
          </span>
          {player.isBot && (
            <span className="hidden sm:inline text-[9px] bg-emerald-900/80 text-emerald-300 px-1 rounded border border-emerald-600/40">
              BOT
            </span>
          )}
        </div>
        <span className="text-[9px] sm:text-[10px] text-amber-400/90 font-mono mt-0.5">
          {player.score.toLocaleString()} pts
        </span>
      </div>
    </div>
  );

  // TOP OPPONENT (North)
  if (position === 'top') {
    return (
      <div className="relative flex flex-col items-center gap-1 select-none">
        {statusBubble}
        {playerInfo}

      <div className="flex items-center gap-2 sm:gap-3 mt-1">
          {/* Concealed Tiles (Face Down) */}
          <div className="flex gap-px sm:gap-0.5 bg-emerald-950/40 p-1 sm:p-1.5 rounded-md sm:rounded-lg border border-emerald-900/60 shrink-0">
            {Array.from({ length: Math.min(player.hand.length, 13) }).map((_, i) => (
              <Tile key={i} faceDown size="xs" />
            ))}
          </div>

          {/* Exposed Melds */}
          {player.melds.length > 0 && (
            <div className="flex gap-1.5 pl-2 border-l border-emerald-700/50 shrink-0">
              {player.melds.map((m, mIdx) => (
                <div key={`meld_top_${mIdx}`} className="flex gap-0.5 bg-black/30 p-1 rounded">
                  {m.tiles.map((t, tIdx) => (
                    <Tile key={`meld_top_${mIdx}_${t.id}_${tIdx}`} tile={t} size="xs" disabled />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Flowers */}
          {player.flowers.length > 0 && (
            <div className="flex gap-0.5 pl-2 border-l border-emerald-800/40 shrink-0">
              {player.flowers.map((f, fIdx) => (
                <Tile key={`flower_top_${f.id}_${fIdx}`} tile={f} size="xs" disabled />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // LEFT / RIGHT OPPONENTS (West / East / South)
  return (
    <div className="relative flex flex-col items-center gap-2 select-none">
      {statusBubble}
      {playerInfo}

      {/* Vertical rack representation */}
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        {/* Concealed face down tiles */}
        <div className="flex flex-col gap-px sm:gap-0.5 bg-emerald-950/40 p-0.5 sm:p-1.5 rounded-md sm:rounded-lg border border-emerald-900/60 shrink-0">
          {Array.from({ length: Math.min(player.hand.length, 13) }).map((_, i) => (
            <Tile key={i} faceDown size="xs" horizontal />
          ))}
        </div>

        {/* Exposed Melds */}
        {player.melds.length > 0 && (
          <div className="flex flex-col gap-1 pt-1 border-t border-emerald-800/40">
            {player.melds.map((m, mIdx) => (
              <div key={`meld_side_${mIdx}`} className="flex flex-col gap-0.5 bg-black/30 p-1 rounded">
                {m.tiles.map((t, tIdx) => (
                  <Tile key={`meld_side_${mIdx}_${t.id}_${tIdx}`} tile={t} size="xs" horizontal disabled />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
