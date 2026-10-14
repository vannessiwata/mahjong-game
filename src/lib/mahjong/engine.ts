import { AvailableAction, GameState, Meld, Player, Tile, WinResult } from './types';
import { areTilesEqual, generateTileDeck, shuffleDeck } from './tiles';
import { botDecideClaim } from './bot';
import {
  calculateFans,
  canExposedGang,
  canPeng,
  getChiOptions,
  isWinningHand,
} from './rules';

/**
 * Playable tiles are the concealed hand plus every tile locked in a meld.
 * Flowers live beside the hand and are not part of this count.
 *
 * A player waiting to draw holds 13 + one extra tile per kong.
 * After a draw, a chow, a pung, or a kong's replacement tile, they hold
 * 14 + one extra tile per kong and must discard. A second draw or a claim
 * on top of a draw pushes that count to 15 or more, which is illegal.
 */
export function gangCount(melds: Meld[]): number {
  return melds.filter(m => m.type === 'gang' || m.type === 'bu_gang' || m.type === 'an_gang').length;
}

export function playableCount(player: Player): number {
  const meldTiles = player.melds.reduce((sum, meld) => sum + meld.tiles.length, 0);
  return player.hand.length + meldTiles;
}

export function waitingTileCount(player: Player): number {
  return 13 + gangCount(player.melds);
}

export function actionTileCount(player: Player): number {
  return 14 + gangCount(player.melds);
}

export function needsDraw(player: Player): boolean {
  return playableCount(player) === waitingTileCount(player);
}

export function needsDiscard(player: Player): boolean {
  return playableCount(player) === actionTileCount(player);
}

export interface AutoClaim {
  seat: number;
  type: 'hu' | 'gang' | 'peng' | 'chi';
  tiles?: Tile[];
}

const CLAIM_RANK: Record<AutoClaim['type'], number> = {
  hu: 3,
  gang: 2,
  peng: 2,
  chi: 1,
};

const CLAIM_TIEBREAK: Record<AutoClaim['type'], number> = {
  hu: 3,
  gang: 2,
  peng: 1,
  chi: 0,
};

function seatDistance(fromSeat: number, seat: number): number {
  return (seat - fromSeat + 4) % 4;
}

/** True when `a` must be resolved before `b` (Hu > Pung/Kong > Chow, then nearer seat). */
export function claimOutranks(a: AutoClaim, b: AutoClaim, fromSeat: number): boolean {
  const rankA = CLAIM_RANK[a.type];
  const rankB = CLAIM_RANK[b.type];
  if (rankA !== rankB) return rankA > rankB;
  const distA = seatDistance(fromSeat, a.seat);
  const distB = seatDistance(fromSeat, b.seat);
  if (distA !== distB) return distA < distB;
  return CLAIM_TIEBREAK[a.type] > CLAIM_TIEBREAK[b.type];
}

function withLog(state: GameState, message: string): GameState {
  return { ...state, log: [message, ...state.log.slice(0, 30)] };
}

function replacePlayer(players: Player[], seat: number, update: (player: Player) => Player): Player[] {
  return players.map(player => (player.seat === seat ? update(player) : player));
}

function takeMatching(
  hand: Tile[],
  tile: Tile,
  count: number,
  exceptId?: string,
): { taken: Tile[]; rest: Tile[] } | null {
  const taken: Tile[] = [];
  const rest: Tile[] = [];
  for (const candidate of hand) {
    if (taken.length < count && candidate.id !== exceptId && areTilesEqual(candidate, tile)) {
      taken.push(candidate);
    } else {
      rest.push(candidate);
    }
  }
  if (taken.length !== count) return null;
  return { taken, rest };
}

function takeByIds(hand: Tile[], ids: string[]): { taken: Tile[]; rest: Tile[] } | null {
  const needed = new Set(ids);
  if (needed.size !== ids.length) return null;
  const taken: Tile[] = [];
  const rest: Tile[] = [];
  for (const candidate of hand) {
    if (needed.has(candidate.id)) {
      taken.push(candidate);
      needed.delete(candidate.id);
    } else {
      rest.push(candidate);
    }
  }
  if (needed.size > 0) return null;
  return { taken, rest };
}

function withoutTileId(tiles: Tile[], id: string): Tile[] {
  const index = tiles.findIndex(tile => tile.id === id);
  if (index === -1) return tiles;
  const next = tiles.slice();
  next.splice(index, 1);
  return next;
}

