'use client';

import React, { useState } from 'react';
import { Player, Tile as TileType, Meld } from '@/lib/mahjong/types';
import { Tile } from './Tile';
import { getSelfGangOptions, isWinningHand, calculateFans, getWaitingTiles } from '@/lib/mahjong/rules';
import { sortTiles } from '@/lib/mahjong/tiles';
import { sound } from '@/lib/mahjong/audio';
import { Sparkles, ArrowUp, RefreshCw, Eye } from 'lucide-react';

interface PlayerHandProps {
  player: Player;
  isMyTurn: boolean;
  drawnTile?: TileType;
  roundWind: string;
  minFan: number;
  timeLeft?: number;
  onDiscard: (tile: TileType) => void;
  onSelfAction: (action: 'hu' | 'an_gang' | 'bu_gang', tile?: TileType) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  isMyTurn,
  drawnTile,
  roundWind,
  minFan,
  timeLeft,
  onDiscard,
  onSelfAction,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [showTingAnalysis, setShowTingAnalysis] = useState(false);

  // Check self actions (Zimo Hu, An-gang, Bu-gang)
  const isZimoAvailable = (() => {
    if (!isMyTurn || player.hand.length % 3 !== 2) return false;
    if (!isWinningHand(player.hand)) return false;
    const lastTile = drawnTile || player.hand[player.hand.length - 1];
    const handWithoutLast = player.hand.filter(t => t.id !== lastTile.id);
    const { qualifies } = calculateFans(
      handWithoutLast,
      player.melds,
      lastTile,
      true,
      player.seat,
      roundWind,
      player.flowers,
      minFan
    );
    return qualifies;
  })();

  const selfGangOptions = isMyTurn ? getSelfGangOptions(player.hand, player.melds) : [];

  // Waiting tiles (Ting)
  const waitingTiles = getWaitingTiles(player.hand);

  // Only show separated drawn tile if it's currently MY TURN and player holds 14 tiles
  const shouldShowDrawn = isMyTurn && player.hand.length % 3 === 2 && Boolean(drawnTile) && player.hand.some(t => t.id === drawnTile?.id);

  // Split tiles into sorted main hand and separately highlighted drawn tile
  const sortedHand = sortTiles(
    shouldShowDrawn && drawnTile ? player.hand.filter(t => t.id !== drawnTile.id) : player.hand
  );

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleTileClick = (tile: TileType) => {
    sound.playTileClick();
    if (selectedTileId === tile.id) {
      // Second click on already selected tile: discard if it's turn!
      if (isMyTurn && player.hand.length % 3 === 2) {
        onDiscard(tile);
        setSelectedTileId(null);
      }
    } else {
      setSelectedTileId(tile.id);
    }
  };

