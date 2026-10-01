'use client';

import React from 'react';
import { Tile as TileType } from '@/lib/mahjong/types';
import { Tile } from './Tile';

interface DiscardRiverProps {
  discardsBySeat: { [seat: number]: TileType[] };
  lastDiscard?: { tile: TileType; seat: number };
  seatWindChars?: string[];
  localPlayerSeat: number;
}

export const DiscardRiver: React.FC<DiscardRiverProps> = ({
  discardsBySeat,
  lastDiscard,
  localPlayerSeat,
}) => {
  // Seats relative to local player:
  // bottom: localPlayerSeat
  // right: (localPlayerSeat + 1) % 4
  // top: (localPlayerSeat + 2) % 4
  // left: (localPlayerSeat + 3) % 4
  const seatPositions = [
    { pos: 'bottom', seat: localPlayerSeat },
    { pos: 'right', seat: (localPlayerSeat + 1) % 4 },
    { pos: 'top', seat: (localPlayerSeat + 2) % 4 },
    { pos: 'left', seat: (localPlayerSeat + 3) % 4 },
  ];

  return (
    <div className="relative w-44 h-44 xs:w-52 xs:h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-xl sm:rounded-2xl bg-emerald-950/40 border border-emerald-700/40 p-1.5 sm:p-2 flex items-center justify-center shadow-inner">
      {/* 4 discard pools */}
      {seatPositions.map(({ pos, seat }) => {
        const discards = discardsBySeat[seat] || [];
        const isCurrentLast = lastDiscard?.seat === seat;

        // Position specific styles
        const positionStyles = {
          bottom: 'absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-wrap max-w-[110px] sm:max-w-[160px] md:max-w-[200px] justify-center gap-px sm:gap-0.5',
          top:    'absolute top-1 left-1/2 -translate-x-1/2 flex flex-wrap max-w-[110px] sm:max-w-[160px] md:max-w-[200px] justify-center gap-px sm:gap-0.5',
          left:   'absolute left-1 top-1/2 -translate-y-1/2 flex flex-col flex-wrap max-h-[100px] sm:max-h-[130px] md:max-h-[160px] justify-center gap-px sm:gap-0.5',
          right:  'absolute right-1 top-1/2 -translate-y-1/2 flex flex-col flex-wrap max-h-[100px] sm:max-h-[130px] md:max-h-[160px] justify-center gap-px sm:gap-0.5',
        }[pos];

        return (
          <div key={pos} className={positionStyles}>
            {discards.map((tile, idx) => {
              const isLatestTile = isCurrentLast && idx === discards.length - 1;
              return (
                <div key={`${tile.id || 'tile'}_${idx}`} className="relative shrink-0">
                  <Tile
                    tile={tile}
                    size="xs"
                    disabled
                    highlighted={isLatestTile}
                  />
                  {isLatestTile && (
                    <span className="absolute -top-1.5 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
