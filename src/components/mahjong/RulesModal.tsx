'use client';

import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const fanRules = [
    { name: 'Self-Draw (自摸)', fan: '1 Fan', desc: 'Drawing the winning tile yourself from the wall.' },
    { name: 'Dragon Pung (三元牌刻)', fan: '1 Fan', desc: 'Pung or Kong of Red Dragon (中), Green Dragon (發), or White Dragon (白).' },
    { name: 'Seat Wind (門風)', fan: '1 Fan', desc: 'Pung or Kong of your current assigned seat wind.' },
    { name: 'Round Wind (圈風)', fan: '1 Fan', desc: 'Pung or Kong of the current table round wind (e.g. East).' },
    { name: 'Concealed Hand (門前清)', fan: '1 Fan', desc: 'Winning on a claimed discard with zero exposed melds in hand.' },
    { name: 'Seat Flower (正花)', fan: '1 Fan', desc: 'Drawing the flower/season tile corresponding to your seat number.' },
    { name: 'No Flowers (無花)', fan: '1 Fan', desc: 'Winning a hand with zero flower tiles.' },
    { name: 'All Triplets / Pong Pong Hu (對對胡)', fan: '3 Fan', desc: 'Hand composed solely of 4 triplets/quads and 1 pair (no runs).' },
    { name: 'Mixed One Suit (混一色)', fan: '3 Fan', desc: 'Hand composed solely of one suit (Wan, Tong, or Tiao) plus Winds/Dragons.' },
    { name: 'Seven Pairs (七對子)', fan: '4 Fan', desc: 'Concealed hand containing 7 pairs of tiles.' },
    { name: 'Little Three Dragons (小三元)', fan: '5 Fan', desc: 'Two dragon triplets + one dragon pair.' },
    { name: 'Pure One Suit (清一色)', fan: '7 Fan', desc: 'Hand made entirely from a single suit (no winds or dragons).' },
    { name: 'Big Three Dragons (大三元)', fan: '8 Fan', desc: 'Three triplets of all 3 dragons (Red, Green, White).' },
    { name: 'All Honors (字一色)', fan: '10 Fan', desc: 'Hand composed entirely of winds and dragons.' },
    { name: 'Thirteen Orphans (十三幺)', fan: '13 Fan', desc: '1 and 9 of each suit, all 4 winds, all 3 dragons, plus 1 pair.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-xl font-bold text-white">Hong Kong Mahjong Rules & Fan Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-5 pr-2 mt-4 text-sm text-slate-300">
          {/* Basics */}
          <div>
            <h3 className="font-bold text-amber-300 text-base mb-1">Objective & Basics</h3>
            <p className="leading-relaxed">
              Hong Kong Mahjong is played by 4 players with 136 standard tiles (Wan, Tong, Tiao, Winds, Dragons) plus 8 optional Flowers.
              Players draw and discard tiles to assemble a standard winning hand of <strong>14 tiles</strong>: <strong>4 Melds + 1 Pair (Eye)</strong>.
            </p>
          </div>

          {/* Melds */}
          <div>
            <h3 className="font-bold text-amber-300 text-base mb-1">Meld Declarations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-emerald-400">Chow (吃 / Chi)</span>
                <p className="text-xs text-slate-400 mt-1">
                  A 3-tile numerical run of the same suit (e.g., 3-4-5 Wan). Can <em>only</em> be claimed from the player immediately to your left.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-cyan-400">Pung (碰 / Peng)</span>
                <p className="text-xs text-slate-400 mt-1">
                  A set of 3 identical tiles. Can be claimed from <em>any</em> player when discarded.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-purple-400">Kong (槓 / Gang)</span>
                <p className="text-xs text-slate-400 mt-1">
                  A set of 4 identical tiles. Grants an immediate replacement draw from the dead wall.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-rose-400">Hu / Win (食糊 / Sik Wu)</span>
                <p className="text-xs text-slate-400 mt-1">
                  Complete your 14th tile from another player&apos;s discard or through self-draw (Zimo). Must satisfy minimum fan requirement (typically 3 Fan).
                </p>
              </div>
            </div>
          </div>

          {/* Fan Scoring Table */}
          <div>
            <h3 className="font-bold text-amber-300 text-base mb-2">Hong Kong Fan (番數) Scoring List</h3>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {fanRules.map((rule, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{rule.name}</span>
                    <span className="text-[11px] text-slate-400">{rule.desc}</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 whitespace-nowrap ml-3">
                    {rule.fan}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