/** Draw the next non-flower tile, banking any flowers that come off the wall first. */
function drawPlayable(wall: Tile[], flowers: Tile[]): { tile: Tile | null; wall: Tile[]; flowers: Tile[] } {
  const nextFlowers = flowers.slice();
  let rest = wall;
  while (rest.length > 0) {
    const next = rest[0];
    rest = rest.slice(1);
    if (next.suit === 'flower') {
      nextFlowers.push(next);
      continue;
    }
    return { tile: next, wall: rest, flowers: nextFlowers };
  }
  return { tile: null, wall: rest, flowers: nextFlowers };
}

function matchChiOption(hand: Tile[], discard: Tile, claimedTiles?: Tile[]): Tile[] | null {
  const options = getChiOptions(hand, discard);
  if (options.length === 0) return null;
  if (!claimedTiles || claimedTiles.length === 0) return options[0];

  const claimedIds = new Set(claimedTiles.map(tile => tile.id));
  const byId = options.find(option => option.every(tile => claimedIds.has(tile.id)));
  if (byId) return byId;

  const claimedFaces = claimedTiles.filter(tile => tile.id !== discard.id);
  const byFace = options.find(option =>
    option.every(tile => claimedFaces.some(claimed => areTilesEqual(claimed, tile))),
  );
  return byFace ?? null;
}

export function dealDeck(
  deck: Tile[],
  players: Player[],
  dealerSeat: number,
): { players: Player[]; wall: Tile[]; lastDrawnTile: Tile } {
  const hands: Tile[][] = [[], [], [], []];
  let index = 0;
  for (let round = 0; round < 3; round++) {
    for (let seat = 0; seat < 4; seat++) {
      for (let n = 0; n < 4; n++) hands[seat].push(deck[index++]);
    }
  }
  for (let seat = 0; seat < 4; seat++) hands[seat].push(deck[index++]);
  hands[dealerSeat].push(deck[index++]);

  let wall = deck.slice(index);
  const flowers: Tile[][] = [[], [], [], []];
  const playable: Tile[][] = [[], [], [], []];

  for (let seat = 0; seat < 4; seat++) {
    const kept: Tile[] = [];
    for (const tile of hands[seat]) {
      if (tile.suit === 'flower') flowers[seat].push(tile);
      else kept.push(tile);
    }
    const target = seat === dealerSeat ? 14 : 13;
    const extras: Tile[] = [];
    while (kept.length + extras.length < target && wall.length > 0) {
      const next = wall[0];
      wall = wall.slice(1);
      if (next.suit === 'flower') flowers[seat].push(next);
      else extras.push(next);
    }
    playable[seat] = [...kept, ...extras];
  }

  const lastDrawnTile = playable[dealerSeat][playable[dealerSeat].length - 1];
  const nextPlayers = players.map((player, seat) => ({
    ...player,
    hand: playable[seat],
    melds: [],
    flowers: flowers[seat],
    discards: [],
  }));

  return { players: nextPlayers, wall, lastDrawnTile };
}

export function startRound(state: GameState): GameState {
  const deck = shuffleDeck(generateTileDeck(state.settings.includeFlowers));
  const dealt = dealDeck(deck, state.players, state.dealerSeat);
  const dealerName = dealt.players[state.dealerSeat]?.name ?? 'Dealer';
  return {
    ...state,
    phase: 'playing',
    players: dealt.players,
    wall: dealt.wall,
    currentTurn: state.dealerSeat,
    lastDiscard: undefined,
    pendingClaims: {},
    lastDrawnTile: dealt.lastDrawnTile,
    winResult: undefined,
    log: [`Round started! Dealer is ${dealerName}.`, ...state.log.slice(0, 30)],
  };
}

export function applyDraw(state: GameState, seat: number): GameState {
  // A claim-window draw is only the next seat after a discarded tile.
  // A playing-phase draw is only the kong replacement for the seat already to move.
  // Anything else (a stale timer, a second pull) would leave two players holding 14.
  if (state.phase === 'claim_window') {
    if (!state.lastDiscard || seat !== (state.lastDiscard.seat + 1) % 4) return state;
  } else if (state.phase === 'playing') {
    if (state.currentTurn !== seat) return state;
  } else {
    return state;
  }

  const player = state.players.find(candidate => candidate.seat === seat);
  if (!player || !needsDraw(player)) return state;

  const pulled = drawPlayable(state.wall, player.flowers);
  const players = replacePlayer(state.players, seat, current => ({
    ...current,
    flowers: pulled.flowers,
    hand: pulled.tile ? [...current.hand, pulled.tile] : current.hand,
  }));

  if (!pulled.tile) {
    return withLog(
      {
        ...state,
        players,
        wall: pulled.wall,
        phase: 'round_end',
        lastDiscard: undefined,
        lastDrawnTile: undefined,
        pendingClaims: {},
      },
      'Wall exhausted. The round is a draw.',
    );
  }

  return {
    ...state,
    players,
    wall: pulled.wall,
    phase: 'playing',
    currentTurn: seat,
    lastDrawnTile: pulled.tile,
    lastDiscard: undefined,
    pendingClaims: {},
  };
}