  const handleDiscardSelected = () => {
    const tile = player.hand.find(t => t.id === selectedTileId);
    if (tile && isMyTurn && player.hand.length % 3 === 2) {
      onDiscard(tile);
      setSelectedTileId(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Top Helper Bar: Turn status, Ting helper, and Self Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-center">
        {/* Turn Indicator */}
        <div
          className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-md ${
            isMyTurn
              ? 'bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-300'
              : 'bg-slate-800/80 text-slate-400'
          }`}
        >
          {isMyTurn
            ? <span><span className="hidden sm:inline">▶ GILIRAN ANDA — Buang 1 kartu </span><span className="sm:hidden">▶ Giliran Anda! </span>{timeLeft !== undefined ? `(${formatTimer(timeLeft)})` : ''}</span>
            : <span className="hidden sm:inline">Menunggu giliran lawan...</span>}
          {!isMyTurn && <span className="sm:hidden">Menunggu...</span>}
        </div>

        {/* Self-Draw Hu (Zimo) Button */}
        {isZimoAvailable && (
          <button
            onClick={() => onSelfAction('hu')}
            className="px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 shadow-lg shadow-red-600/40 animate-bounce flex items-center gap-1 sm:gap-1.5 border border-amber-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ZIMO! (自摸食糊)</span>
            <span className="sm:hidden">ZIMO!</span>
          </button>
        )}

        {/* Self Gang Button */}
        {selfGangOptions.length > 0 && (
          <button
            onClick={() => onSelfAction(selfGangOptions[0].type, selfGangOptions[0].tile)}
            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 shadow-md flex items-center gap-1"
          >
            <span>槓</span>
            <span className="hidden sm:inline">Kong ({selfGangOptions[0].type === 'an_gang' ? '暗槓' : '補槓'})</span>
          </button>
        )}

        {/* Waiting Tiles (Ting / 聽牌) Toggle */}
        <button
          onClick={() => setShowTingAnalysis(!showTingAnalysis)}
          className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium flex items-center gap-1 transition ${
            waitingTiles.length > 0
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900'
              : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:text-slate-200'
          }`}
          title="Analyze waiting tiles (Ting/聽牌)"
        >
          <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Ting {waitingTiles.length > 0 && `(${waitingTiles.length})`}</span>
        </button>

        {/* Discard Selected Tile button */}
        {selectedTileId && isMyTurn && player.hand.length % 3 === 2 && (
          <button
            onClick={handleDiscardSelected}
            className="px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-md flex items-center gap-1 animate-pulse"
          >
            <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Discard</span>
          </button>
        )}
      </div>

      {/* Ting Analysis Preview Popup */}
      {showTingAnalysis && (
        <div className="bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/30 flex items-center gap-3 shadow-xl mb-1">
          <span className="text-xs text-emerald-400 font-semibold">
            {waitingTiles.length > 0 ? 'Waiting on (聽牌):' : 'Not ready yet (未聽牌)'}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {waitingTiles.map((wt, i) => (
              <Tile key={i} tile={wt} size="xs" />
            ))}
          </div>
        </div>
      )}

      {/* Main Rack Area (Tiles + Melds on Polished Wooden Rack) */}
      <div className="relative flex items-end justify-center gap-1 sm:gap-3 md:gap-5 bg-gradient-to-t from-[#26150b] via-[#3d2212] to-[#4a2b18] pt-5 sm:pt-6 pb-1.5 sm:pb-2.5 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl border-2 border-[#5c371f] shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md max-w-full">
        {/* Wooden rack front lip ledge */}
        <div className="absolute -bottom-1 inset-x-1 sm:inset-x-2 h-1.5 sm:h-2 rounded-b-lg bg-[#1c0e07] border-t border-[#633a20] shadow-md pointer-events-none" />

        {/* Concealed Hand Tiles */}
        <div className="flex items-end gap-0.5 sm:gap-1 md:gap-1.5 px-0.5 sm:px-1 py-0.5 overflow-x-auto max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {sortedHand.map((tile, idx) => (
            <Tile
              key={`${tile.id}_${idx}`}
              tile={tile}
              selected={selectedTileId === tile.id}
              onClick={() => handleTileClick(tile)}
              size="md"
            />
          ))}

          {/* Separated Drawn Tile (ONLY if it's my turn and have 14 tiles) */}
          {shouldShowDrawn && drawnTile && (
            <div className="ml-1 sm:ml-3 md:ml-4 flex flex-col items-center shrink-0">
              <span className="text-[8px] sm:text-[10px] text-amber-300 font-extrabold uppercase tracking-wider mb-0.5 animate-pulse">
                Drawn
              </span>
              <Tile
                key={`drawn_${drawnTile.id}`}
                tile={drawnTile}
                selected={selectedTileId === drawnTile.id}
                onClick={() => handleTileClick(drawnTile)}
                size="md"
              />
            </div>
          )}
        </div>

        {/* Exposed Melds (Chi, Peng, Gang) */}
        {player.melds.length > 0 && (
          <div className="flex items-end gap-1 sm:gap-2 pl-1.5 sm:pl-4 border-l border-amber-900/50 shrink-0">
            {player.melds.map((meld, mIdx) => (
              <div
                key={`meld_${mIdx}`}
                className="flex items-end gap-0.5 bg-black/40 p-0.5 sm:p-1 rounded-lg border border-amber-800/40 shadow-inner"
                title={`${meld.type.toUpperCase()}`}
              >
                {meld.tiles.map((t, tIdx) => (
                  <Tile
                    key={`meld_${mIdx}_${t.id}_${tIdx}`}
                    tile={t}
                    size="sm"
                    disabled
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Bonus Flowers */}
        {player.flowers.length > 0 && (
          <div className="flex flex-col gap-0.5 items-center pl-1.5 sm:pl-2 border-l border-amber-900/50 shrink-0">
            <span className="text-[8px] sm:text-[9px] text-amber-400 font-bold">Flowers</span>
            <div className="flex gap-0.5">
              {player.flowers.map((f, fIdx) => (
                <Tile key={`flower_${f.id}_${fIdx}`} tile={f} size="xs" disabled />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
