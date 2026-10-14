'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AvailableAction, GameState, Player, Tile } from '@/lib/mahjong/types';
import { botChooseDiscard, botDecideSelfAction } from '@/lib/mahjong/bot';
import { sound } from '@/lib/mahjong/audio';
import {
  applyClaim,
  applyDiscard,
  applyDraw,
  applySelfAction,
  describeHandProblem,
  evaluateClaimWindow,
  needsDiscard,
  startRound,
} from '@/lib/mahjong/engine';
import { getSocket } from '@/lib/socket';

const INITIAL_PLAYERS: Player[] = [
  { id: 'p0', name: 'You (East)', isBot: false, avatar: '🐉', seat: 0, hand: [], melds: [], flowers: [], discards: [], score: 1000, isReady: true, isHost: true },
  { id: 'p1', name: 'Bot Ling (South)', isBot: true, avatar: '🌸', seat: 1, hand: [], melds: [], flowers: [], discards: [], score: 1000, isReady: true },
  { id: 'p2', name: 'Bot Ken (West)', isBot: true, avatar: '🎋', seat: 2, hand: [], melds: [], flowers: [], discards: [], score: 1000, isReady: true },
  { id: 'p3', name: 'Bot Ming (North)', isBot: true, avatar: '🐅', seat: 3, hand: [], melds: [], flowers: [], discards: [], score: 1000, isReady: true },
];

export interface UseMahjongGameOptions {
  roomId?: string | null;
  playerName?: string;
  minFan?: number;
  includeFlowers?: boolean;
}

const CLAIM_LABEL: Record<'chi' | 'peng' | 'gang' | 'hu', string> = {
  chi: 'CHOW! (吃)',
  peng: 'PENG! (碰)',
  gang: 'KONG! (槓)',
  hu: 'HU! (食糊)',
};

