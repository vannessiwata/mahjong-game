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
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl bg-emerald-950/40 border border-emerald-700/40 p-2 flex items-center justify-center shadow-inner">
      {/* 4 discard pools */}
      {seatPositions.map(({ pos, seat }) => {
        const discards = discardsBySeat[seat] || [];
        const isCurrentLast = lastDiscard?.seat === seat;

        // Position specific styles
        const positionStyles = {
          bottom: 'absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-wrap max-w-[200px] justify-center gap-0.5',
          top: 'absolute top-2 left-1/2 -translate-x-1/2 flex flex-wrap max-w-[200px] justify-center gap-0.5',
          left: 'absolute left-2 top-1/2 -translate-y-1/2 flex flex-col flex-wrap max-h-[160px] justify-center gap-0.5',
          right: 'absolute right-2 top-1/2 -translate-y-1/2 flex flex-col flex-wrap max-h-[160px] justify-center gap-0.5',
        }[pos];

        return (
          <div key={pos} className={positionStyles}>
            {discards.map((tile, idx) => {
              const isLatestTile = isCurrentLast && idx === discards.length - 1;
              return (
                <div key={`${tile.id || 'tile'}_${idx}`} className="relative">
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
