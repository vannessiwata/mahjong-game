'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Tile, WinResult, AvailableAction } from '@/lib/mahjong/types';
import { generateTileDeck, shuffleDeck, areTilesEqual } from '@/lib/mahjong/tiles';
import { canPeng, canExposedGang, getChiOptions, isWinningHand, calculateFans, getSelfGangOptions } from '@/lib/mahjong/rules';
import { botChooseDiscard, botDecideClaim, botDecideSelfAction } from '@/lib/mahjong/bot';
import { sound } from '@/lib/mahjong/audio';

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
}

export function useMahjongGame(options?: UseMahjongGameOptions) {
  const roomId = options?.roomId || null;
  const playerName = options?.playerName || 'You';
  const initialMinFan = options?.minFan ?? 0;

  const [gameState, setGameState] = useState<GameState>({
    roomId: roomId || 'LOCAL_ROOM',
    phase: 'lobby',
    settings: {
      minFan: initialMinFan,
      maxFan: 10,
      includeFlowers: true,
      turnTimeLimit: 0,
    },
    players: INITIAL_PLAYERS,
    wall: [],
    deadWall: [],
    currentTurn: 0,
    dealerSeat: 0,
    prevWind: 'east',
    pendingClaims: {},
    log: ['Welcome to Hong Kong Mahjong! Choose Solo vs AI or Online Multiplayer.'],
  });

  const [localPlayerSeat, setLocalPlayerSeat] = useState<number>(0);
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([]);
  const [botStatusMessages, setBotStatusMessages] = useState<{ [seat: number]: string }>({});
  const TURN_TIME_LIMIT = 120; // 2 minutes (120 seconds) per turn
  const [timeLeft, setTimeLeft] = useState<number>(TURN_TIME_LIMIT);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const localSeatRef = useRef(localPlayerSeat);
  localSeatRef.current = localPlayerSeat;
  // Track pending draw timers so we can cancel them when a claim is executed
  const pendingDrawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add message to in-game activity feed
  const addLog = useCallback((msg: string) => {
    setGameState(prev => ({
      ...prev,
      log: [msg, ...prev.log.slice(0, 30)],
    }));
  }, []);

  // Set bot temporary action message bubble
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

  /**
   * Start a new game / round. Deals initial hands.
   */
  const startNewRound = useCallback(() => {
    sound.playShuffle();
    const fullDeck = generateTileDeck(stateRef.current.settings.includeFlowers);
    const shuffled = shuffleDeck(fullDeck);

    // Filter out flowers first if auto-drawing replacement flowers
    const regularTiles: Tile[] = [];
    const flowersBySeat: { [seat: number]: Tile[] } = { 0: [], 1: [], 2: [], 3: [] };

    // Standard deal: 13 tiles to South, West, North; 14 to Dealer East
    const hands: Tile[][] = [[], [], [], []];
    let tileIndex = 0;

    // Deal 13 tiles each (dealer gets 14th)
    for (let round = 0; round < 3; round++) {
      for (let s = 0; s < 4; s++) {
        for (let t = 0; t < 4; t++) {
          hands[s].push(shuffled[tileIndex++]);
        }
      }
    }
    // 13th tile
    for (let s = 0; s < 4; s++) {
      hands[s].push(shuffled[tileIndex++]);
    }
    // 14th tile to dealer (Seat 0 initially)
    const dealer = stateRef.current.dealerSeat;
    const initialDrawnTile = shuffled[tileIndex++];
    hands[dealer].push(initialDrawnTile);

    // Remaining tiles make up the draw wall
    const wall = shuffled.slice(tileIndex);

    const updatedPlayers = stateRef.current.players.map((p, idx) => ({
      ...p,
      hand: hands[idx],
      melds: [],
      flowers: flowersBySeat[idx] || [],
      discards: [],
    }));

    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      players: updatedPlayers,
      wall,
      currentTurn: dealer,
      lastDiscard: undefined,
      pendingClaims: {},
      lastDrawnTile: initialDrawnTile,
      winResult: undefined,
    }));

    setAvailableActions([]);
    addLog(`Round started! Dealer is ${updatedPlayers[dealer].name}.`);
  }, [addLog]);

  /**
   * Player or Bot draws a tile from the wall.
   */
  const drawTileForSeat = useCallback((seat: number) => {
    setGameState(prev => {
      if (prev.wall.length === 0) {
        // Wall exhausted -> Liu Ju / Draw!
        return { ...prev, phase: 'round_end' };
      }

      // Safety guard: never exceed 14 tiles (13 hand + 1 draw = 14 max)
      const player = prev.players[seat];
      const totalTiles = player.hand.length + player.melds.length * 3;
      if (totalTiles >= 14) {
        console.warn(`[drawTileForSeat] Skipped: seat ${seat} already has ${totalTiles} tiles.`);
        return prev;
      }

      const nextWall = [...prev.wall];
      const drawnTile = nextWall.shift()!;
      sound.playTileClick();

      const nextPlayers = prev.players.map(p => {
        if (p.seat === seat) {
          return { ...p, hand: [...p.hand, drawnTile] };
        }
        return p;
      });

      return {
        ...prev,
        wall: nextWall,
        players: nextPlayers,
        currentTurn: seat,
        lastDrawnTile: drawnTile,
        phase: 'playing',
        pendingClaims: {},
      };
    });
  }, []);

  /**
   * Discard a tile from the active player's hand.
   */
  const discardTile = useCallback((seat: number, tile: Tile) => {
    sound.playTileDiscard();

    setGameState(prev => {
      const activePlayer = prev.players[seat];
      const newHand = activePlayer.hand.filter(t => t.id !== tile.id);
      const newDiscards = [...activePlayer.discards, tile];

      const nextPlayers = prev.players.map(p => {
        if (p.seat === seat) {
          return { ...p, hand: newHand, discards: newDiscards };
        }
        return p;
      });

      return {
        ...prev,
        players: nextPlayers,
        lastDiscard: { tile, seat },
        phase: 'claim_window',
        lastDrawnTile: undefined,
        pendingClaims: {},
      };
    });

    addLog(`${stateRef.current.players[seat].name} discarded ${tile.chinese || tile.name}.`);
  }, [addLog]);

  /**
   * Execute a claim (Hu, Gang, Peng, Chi).
   */
  const executeClaim = useCallback((
    claimSeat: number,
    claimType: 'chi' | 'peng' | 'gang' | 'hu',
    claimedTiles?: Tile[]
  ) => {
    // Cancel any pending draw timer — a claim takes priority
    if (pendingDrawTimerRef.current !== null) {
      clearTimeout(pendingDrawTimerRef.current);
      pendingDrawTimerRef.current = null;
    }

    const state = stateRef.current;
    if (!state.lastDiscard) return;
    const { tile: discardedTile, seat: fromSeat } = state.lastDiscard;

    setAvailableActions([]);
    sound.playClaimChime();

    // 1. HU (Win)
    if (claimType === 'hu') {
      const winner = state.players[claimSeat];
      const { fans, totalFan } = calculateFans(
        winner.hand,
        winner.melds,
        discardedTile,
        false,
        claimSeat,
        state.prevWind,
        winner.flowers,
        state.settings.minFan
      );

      // Points calculation (HK rules: payer pays full)
      const basePoints = Math.pow(2, totalFan) * 10;
      const scoreDiff: { [seat: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };
      scoreDiff[claimSeat] = basePoints;
      scoreDiff[fromSeat] = -basePoints;

      const updatedPlayers = state.players.map(p => ({
        ...p,
        score: p.score + (scoreDiff[p.seat] || 0),
      }));

      const winResult: WinResult = {
        winnerSeat: claimSeat,
        fromSeat,
        isZimo: false,
        winningTile: discardedTile,
        fans,
        totalFan,
        scoreChange: scoreDiff,
      };

      setGameState(prev => ({
        ...prev,
        phase: 'round_end',
        players: updatedPlayers,
        winResult,
      }));

      addLog(`🀄 HU! ${winner.name} won off ${state.players[fromSeat].name} with ${totalFan} Fan!`);
      return;
    }

    // 2. Chi, Peng, or Gang
    const claimingPlayer = state.players[claimSeat];
    let meldTiles: Tile[] = [];

    if (claimType === 'peng') {
      const handMatches = claimingPlayer.hand.filter(t => areTilesEqual(t, discardedTile)).slice(0, 2);
      meldTiles = [...handMatches, discardedTile];
      setBotStatus(claimSeat, 'PENG! (碰)');
    } else if (claimType === 'gang') {
      const handMatches = claimingPlayer.hand.filter(t => areTilesEqual(t, discardedTile)).slice(0, 3);
      meldTiles = [...handMatches, discardedTile];
      setBotStatus(claimSeat, 'KONG! (槓)');
    } else if (claimType === 'chi') {
      if (claimedTiles && claimedTiles.length === 3) {
        meldTiles = claimedTiles;
      } else {
        const opts = getChiOptions(claimingPlayer.hand, discardedTile);
        if (opts.length > 0) {
          meldTiles = [...opts[0], discardedTile];
        } else if (claimedTiles && claimedTiles.length > 0) {
          meldTiles = [...claimedTiles, discardedTile];
        }
      }
      setBotStatus(claimSeat, 'CHOW! (吃)');
    }

    // Remove the meld tiles from player's hand.
    // The discardedTile came from the discard pile (not from hand), so exclude it by ID only.
    // Do NOT use areTilesEqual here — it only compares suit+value, not ID, which would
    // accidentally skip a hand tile that has the same suit+value as the discarded tile.
    const tilesToRemove = meldTiles.filter(t => t.id !== discardedTile.id);

    let remainingHand = [...claimingPlayer.hand];
    for (const t of tilesToRemove) {
      // First try exact ID match (most reliable)
      let idx = remainingHand.findIndex(h => h.id === t.id);
      // Fallback: match by suit+value (in case of id mismatch from multiplayer sync)
      if (idx === -1) {
        idx = remainingHand.findIndex(h => areTilesEqual(h, t));
      }
      if (idx !== -1) {
        remainingHand.splice(idx, 1);
      }
    }

    // Remove claimed tile from discard pool of fromSeat
    const updatedDiscards = state.players[fromSeat].discards.filter(t => t.id !== discardedTile.id);

    const updatedPlayers = state.players.map(p => {
      if (p.seat === claimSeat) {
        return {
          ...p,
          hand: remainingHand,
          melds: [...p.melds, { type: claimType, tiles: meldTiles, claimedFrom: fromSeat, claimedTile: discardedTile }],
        };
      }
      if (p.seat === fromSeat) {
        return { ...p, discards: updatedDiscards };
      }
      return p;
    });

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      currentTurn: claimSeat,
      phase: 'playing',
      lastDiscard: undefined,
      lastDrawnTile: undefined,
      pendingClaims: {},
    }));

    addLog(`${claimingPlayer.name} declared ${claimType.toUpperCase()}!`);

    // If Gang was declared, draw replacement tile from wall
    if (claimType === 'gang') {
      setTimeout(() => {
        drawTileForSeat(claimSeat);
      }, 500);
    }
  }, [addLog, setBotStatus, drawTileForSeat]);

  /**
   * Check claims on the newly discarded tile for all players.
   */
  const processDiscardClaims = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== 'claim_window' || !state.lastDiscard) return;

    const { tile, seat: discardSeat } = state.lastDiscard;
    const localSeat = localPlayerSeat;
    const localPlayer = state.players[localSeat];
    const isHost = localSeat === 0;

    // Check actions available for human player if human is NOT the discarder
    if (localSeat !== discardSeat) {
      const actions: AvailableAction[] = [];

      // 1. Hu?
      if (isWinningHand(localPlayer.hand, tile)) {
        const { qualifies } = calculateFans(
          localPlayer.hand,
          localPlayer.melds,
          tile,
          false,
          localSeat,
          state.prevWind,
          localPlayer.flowers,
          state.settings.minFan
        );
        if (qualifies) {
          actions.push({ type: 'hu', tile });
        }
      }

      // 2. Gang?
      if (canExposedGang(localPlayer.hand, tile)) {
        actions.push({ type: 'gang', tile });
      }

      // 3. Peng?
      if (canPeng(localPlayer.hand, tile)) {
        actions.push({ type: 'peng', tile });
      }

      // 4. Chi? (Only from player to the left: (localSeat - 1 + 4) % 4 === discardSeat)
      if ((localSeat - 1 + 4) % 4 === discardSeat) {
        const chiOptions = getChiOptions(localPlayer.hand, tile);
        if (chiOptions.length > 0) {
          actions.push({ type: 'chi', options: chiOptions, tile });
        }
      }

      if (actions.length > 0) {
        setAvailableActions(actions);
        return; // Wait for human decision
      }
    }

    // In multiplayer mode, only HOST (seat 0) evaluates bots and triggers next draw.
    // Non-host players wait for peer_game_action events to update their state.
    if (roomId && !isHost) return;

    // Bots claims evaluation
    let highestClaim: { seat: number; type: 'hu' | 'gang' | 'peng' | 'chi'; tiles?: Tile[] } | null = null;

    for (const player of state.players) {
      if (player.seat === discardSeat || !player.isBot) continue;

      const decision = botDecideClaim(
        player,
        tile,
        discardSeat,
        state.prevWind,
        state.settings.minFan
      );

      if (decision.type === 'hu') {
        highestClaim = { seat: player.seat, type: 'hu' };
        break; // Hu has ultimate priority
      } else if (decision.type === 'gang' && (!highestClaim || highestClaim.type === 'chi')) {
        highestClaim = { seat: player.seat, type: 'gang', tiles: decision.tiles };
      } else if (decision.type === 'peng' && (!highestClaim || highestClaim.type === 'chi')) {
        highestClaim = { seat: player.seat, type: 'peng', tiles: decision.tiles };
      } else if (decision.type === 'chi' && !highestClaim) {
        highestClaim = { seat: player.seat, type: 'chi', tiles: decision.tiles };
      }
    }

    if (highestClaim) {
      executeClaim(highestClaim.seat, highestClaim.type, highestClaim.tiles);
      if (roomId) {
        try {
          const socket = getSocket();
          socket.emit('game_action', {
            roomId,
            actionType: 'claim',
            payload: { seat: highestClaim.seat, claimType: highestClaim.type, tiles: highestClaim.tiles },
          });
        } catch (e) {
          console.error('Failed to emit claim:', e);
        }
      }
    } else {
      // No claims -> next player draws from wall!
      const nextSeat = (discardSeat + 1) % 4;
      if (pendingDrawTimerRef.current !== null) {
        clearTimeout(pendingDrawTimerRef.current);
      }
      pendingDrawTimerRef.current = setTimeout(() => {
        pendingDrawTimerRef.current = null;
        drawTileForSeat(nextSeat);
        if (roomId) {
          try {
            const socket = getSocket();
            socket.emit('game_action', {
              roomId,
              actionType: 'draw',
              payload: { seat: nextSeat },
            });
          } catch (e) {
            console.error('Failed to emit draw:', e);
          }
        }
      }, 500);
    }
  }, [localPlayerSeat, drawTileForSeat, roomId, executeClaim]);

  /**
   * Human passes on claiming discard.
   */
  const handlePass = useCallback(() => {
    setAvailableActions([]);
    const state = stateRef.current;
    if (state.phase !== 'claim_window' || !state.lastDiscard) return;

    const { tile, seat: discardSeat } = state.lastDiscard;

    // After human passes, let bots evaluate claims first
    let highestClaim: { seat: number; type: 'hu' | 'gang' | 'peng' | 'chi'; tiles?: Tile[] } | null = null;
    for (const player of state.players) {
      if (player.seat === discardSeat || !player.isBot) continue;
      const decision = botDecideClaim(player, tile, discardSeat, state.prevWind, state.settings.minFan);
      if (decision.type === 'hu') {
        highestClaim = { seat: player.seat, type: 'hu' };
        break;
      } else if (decision.type === 'gang' && (!highestClaim || highestClaim.type === 'chi')) {
        highestClaim = { seat: player.seat, type: 'gang', tiles: decision.tiles };
      } else if (decision.type === 'peng' && (!highestClaim || highestClaim.type === 'chi')) {
        highestClaim = { seat: player.seat, type: 'peng', tiles: decision.tiles };
      } else if (decision.type === 'chi' && !highestClaim) {
        highestClaim = { seat: player.seat, type: 'chi', tiles: decision.tiles };
      }
    }

    if (highestClaim) {
      // A bot wants to claim — execute immediately (pendingDrawTimerRef already cleared by executeClaim)
      executeClaim(highestClaim.seat, highestClaim.type, highestClaim.tiles);
    } else {
      // No bot claims -> next player draws
      const nextSeat = (discardSeat + 1) % 4;
      if (pendingDrawTimerRef.current !== null) {
        clearTimeout(pendingDrawTimerRef.current);
      }
      pendingDrawTimerRef.current = setTimeout(() => {
        pendingDrawTimerRef.current = null;
        drawTileForSeat(nextSeat);
      }, 400);
    }
  }, [drawTileForSeat, executeClaim]);

  /**
   * Local player self action (Zimo Hu, An-gang, Bu-gang)
   */
  const handleSelfAction = useCallback((action: 'hu' | 'an_gang' | 'bu_gang', tile?: Tile) => {
    const state = stateRef.current;
    const player = state.players[localPlayerSeat];

    if (action === 'hu') {
      const lastTile = state.lastDrawnTile || player.hand[player.hand.length - 1];
      const handWithoutLast = player.hand.filter(t => t.id !== lastTile.id);

      const { fans, totalFan } = calculateFans(
        handWithoutLast,
        player.melds,
        lastTile,
        true,
        localPlayerSeat,
        state.prevWind,
        player.flowers,
        state.settings.minFan
      );

      // Zimo: All 3 other players pay
      const basePoints = Math.pow(2, totalFan) * 10;
      const scoreDiff: { [seat: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };
      for (let s = 0; s < 4; s++) {
        if (s === localPlayerSeat) {
          scoreDiff[s] = basePoints * 3;
        } else {
          scoreDiff[s] = -basePoints;
        }
      }

      const updatedPlayers = state.players.map(p => ({
        ...p,
        score: p.score + (scoreDiff[p.seat] || 0),
      }));

      const winResult: WinResult = {
        winnerSeat: localPlayerSeat,
        isZimo: true,
        winningTile: lastTile,
        fans,
        totalFan,
        scoreChange: scoreDiff,
      };

      setGameState(prev => ({
        ...prev,
        phase: 'round_end',
        players: updatedPlayers,
        winResult,
      }));

      addLog(`🀄 ZIMO! ${player.name} won by Self-Draw with ${totalFan} Fan!`);
    } else if (action === 'an_gang' && tile) {
      // Concealed Gang
      const matching = player.hand.filter(t => areTilesEqual(t, tile));
      const remaining = player.hand.filter(t => !areTilesEqual(t, tile));
      const nextPlayers = state.players.map(p => {
        if (p.seat === localPlayerSeat) {
          return {
            ...p,
            hand: remaining,
            melds: [...p.melds, { type: 'an_gang' as const, tiles: matching }],
          };
        }
        return p;
      });

      setGameState(prev => ({ ...prev, players: nextPlayers }));
      addLog(`${player.name} declared Concealed Kong (暗槓)!`);
      drawTileForSeat(localPlayerSeat);
    }
  }, [localPlayerSeat, addLog, drawTileForSeat]);

  // Handle active bot turn (Bot draws or discards)
  // In multiplayer room, ONLY host (seat 0) simulates bot moves to prevent dual simulation!
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    if (roomId && localSeatRef.current !== 0) return;

    const activePlayer = gameState.players[gameState.currentTurn];
    if (!activePlayer.isBot) return;

    // Bot's turn: think, check self actions, and discard
    const timer = setTimeout(() => {
      const state = stateRef.current;
      const bot = state.players[state.currentTurn];
      if (!bot.isBot) return;

      // Check bot self action (Zimo)
      const selfDecision = botDecideSelfAction(bot, state.prevWind, state.settings.minFan);
      if (selfDecision.type === 'hu') {
        const lastTile = bot.hand[bot.hand.length - 1];
        const handWithoutLast = bot.hand.slice(0, -1);
        const { fans, totalFan } = calculateFans(
          handWithoutLast,
          bot.melds,
          lastTile,
          true,
          bot.seat,
          state.prevWind,
          bot.flowers,
          state.settings.minFan
        );

        const basePoints = Math.pow(2, totalFan) * 10;
        const scoreDiff: { [seat: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };
        for (let s = 0; s < 4; s++) {
          scoreDiff[s] = s === bot.seat ? basePoints * 3 : -basePoints;
        }

        const updatedPlayers = state.players.map(p => ({
          ...p,
          score: p.score + (scoreDiff[p.seat] || 0),
        }));

        setGameState(prev => ({
          ...prev,
          phase: 'round_end',
          players: updatedPlayers,
          winResult: {
            winnerSeat: bot.seat,
            isZimo: true,
            winningTile: lastTile,
            fans,
            totalFan,
            scoreChange: scoreDiff,
          },
        }));

        addLog(`🀄 ZIMO! ${bot.name} won by Self-Draw!`);
        return;
      }

      // Bot discards a tile
      const discard = botChooseDiscard(bot);
      discardTile(bot.seat, discard);

      if (roomId) {
        try {
          const socket = getSocket();
          socket.emit('game_action', {
            roomId,
            actionType: 'discard',
            payload: { seat: bot.seat, tile: discard },
          });
        } catch (e) {
          console.error('Failed to emit bot discard:', e);
        }
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [gameState.phase, gameState.currentTurn, gameState.players, discardTile, addLog, roomId]);

  // Reset 2-minute timer on every turn change
  useEffect(() => {
    if (gameState.phase === 'playing') {
      setTimeLeft(TURN_TIME_LIMIT);
    }
  }, [gameState.currentTurn, gameState.phase]);

  // Turn timer countdown and random discard when 2 minutes expire
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time expired! Auto-discard random tile for current turn player
          const state = stateRef.current;
          const activePlayer = state.players[state.currentTurn];
          if (activePlayer && activePlayer.hand.length % 3 === 2) {
            const randomIndex = Math.floor(Math.random() * activePlayer.hand.length);
            const randomTile = activePlayer.hand[randomIndex];
            addLog(`⏰ Waktu 2 menit habis! ${activePlayer.name} otomatis membuang kartu (${randomTile.chinese || randomTile.name}).`);
            discardTile(activePlayer.seat, randomTile);
          }
          return TURN_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.phase, gameState.currentTurn, addLog, discardTile]);

  // Handle claim window transition — cancel previous pending draw before scheduling new one
  useEffect(() => {
    if (gameState.phase === 'claim_window') {
      if (pendingDrawTimerRef.current !== null) {
        clearTimeout(pendingDrawTimerRef.current);
        pendingDrawTimerRef.current = null;
      }
      const timer = setTimeout(() => {
        processDiscardClaims();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.lastDiscard, processDiscardClaims]);

  // SOCKET.IO MULTIPLAYER INTEGRATION
  useEffect(() => {
    if (!roomId) return;

    let socket: any = null;
    try {
      socket = getSocket();
      socket.connect();
      socket.emit('join_room', { roomId, playerName });

      const handleJoinedRoom = (data: { roomId: string; seat: number; roomPlayers: any[] }) => {
        console.log('[Multiplayer] Joined room as seat:', data.seat);
        if (data.seat !== -1) {
          setLocalPlayerSeat(data.seat);
          localSeatRef.current = data.seat;
        }
      };

      const handleRoomUpdated = (data: { players: any[] }) => {
        console.log('[Multiplayer] Room updated players:', data.players);
        setGameState(prev => {
          const updatedPlayers = prev.players.map((p, idx) => {
            const serverP = data.players[idx];
            if (serverP) {
              return {
                ...p,
                name: serverP.name || p.name,
                isBot: serverP.isBot,
                id: serverP.id || p.id,
              };
            }
            return p;
          });
          return { ...prev, players: updatedPlayers };
        });
      };

      const handlePeerAction = (data: { fromSocket: string; actionType: string; payload: any }) => {
        console.log('[Multiplayer] Peer action:', data.actionType, data.payload);
        const { actionType, payload } = data;

        if (actionType === 'start_round') {
          // Sync full round deal from host
          setGameState(prev => ({
            ...prev,
            phase: 'playing',
            players: payload.players,
            wall: payload.wall,
            currentTurn: payload.dealerSeat,
            dealerSeat: payload.dealerSeat,
            lastDiscard: undefined,
            pendingClaims: {},
            lastDrawnTile: payload.initialDrawnTile,
            winResult: undefined,
          }));
          setAvailableActions([]);
          addLog(`Multiplayer round started! Dealer is ${payload.players[payload.dealerSeat].name}.`);
        } else if (actionType === 'discard') {
          const { seat, tile } = payload;
          discardTile(seat, tile);
        } else if (actionType === 'draw') {
          const { seat } = payload;
          drawTileForSeat(seat);
        } else if (actionType === 'claim') {
          const { seat, claimType, tiles } = payload;
          executeClaim(seat, claimType, tiles);
        }
      };

      socket.on('joined_room', handleJoinedRoom);
      socket.on('room_updated', handleRoomUpdated);
      socket.on('peer_game_action', handlePeerAction);

      return () => {
        socket.off('joined_room', handleJoinedRoom);
        socket.off('room_updated', handleRoomUpdated);
        socket.off('peer_game_action', handlePeerAction);
      };
    } catch (err) {
      console.error('Socket setup error:', err);
    }
  }, [roomId, playerName, discardTile, drawTileForSeat, executeClaim, addLog]);

  // Wrapped actions that also broadcast to peers when in multiplayer room
  const handleMultiplayerStartRound = useCallback(() => {
    sound.playShuffle();
    const fullDeck = generateTileDeck(stateRef.current.settings.includeFlowers);
    const shuffled = shuffleDeck(fullDeck);

    const regularTiles: Tile[] = [];
    const flowersBySeat: { [seat: number]: Tile[] } = { 0: [], 1: [], 2: [], 3: [] };

    const hands: Tile[][] = [[], [], [], []];
    let tileIndex = 0;

    for (let round = 0; round < 3; round++) {
      for (let s = 0; s < 4; s++) {
        for (let t = 0; t < 4; t++) {
          hands[s].push(shuffled[tileIndex++]);
        }
      }
    }
    for (let s = 0; s < 4; s++) {
      hands[s].push(shuffled[tileIndex++]);
    }
    const dealer = stateRef.current.dealerSeat;
    const initialDrawnTile = shuffled[tileIndex++];
    hands[dealer].push(initialDrawnTile);

    const wall = shuffled.slice(tileIndex);

    const updatedPlayers = stateRef.current.players.map((p, idx) => ({
      ...p,
      hand: hands[idx],
      melds: [],
      flowers: flowersBySeat[idx] || [],
      discards: [],
    }));

    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      players: updatedPlayers,
      wall,
      currentTurn: dealer,
      lastDiscard: undefined,
      pendingClaims: {},
      lastDrawnTile: initialDrawnTile,
      winResult: undefined,
    }));

    setAvailableActions([]);
    addLog(`Round started! Dealer is ${updatedPlayers[dealer].name}.`);

    if (roomId) {
      try {
        const socket = getSocket();
        socket.emit('game_action', {
          roomId,
          actionType: 'start_round',
          payload: {
            players: updatedPlayers,
            wall,
            dealerSeat: dealer,
            initialDrawnTile,
          },
        });
      } catch (e) {
        console.error('Failed to emit start_round:', e);
      }
    }
  }, [roomId, addLog]);

  const handlePlayerDiscard = useCallback((tile: Tile) => {
    const seat = localSeatRef.current;
    discardTile(seat, tile);

    if (roomId) {
      try {
        const socket = getSocket();
        socket.emit('game_action', {
          roomId,
          actionType: 'discard',
          payload: { seat, tile },
        });
      } catch (e) {
        console.error('Failed to emit discard:', e);
      }
    }
  }, [roomId, discardTile]);

  const handlePlayerClaim = useCallback((type: 'chi' | 'peng' | 'gang' | 'hu', tiles?: Tile[]) => {
    const seat = localSeatRef.current;
    executeClaim(seat, type, tiles);

    if (roomId) {
      try {
        const socket = getSocket();
        socket.emit('game_action', {
          roomId,
          actionType: 'claim',
          payload: { seat, claimType: type, tiles },
        });
      } catch (e) {
        console.error('Failed to emit claim:', e);
      }
    }
  }, [roomId, executeClaim]);

  return {
    gameState,
    setGameState,
    localPlayerSeat,
    setLocalPlayerSeat,
    availableActions,
    botStatusMessages,
    timeLeft,
    startNewRound: roomId ? handleMultiplayerStartRound : startNewRound,
    discardTile: handlePlayerDiscard,
    executeClaim: handlePlayerClaim,
    handlePass,
    handleSelfAction,
  };
}