export function useMahjongGame(options?: UseMahjongGameOptions) {
  const roomId = options?.roomId || null;
  const playerName = options?.playerName || 'You';
  const initialMinFan = options?.minFan ?? 0;
  const includeFlowers = options?.includeFlowers ?? true;

  const [gameState, setGameState] = useState<GameState>(() => {
    const players = INITIAL_PLAYERS.map(player => ({ ...player }));
    if (!roomId && playerName) players[0] = { ...players[0], name: playerName };
    return {
      roomId: roomId || 'LOCAL_ROOM',
      phase: 'lobby',
      settings: {
        minFan: initialMinFan,
        maxFan: 10,
        includeFlowers,
        turnTimeLimit: 0,
      },
      players,
      wall: [],
      deadWall: [],
      currentTurn: 0,
      dealerSeat: 0,
      prevWind: 'east',
      pendingClaims: {},
      log: ['Welcome to Hong Kong Mahjong! Choose Solo vs AI or Online Multiplayer.'],
    };
  });

  const [localPlayerSeat, setLocalPlayerSeat] = useState<number>(0);
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([]);
  const [botStatusMessages, setBotStatusMessages] = useState<{ [seat: number]: string }>({});
  const TURN_TIME_LIMIT = 120;
  const [timeLeft, setTimeLeft] = useState<number>(TURN_TIME_LIMIT);

  const stateRef = useRef(gameState);
  const localSeatRef = useRef(localPlayerSeat);
  localSeatRef.current = localPlayerSeat;
  const pendingDrawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((producer: (prev: GameState) => GameState) => {
    const next = producer(stateRef.current);
    if (next === stateRef.current) return stateRef.current;
    stateRef.current = next;
    setGameState(next);
    if (process.env.NODE_ENV !== 'production') {
      const problem = describeHandProblem(next, true);
      if (problem) console.warn(`[mahjong] ${problem}`);
    }
    return next;
  }, []);

  const clearDrawTimer = useCallback(() => {
    if (pendingDrawTimerRef.current !== null) {
      clearTimeout(pendingDrawTimerRef.current);
      pendingDrawTimerRef.current = null;
    }
  }, []);

  const addLog = useCallback((msg: string) => {
    commit(prev => ({ ...prev, log: [msg, ...prev.log.slice(0, 30)] }));
  }, [commit]);

  const setBotStatus = useCallback((seat: number, text: string, duration = 1200) => {
    setBotStatusMessages(prev => ({ ...prev, [seat]: text }));
    setTimeout(() => {
      setBotStatusMessages(prev => {
        const next = { ...prev };
        delete next[seat];
        return next;
      });
    }, duration);
  }, []);

  const emitAction = useCallback((actionType: string, payload: unknown) => {
    if (!roomId) return;
    try {
      getSocket().emit('game_action', { roomId, actionType, payload });
    } catch (error) {
      console.error(`Failed to emit ${actionType}:`, error);
    }
  }, [roomId]);

  const startNewRound = useCallback(() => {
    sound.playShuffle();
    clearDrawTimer();
    const next = commit(prev => startRound(prev));
    setAvailableActions([]);
    if (!roomId) return;
    emitAction('start_round', {
      players: next.players,
      wall: next.wall,
      dealerSeat: next.dealerSeat,
      initialDrawnTile: next.lastDrawnTile,
    });
  }, [clearDrawTimer, commit, emitAction, roomId]);

  const performDiscard = useCallback((seat: number, tile: Tile) => {
    const prev = stateRef.current;
    const next = commit(current => applyDiscard(current, seat, tile));
    if (next === prev) return false;
    sound.playTileDiscard();
    setAvailableActions([]);
    return true;
  }, [commit]);

  const performDraw = useCallback((seat: number) => {
    const prev = stateRef.current;
    const next = commit(current => applyDraw(current, seat));
    if (next === prev) return false;
    sound.playTileClick();
    return true;
  }, [commit]);

  const performClaim = useCallback((
    seat: number,
    claimType: 'chi' | 'peng' | 'gang' | 'hu',
    tiles?: Tile[],
  ) => {
    clearDrawTimer();
    const prev = stateRef.current;
    const next = commit(current => applyClaim(current, seat, claimType, tiles));
    if (next === prev) return false;
    setAvailableActions([]);
    sound.playClaimChime();
    if (next.players[seat]?.isBot) setBotStatus(seat, CLAIM_LABEL[claimType]);
    return true;
  }, [clearDrawTimer, commit, setBotStatus]);

  const scheduleDraw = useCallback((seat: number, delay: number) => {
    clearDrawTimer();
    pendingDrawTimerRef.current = setTimeout(() => {
      pendingDrawTimerRef.current = null;
      if (!performDraw(seat)) return;
      emitAction('draw', { seat });
    }, delay);
  }, [clearDrawTimer, emitAction, performDraw]);

  const resolveClaimWindow = useCallback((ignoreHuman: boolean) => {
    const state = stateRef.current;
    if (state.phase !== 'claim_window' || !state.lastDiscard) return;
    const isHost = localSeatRef.current === 0;
    if (roomId && !isHost) return;

    const { autoClaim } = evaluateClaimWindow(state, localSeatRef.current, { ignoreHuman });
    if (autoClaim) {
      const applied = performClaim(autoClaim.seat, autoClaim.type, autoClaim.tiles);
      if (applied) {
        emitAction('claim', {
          seat: autoClaim.seat,
          claimType: autoClaim.type,
          tiles: autoClaim.tiles,
        });
      }
      return;
    }

    scheduleDraw((state.lastDiscard.seat + 1) % 4, ignoreHuman ? 400 : 500);
  }, [emitAction, performClaim, roomId, scheduleDraw]);

  const processDiscardClaims = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== 'claim_window' || !state.lastDiscard) return;

    // One evaluation: bot choices use Math.random, so a second pass could disagree.
    const { humanActions, autoClaim } = evaluateClaimWindow(state, localSeatRef.current);
    if (humanActions.length > 0) {
      setAvailableActions(humanActions);
      return;
    }

    setAvailableActions([]);
    if (roomId && localSeatRef.current !== 0) return;
    if (autoClaim) {
      const applied = performClaim(autoClaim.seat, autoClaim.type, autoClaim.tiles);
      if (applied) {
        emitAction('claim', {
          seat: autoClaim.seat,
          claimType: autoClaim.type,
          tiles: autoClaim.tiles,
        });
      }
      return;
    }
    scheduleDraw((state.lastDiscard.seat + 1) % 4, 500);
  }, [emitAction, performClaim, roomId, scheduleDraw]);

  const handlePass = useCallback(() => {
    setAvailableActions([]);
    const state = stateRef.current;
    if (state.phase !== 'claim_window' || !state.lastDiscard) return;
    // Remote seats only clear their prompt. The host resolves bots and the draw,
    // otherwise two clients would each pull a tile.
    if (roomId && localSeatRef.current !== 0) return;
    resolveClaimWindow(true);
  }, [resolveClaimWindow, roomId]);

  const handleSelfAction = useCallback((action: 'hu' | 'an_gang' | 'bu_gang', tile?: Tile) => {
    const seat = localSeatRef.current;
    const prev = stateRef.current;
    const next = commit(current => applySelfAction(current, seat, action, tile));
    if (next === prev) return;
    if (action !== 'hu') sound.playTileClick();
    emitAction('self_action', { seat, action, tile });
  }, [commit, emitAction]);

  const handlePlayerDiscard = useCallback((tile: Tile) => {
    const seat = localSeatRef.current;
    if (!performDiscard(seat, tile)) return;
    emitAction('discard', { seat, tile });
  }, [emitAction, performDiscard]);

  const handlePlayerClaim = useCallback((type: 'chi' | 'peng' | 'gang' | 'hu', tiles?: Tile[]) => {
    const seat = localSeatRef.current;
    if (!performClaim(seat, type, tiles)) return;
    emitAction('claim', { seat, claimType: type, tiles });
  }, [emitAction, performClaim]);

  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    if (roomId && localSeatRef.current !== 0) return;

    const activePlayer = gameState.players[gameState.currentTurn];
    if (!activePlayer?.isBot || !needsDiscard(activePlayer)) return;

    const timer = setTimeout(() => {
      const state = stateRef.current;
      if (state.phase !== 'playing') return;
      const bot = state.players[state.currentTurn];
      if (!bot?.isBot || !needsDiscard(bot)) return;

      const decision = botDecideSelfAction(bot, state.prevWind, state.settings.minFan);
      if (decision.type === 'hu' || decision.type === 'an_gang' || decision.type === 'bu_gang') {
        const action = decision.type;
        const tile = decision.tile;
        const next = commit(current => applySelfAction(current, bot.seat, action, tile));
        if (next !== state) {
          if (action !== 'hu') sound.playTileClick();
          emitAction('self_action', { seat: bot.seat, action, tile });
          return;
        }
      }

      const discard = botChooseDiscard(bot);
      if (!performDiscard(bot.seat, discard)) return;
      emitAction('discard', { seat: bot.seat, tile: discard });
    }, 900);

    return () => clearTimeout(timer);
  }, [gameState.phase, gameState.currentTurn, gameState.players, commit, emitAction, performDiscard, roomId]);

  useEffect(() => {
    if (gameState.phase === 'playing') setTimeLeft(TURN_TIME_LIMIT);
  }, [gameState.currentTurn, gameState.phase]);

  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const timer = setInterval(() => {
      if (timeLeftRef.current > 1) {
        setTimeLeft(current => current - 1);
        return;
      }

      setTimeLeft(TURN_TIME_LIMIT);
      if (roomId && localSeatRef.current !== 0) return;

      const state = stateRef.current;
      const activePlayer = state.players[state.currentTurn];
      if (!activePlayer || !needsDiscard(activePlayer) || activePlayer.hand.length === 0) return;

      const randomTile = activePlayer.hand[Math.floor(Math.random() * activePlayer.hand.length)];
      const next = commit(current => {
        const discarded = applyDiscard(current, activePlayer.seat, randomTile);
        if (discarded === current) return current;
        return {
          ...discarded,
          log: [
            `⏰ Waktu 2 menit habis! ${activePlayer.name} otomatis membuang kartu (${randomTile.chinese || randomTile.name}).`,
            ...discarded.log.slice(0, 30),
          ],
        };
      });
      if (next === state) return;
      sound.playTileDiscard();
      setAvailableActions([]);
      emitAction('discard', { seat: activePlayer.seat, tile: randomTile });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.phase, gameState.currentTurn, commit, emitAction, roomId]);

  useEffect(() => {
    if (gameState.phase !== 'claim_window') return;
    clearDrawTimer();
    const timer = setTimeout(() => {
      processDiscardClaims();
    }, 200);
    return () => clearTimeout(timer);
  }, [gameState.phase, gameState.lastDiscard, processDiscardClaims, clearDrawTimer]);

  useEffect(() => {
    if (!roomId) return;

    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
      socket.connect();
      socket.emit('join_room', { roomId, playerName });

      const handleJoinedRoom = (data: { roomId: string; seat: number; roomPlayers: { name?: string; isBot?: boolean; id?: string }[] }) => {
        if (data.seat !== -1) {
          setLocalPlayerSeat(data.seat);
          localSeatRef.current = data.seat;
        }
      };

      const handleRoomUpdated = (data: { players: { name?: string; isBot?: boolean; id?: string }[] }) => {
        commit(prev => ({
          ...prev,
          players: prev.players.map((player, index) => {
            const serverPlayer = data.players[index];
            if (!serverPlayer) return player;
            return {
              ...player,
              name: serverPlayer.name || player.name,
              isBot: serverPlayer.isBot ?? player.isBot,
              id: serverPlayer.id || player.id,
            };
          }),
        }));
      };

      const handlePeerAction = (data: { fromSocket: string; actionType: string; payload: {
        players?: Player[];
        wall?: Tile[];
        dealerSeat?: number;
        initialDrawnTile?: Tile;
        seat?: number;
        tile?: Tile;
        claimType?: 'chi' | 'peng' | 'gang' | 'hu';
        tiles?: Tile[];
        action?: 'hu' | 'an_gang' | 'bu_gang';
      } }) => {
        const { actionType, payload } = data;

        if (actionType === 'start_round' && payload.players && payload.wall && payload.dealerSeat !== undefined) {
          clearDrawTimer();
          commit(prev => ({
            ...prev,
            phase: 'playing',
            players: payload.players!,
            wall: payload.wall!,
            currentTurn: payload.dealerSeat!,
            dealerSeat: payload.dealerSeat!,
            lastDiscard: undefined,
            pendingClaims: {},
            lastDrawnTile: payload.initialDrawnTile,
            winResult: undefined,
            log: [
              `Multiplayer round started! Dealer is ${payload.players![payload.dealerSeat!].name}.`,
              ...prev.log.slice(0, 30),
            ],
          }));
          setAvailableActions([]);
        } else if (actionType === 'discard' && payload.seat !== undefined && payload.tile) {
          performDiscard(payload.seat, payload.tile);
        } else if (actionType === 'draw' && payload.seat !== undefined) {
          performDraw(payload.seat);
        } else if (actionType === 'claim' && payload.seat !== undefined && payload.claimType) {
          performClaim(payload.seat, payload.claimType, payload.tiles);
        } else if (actionType === 'self_action' && payload.seat !== undefined && payload.action) {
          const prev = stateRef.current;
          const next = commit(current => applySelfAction(current, payload.seat!, payload.action!, payload.tile));
          if (next !== prev && payload.action !== 'hu') sound.playTileClick();
        }
      };

      socket.on('joined_room', handleJoinedRoom);
      socket.on('room_updated', handleRoomUpdated);
      socket.on('peer_game_action', handlePeerAction);

      return () => {
        socket?.off('joined_room', handleJoinedRoom);
        socket?.off('room_updated', handleRoomUpdated);
        socket?.off('peer_game_action', handlePeerAction);
      };
    } catch (error) {
      console.error('Socket setup error:', error);
    }
  }, [roomId, playerName, clearDrawTimer, commit, performClaim, performDiscard, performDraw]);

  return {
    gameState,
    setGameState,
    localPlayerSeat,
    setLocalPlayerSeat,
    availableActions,
    botStatusMessages,
    timeLeft,
    startNewRound,
    discardTile: handlePlayerDiscard,
    executeClaim: handlePlayerClaim,
    handlePass,
    handleSelfAction,
  };
}
