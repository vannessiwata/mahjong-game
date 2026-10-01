'use client';

import React, { useState } from 'react';
import { useMahjongGame } from '@/hooks/useMahjongGame';
import { PlayerHand } from './PlayerHand';
import { OpponentHand } from './OpponentHand';
import { DiscardRiver } from './DiscardRiver';
import { CenterTable } from './CenterTable';
import { ActionBar } from './ActionBar';
import { WinningModal } from './WinningModal';
import { RulesModal } from './RulesModal';
import { sound } from '@/lib/mahjong/audio';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  RotateCcw,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface TableProps {
  onBackToLobby?: () => void;
}

export const Table: React.FC<TableProps> = ({ onBackToLobby }) => {
  const {
    gameState,
    localPlayerSeat,
    availableActions,
    botStatusMessages,
    timeLeft,
    startNewRound,
    discardTile,
    executeClaim,
    handlePass,
    handleSelfAction,
  } = useMahjongGame();

  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  // Mute toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Determine opponent relative positions based on localPlayerSeat (0-3)
  // Local: bottom
  // (localPlayerSeat + 1) % 4: right
  // (localPlayerSeat + 2) % 4: top
  // (localPlayerSeat + 3) % 4: left
  const rightSeat = (localPlayerSeat + 1) % 4;
  const topSeat = (localPlayerSeat + 2) % 4;
  const leftSeat = (localPlayerSeat + 3) % 4;

  const localPlayer = gameState.players[localPlayerSeat];
  const rightPlayer = gameState.players[rightSeat];
  const topPlayer = gameState.players[topSeat];
  const leftPlayer = gameState.players[leftSeat];

  // Group discards by seat
  const discardsBySeat: { [seat: number]: typeof gameState.players[0]['discards'] } = {
    0: gameState.players[0]?.discards || [],
    1: gameState.players[1]?.discards || [],
    2: gameState.players[2]?.discards || [],
    3: gameState.players[3]?.discards || [],
  };

  const isMyTurn = gameState.currentTurn === localPlayerSeat && gameState.phase === 'playing';

  // Handle start/reset
  const handleStartOrRestart = () => {
    setIsModalDismissed(false);
    startNewRound();
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="relative z-30 px-4 py-2.5 bg-slate-950/80 border-b border-emerald-800/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🀄</span>
          <div>
            <h1 className="text-base font-extrabold text-white leading-none tracking-wide flex items-center gap-1.5">
              <span>Hong Kong Mahjong</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                HK Rules
              </span>
            </h1>
            <span className="text-[10px] text-slate-400">Min 3 Fan • 4 Players</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Activity Log button */}
          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Game Activity Log"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Sound Mute */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Rules Guide */}
          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Rules & Fan Guide"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          {/* Start / Reset */}
          {gameState.phase === 'lobby' ? (
            <button
              onClick={handleStartOrRestart}
              className="px-4 py-1.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-700/30 flex items-center gap-1.5 border border-emerald-400/40 animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Deal Hands (開局)</span>
            </button>
          ) : (
            <button
              onClick={handleStartOrRestart}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Restart Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onBackToLobby && (
            <button
              onClick={onBackToLobby}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition"
            >
              Lobby
            </button>
          )}
        </div>
      </header>

      {/* Main Mahjong Felt Table */}
      <main className="relative flex-1 flex flex-col items-center justify-between p-2 sm:p-4 bg-gradient-to-b from-[#0d3b24] via-[#092c1b] to-[#041a0f] overflow-hidden">
        {/* Felt table textured border and subtle vignette */}
        <div className="absolute inset-2 sm:inset-4 rounded-3xl border-8 border-[#3b2210] shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] pointer-events-none z-0" />

        {/* TOP OPPONENT */}
        <div className="relative z-10 w-full flex justify-center pt-1">
          {topPlayer && (
            <OpponentHand
              player={topPlayer}
              position="top"
              isTurn={gameState.currentTurn === topSeat}
              statusText={botStatusMessages[topSeat]}
            />
          )}
        </div>

        {/* MIDDLE SECTION: LEFT OPPONENT, CENTER DISCARDS & COMPASS, RIGHT OPPONENT */}
        <div className="relative z-10 w-full flex-1 flex items-center justify-between px-2 sm:px-6 max-w-6xl">
          {/* LEFT OPPONENT */}
          <div className="flex justify-start">
            {leftPlayer && (
              <OpponentHand
                player={leftPlayer}
                position="left"
                isTurn={gameState.currentTurn === leftSeat}
                statusText={botStatusMessages[leftSeat]}
              />
            )}
          </div>

          {/* TABLE CENTER DISCARDS & COMPASS */}
          <div className="relative flex items-center justify-center my-auto">
            <DiscardRiver
              discardsBySeat={discardsBySeat}
              lastDiscard={gameState.lastDiscard}
              localPlayerSeat={localPlayerSeat}
            />

            {/* Centered HUD */}
            <div className="absolute">
              <CenterTable
                wallCount={gameState.wall.length}
                currentTurn={gameState.currentTurn}
                dealerSeat={gameState.dealerSeat}
                roundWind={gameState.prevWind}
                localPlayerSeat={localPlayerSeat}
                timeLeft={timeLeft}
              />
            </div>
          </div>

          {/* RIGHT OPPONENT */}
          <div className="flex justify-end">
            {rightPlayer && (
              <OpponentHand
                player={rightPlayer}
                position="right"
                isTurn={gameState.currentTurn === rightSeat}
                statusText={botStatusMessages[rightSeat]}
              />
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: LOCAL PLAYER RACK */}
        <div className="relative z-10 w-full flex justify-center pb-2">
          {localPlayer && (
            <PlayerHand
              player={localPlayer}
              isMyTurn={isMyTurn}
              drawnTile={gameState.lastDrawnTile}
              roundWind={gameState.prevWind}
              minFan={gameState.settings.minFan}
              timeLeft={timeLeft}
              onDiscard={discardTile}
              onSelfAction={handleSelfAction}
            />
          )}
        </div>

        {/* FLOATING ACTION PROMPT (Hu, Gang, Peng, Chi, Pass) */}
        <ActionBar
          actions={availableActions}
          onClaim={executeClaim}
          onPass={handlePass}
        />
      </main>

      {/* WINNING / ROUND END MODAL */}
      {!isModalDismissed && (
        <WinningModal
          winResult={gameState.winResult}
          isDraw={gameState.phase === 'round_end' && !gameState.winResult}
          players={gameState.players}
          onNextRound={handleStartOrRestart}
          onClose={() => setIsModalDismissed(true)}
        />
      )}

      {/* RULES GUIDE MODAL */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* ACTIVITY FEED SLIDE DRAWER */}
      {showLogDrawer && (
        <div className="absolute top-14 right-4 z-40 w-80 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 backdrop-blur-md animate-in slide-in-from-right-4 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-amber-400">Game Activity Log</span>
            <button
              onClick={() => setShowLogDrawer(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1 text-xs text-slate-300">
            {gameState.log.map((entry, idx) => (
              <div key={idx} className="leading-tight py-0.5 border-b border-slate-900/60 font-mono text-[11px]">
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