export function applyDiscard(state: GameState, seat: number, tile: Tile): GameState {
  if (state.phase !== 'playing' || state.currentTurn !== seat) return state;
  const player = state.players.find(candidate => candidate.seat === seat);
  if (!player || !needsDiscard(player)) return state;
  if (!player.hand.some(candidate => candidate.id === tile.id)) return state;

  const hand = withoutTileId(player.hand, tile.id);
  const removed = player.hand.find(candidate => candidate.id === tile.id)!;
  const players = replacePlayer(state.players, seat, current => ({
    ...current,
    hand,
    discards: [...current.discards, removed],
  }));

  return withLog(
    {
      ...state,
      players,
      lastDiscard: { tile: removed, seat },
      lastDrawnTile: undefined,
      phase: 'claim_window',
      pendingClaims: {},
    },
    `${player.name} discarded ${removed.chinese || removed.name}.`,
  );
}

function scoreRon(
  state: GameState,
  claimSeat: number,
  fromSeat: number,
  discarded: Tile,
): GameState | null {
  const winner = state.players.find(player => player.seat === claimSeat);
  if (!winner || !isWinningHand(winner.hand, discarded)) return null;

  const { fans, totalFan, qualifies } = calculateFans(
    winner.hand,
    winner.melds,
    discarded,
    false,
    claimSeat,
    state.prevWind,
    winner.flowers,
    state.settings.minFan,
  );
  if (!qualifies) return null;

  const basePoints = Math.pow(2, totalFan) * 10;
  const scoreDiff: { [seat: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };
  scoreDiff[claimSeat] = basePoints;
  scoreDiff[fromSeat] = -basePoints;
  const winResult: WinResult = {
    winnerSeat: claimSeat,
    fromSeat,
    isZimo: false,
    winningTile: discarded,
    fans,
    totalFan,
    scoreChange: scoreDiff,
  };

  return withLog(
    {
      ...state,
      phase: 'round_end',
      lastDiscard: undefined,
      players: state.players.map(player => ({
        ...player,
        score: player.score + (scoreDiff[player.seat] || 0),
      })),
      winResult,
    },
    `🀄 HU! ${winner.name} won off ${state.players[fromSeat].name} with ${totalFan} Fan!`,
  );
}

function scoreZimo(state: GameState, seat: number): GameState | null {
  const player = state.players.find(candidate => candidate.seat === seat);
  if (!player || !needsDiscard(player) || !isWinningHand(player.hand)) return null;

  const lastTile =
    state.lastDrawnTile && player.hand.some(tile => tile.id === state.lastDrawnTile?.id)
      ? state.lastDrawnTile
      : player.hand[player.hand.length - 1];
  const handWithoutLast = withoutTileId(player.hand, lastTile.id);
  const { fans, totalFan, qualifies } = calculateFans(
    handWithoutLast,
    player.melds,
    lastTile,
    true,
    seat,
    state.prevWind,
    player.flowers,
    state.settings.minFan,
  );
  if (!qualifies) return null;

  const basePoints = Math.pow(2, totalFan) * 10;
  const scoreDiff: { [seat: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (let other = 0; other < 4; other++) {
    scoreDiff[other] = other === seat ? basePoints * 3 : -basePoints;
  }
  const winResult: WinResult = {
    winnerSeat: seat,
    isZimo: true,
    winningTile: lastTile,
    fans,
    totalFan,
    scoreChange: scoreDiff,
  };

  return withLog(
    {
      ...state,
      phase: 'round_end',
      players: state.players.map(current => ({
        ...current,
        score: current.score + (scoreDiff[current.seat] || 0),
      })),
      winResult,
    },
    `🀄 ZIMO! ${player.name} won by Self-Draw with ${totalFan} Fan!`,
  );
}

export function applyClaim(
  state: GameState,
  claimSeat: number,
  claimType: 'chi' | 'peng' | 'gang' | 'hu',
  claimedTiles?: Tile[],
): GameState {
  if (state.phase !== 'claim_window' || !state.lastDiscard) return state;
  const { tile: discarded, seat: fromSeat } = state.lastDiscard;
  if (claimSeat === fromSeat) return state;

  const claimer = state.players.find(player => player.seat === claimSeat);
  // A player who already holds the extra tile (just drew, or already claimed)
  // cannot take this discard as well. That double-dip is what grew hands to 15.
  if (!claimer || !needsDraw(claimer)) return state;

  if (claimType === 'hu') {
    return scoreRon(state, claimSeat, fromSeat, discarded) ?? state;
  }
  if (claimType === 'chi' && seatDistance(fromSeat, claimSeat) !== 1) return state;

  let hand = claimer.hand;
  let meldTiles: Tile[] | null = null;

  if (claimType === 'peng') {
    const taken = takeMatching(hand, discarded, 2, discarded.id);
    if (!taken) return state;
    hand = taken.rest;
    meldTiles = [...taken.taken, discarded];
  } else if (claimType === 'gang') {
    const taken = takeMatching(hand, discarded, 3, discarded.id);
    if (!taken) return state;
    hand = taken.rest;
    meldTiles = [...taken.taken, discarded];
  } else if (claimType === 'chi') {
    const pair = matchChiOption(hand, discarded, claimedTiles);
    if (!pair) return state;
    const taken = takeByIds(hand, pair.map(tile => tile.id));
    if (!taken) return state;
    hand = taken.rest;
    meldTiles = [...taken.taken, discarded].sort((a, b) => a.value - b.value);
  }

  if (!meldTiles) return state;

  const meld: Meld = {
    type: claimType,
    tiles: meldTiles,
    claimedFrom: fromSeat,
    claimedTile: discarded,
  };

  const claimed: GameState = withLog(
    {
      ...state,
      players: state.players.map(player => {
        if (player.seat === claimSeat) {
          return { ...player, hand, melds: [...player.melds, meld] };
        }
        if (player.seat === fromSeat) {
          return { ...player, discards: withoutTileId(player.discards, discarded.id) };
        }
        return player;
      }),
      currentTurn: claimSeat,
      phase: 'playing',
      lastDiscard: undefined,
      lastDrawnTile: undefined,
      pendingClaims: {},
    },
    `${claimer.name} declared ${claimType.toUpperCase()}!`,
  );

  // The replacement tile is part of the kong itself. A later, separate draw
  // could race with the next turn and add a second tile.
  if (claimType === 'gang') return applyDraw(claimed, claimSeat);
  return claimed;
}

export function applySelfAction(
  state: GameState,
  seat: number,
  action: 'hu' | 'an_gang' | 'bu_gang',
  tile?: Tile,
): GameState {
  if (state.phase !== 'playing' || state.currentTurn !== seat) return state;
  const player = state.players.find(candidate => candidate.seat === seat);
  if (!player || !needsDiscard(player)) return state;

  if (action === 'hu') return scoreZimo(state, seat) ?? state;
  if (!tile) return state;

  if (action === 'an_gang') {
    const taken = takeMatching(player.hand, tile, 4);
    if (!taken) return state;
    const concealed: GameState = withLog(
      {
        ...state,
        players: replacePlayer(state.players, seat, current => ({
          ...current,
          hand: taken.rest,
          melds: [...current.melds, { type: 'an_gang', tiles: taken.taken }],
        })),
        lastDrawnTile: undefined,
      },
      `${player.name} declared Concealed Kong (暗槓)!`,
    );
    return applyDraw(concealed, seat);
  }

  if (action === 'bu_gang') {
    const pengIndex = player.melds.findIndex(
      meld => meld.type === 'peng' && areTilesEqual(meld.tiles[0], tile),
    );
    if (pengIndex === -1) return state;
    const taken = takeMatching(player.hand, tile, 1);
    if (!taken) return state;
    const addedTile = taken.taken[0];
    const upgraded: GameState = withLog(
      {
        ...state,
        players: replacePlayer(state.players, seat, current => ({
          ...current,
          hand: taken.rest,
          melds: current.melds.map((meld, index) =>
            index === pengIndex
              ? { ...meld, type: 'bu_gang' as const, tiles: [...meld.tiles, addedTile] }
              : meld,
          ),
        })),
        lastDrawnTile: undefined,
      },
      `${player.name} declared Added Kong (補槓)!`,
    );
    return applyDraw(upgraded, seat);
  }

  return state;
}

export function evaluateClaimWindow(
  state: GameState,
  localSeat: number,
  options?: {
    ignoreHuman?: boolean;
    decideBot?: typeof botDecideClaim;
  },
): { humanActions: AvailableAction[]; autoClaim: AutoClaim | null } {
  if (state.phase !== 'claim_window' || !state.lastDiscard) {
    return { humanActions: [], autoClaim: null };
  }

  const { tile, seat: fromSeat } = state.lastDiscard;
  const decideBot = options?.decideBot ?? botDecideClaim;
  const humanActions: AvailableAction[] = [];
  const botClaims: AutoClaim[] = [];

  for (const player of state.players) {
    if (player.seat === fromSeat || !needsDraw(player)) continue;

    if (!player.isBot && player.seat === localSeat) {
      if (options?.ignoreHuman) continue;
      if (isWinningHand(player.hand, tile)) {
        const { qualifies } = calculateFans(
          player.hand,
          player.melds,
          tile,
          false,
          player.seat,
          state.prevWind,
          player.flowers,
          state.settings.minFan,
        );
        if (qualifies) humanActions.push({ type: 'hu', tile });
      }
      if (canExposedGang(player.hand, tile)) humanActions.push({ type: 'gang', tile });
      if (canPeng(player.hand, tile)) humanActions.push({ type: 'peng', tile });
      if (seatDistance(fromSeat, player.seat) === 1) {
        const chiOptions = getChiOptions(player.hand, tile);
        if (chiOptions.length > 0) humanActions.push({ type: 'chi', options: chiOptions, tile });
      }
      continue;
    }

    if (!player.isBot) continue;

    const decision = decideBot(player, tile, fromSeat, state.prevWind, state.settings.minFan);
    if (decision.type === 'pass') continue;
    if (decision.type === 'chi' && seatDistance(fromSeat, player.seat) !== 1) continue;
    botClaims.push({ seat: player.seat, type: decision.type, tiles: decision.tiles });
  }

  let bestBot: AutoClaim | null = null;
  for (const claim of botClaims) {
    if (!bestBot || claimOutranks(claim, bestBot, fromSeat)) bestBot = claim;
  }

  const surviving = bestBot
    ? humanActions.filter(action =>
        !claimOutranks(bestBot!, { seat: localSeat, type: action.type }, fromSeat),
      )
    : humanActions;

  if (surviving.length > 0) return { humanActions: surviving, autoClaim: null };
  return { humanActions: [], autoClaim: bestBot };
}

export function collectTileIds(state: GameState): string[] {
  const ids: string[] = [];
  for (const tile of state.wall) ids.push(tile.id);
  for (const tile of state.deadWall) ids.push(tile.id);
  for (const player of state.players) {
    for (const tile of player.hand) ids.push(tile.id);
    for (const tile of player.flowers) ids.push(tile.id);
    for (const tile of player.discards) ids.push(tile.id);
    for (const meld of player.melds) {
      for (const tile of meld.tiles) ids.push(tile.id);
    }
  }
  return ids;
}

/** Returns a description of an illegal table, or null when the counts are legal. */
export function describeHandProblem(state: GameState, fullDeck = false): string | null {
  const ids = collectTileIds(state);
  if (new Set(ids).size !== ids.length) return 'duplicate tile id on the table';

  if (fullDeck && state.phase !== 'lobby') {
    const expected = state.settings.includeFlowers ? 144 : 136;
    if (ids.length !== expected) return `tile ledger ${ids.length} !== ${expected}`;
  }

  for (const player of state.players) {
    if (player.hand.some(tile => tile.suit === 'flower')) {
      return `${player.name} is holding a flower in hand`;
    }
    const playable = playableCount(player);
    const cap = actionTileCount(player);
    const floor = waitingTileCount(player);
    if (playable > cap) return `${player.name} has ${playable} tiles, maximum is ${cap}`;

    if (state.phase === 'playing' || state.phase === 'claim_window') {
      const expectAction = state.phase === 'playing' && player.seat === state.currentTurn;
      const expected = expectAction ? cap : floor;
      if (playable !== expected) {
        return `${player.name} has ${playable} tiles, expected ${expected}`;
      }
    }
  }

  return null;
}
