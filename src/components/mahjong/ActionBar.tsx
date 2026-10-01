'use client';

import React, { useState } from 'react';
import { AvailableAction, Tile as TileType } from '@/lib/mahjong/types';
import { Tile } from './Tile';

interface ActionBarProps {
  actions: AvailableAction[];
  onClaim: (type: 'chi' | 'peng' | 'gang' | 'hu', tiles?: TileType[]) => void;
  onPass: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({ actions, onClaim, onPass }) => {
  const [selectedChiIndex, setSelectedChiIndex] = useState<number | null>(null);

  if (actions.length === 0) return null;

  const huAction = actions.find(a => a.type === 'hu');
  const gangAction = actions.find(a => a.type === 'gang');
  const pengAction = actions.find(a => a.type === 'peng');
  const chiAction = actions.find(a => a.type === 'chi');

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 animate-bounce-subtle">
      {/* If choosing between multiple Chi combinations */}
      {selectedChiIndex !== null && chiAction?.options && (
        <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-amber-500/40 shadow-2xl flex flex-col items-center gap-2 mb-2">
          <span className="text-xs text-amber-200 font-medium">Choose tiles to Chow (吃牌組合):</span>
          <div className="flex gap-4">
            {chiAction.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (chiAction.tile) {
                    onClaim('chi', [...option, chiAction.tile]);
                  }
                  setSelectedChiIndex(null);
                }}
                className="flex items-center gap-1 p-2 bg-emerald-900/60 hover:bg-emerald-800 rounded-lg border border-emerald-400/40 transition hover:scale-105"
              >
                {option.map((t, tIdx) => (
                  <Tile key={tIdx} tile={t} size="sm" />
                ))}
                {chiAction.tile && (
                  <span className="text-xs text-amber-400 font-bold ml-1">+ Discard</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedChiIndex(null)}
            className="text-xs text-slate-400 hover:text-white underline mt-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-5 py-3 rounded-2xl border-2 border-amber-500/50 shadow-2xl">
        {/* Hu / Win */}
        {huAction && (
          <button
            onClick={() => onClaim('hu')}
            className="group relative px-6 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 via-red-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 shadow-lg shadow-red-600/40 transition-transform active:scale-95 flex items-center gap-2 border border-amber-300"
          >
            <span className="text-xl">🀄</span>
            <div className="text-left">
              <div className="text-lg leading-none font-black tracking-wide">HU! (食糊)</div>
              <div className="text-[10px] text-amber-200">Win the hand</div>
            </div>
          </button>
        )}

        {/* Gang / Kong */}
        {gangAction && (
          <button
            onClick={() => onClaim('gang')}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 shadow-lg transition-transform active:scale-95 flex items-center gap-2 border border-purple-400/30"
          >
            <span className="text-lg">槓</span>
            <div className="text-left">
              <div className="text-sm leading-none font-bold">KONG (槓)</div>
              <div className="text-[10px] text-purple-200">4 of a kind</div>
            </div>
          </button>
        )}

        {/* Peng / Pung */}
        {pengAction && (
          <button
            onClick={() => onClaim('peng')}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-700 to-cyan-800 hover:from-blue-600 hover:to-cyan-700 shadow-lg transition-transform active:scale-95 flex items-center gap-2 border border-blue-400/30"
          >
            <span className="text-lg">碰</span>
            <div className="text-left">
              <div className="text-sm leading-none font-bold">PUNG (碰)</div>
              <div className="text-[10px] text-cyan-200">3 of a kind</div>
            </div>
          </button>
        )}

        {/* Chi / Chow */}
        {chiAction && (
          <button
            onClick={() => {
              if (chiAction.options && chiAction.options.length > 1) {
                setSelectedChiIndex(0);
              } else if (chiAction.options && chiAction.options.length === 1 && chiAction.tile) {
                onClaim('chi', [...chiAction.options[0], chiAction.tile]);
              }
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 shadow-lg transition-transform active:scale-95 flex items-center gap-2 border border-emerald-400/30"
          >
            <span className="text-lg">吃</span>
            <div className="text-left">
              <div className="text-sm leading-none font-bold">CHOW (吃)</div>
              <div className="text-[10px] text-teal-200">Sequence run</div>
            </div>
          </button>
        )}

        {/* Pass */}
        <button
          onClick={onPass}
          className="px-4 py-2.5 rounded-xl font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 flex items-center gap-1.5"
        >
          <span>✕</span>
          <span className="text-sm">Pass (過)</span>
        </button>
      </div>
    </div>
  );
};
