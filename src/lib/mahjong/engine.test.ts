import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { botChooseDiscard, botDecideClaim, botDecideSelfAction } from './bot';
import {
  applyClaim,
  applyDiscard,
  applyDraw,
  applySelfAction,
  claimOutranks,
  dealDeck,
  describeHandProblem,
  evaluateClaimWindow,
  playableCount,
  startRound,
} from './engine';
import { generateTileDeck } from './tiles';
import { GameState, Player, Tile } from './types';

function tile(suit: Tile['suit'], value: number, id: string): Tile {
  return { id, suit, value, name: `${value} ${suit}`, chinese: `${suit}${value}` };
}

function makePlayers(isBot = true): Player[] {
  return [0, 1, 2, 3].map(seat => ({
    id: `p${seat}`,
    name: `P${seat}`,
    isBot,
    avatar: '🀄',
    seat,
    hand: [],
    melds: [],
    flowers: [],
    discards: [],
    score: 1000,
    isReady: true,
  }));
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomId: 'TEST',
    phase: 'lobby',
    settings: { minFan: 0, maxFan: 10, includeFlowers: true, turnTimeLimit: 0 },
    players: makePlayers(),
    wall: [],
    deadWall: [],
    currentTurn: 0,
    dealerSeat: 0,
    prevWind: 'east',
    pendingClaims: {},
    log: [],
    ...overrides,
  };
}

function filler(prefix: string, count: number, avoid?: { suit: Tile['suit']; value: number }): Tile[] {
  const tiles: Tile[] = [];
  let n = 0;
  while (tiles.length < count) {
    const value = (n % 9) + 1;
    const suit: Tile['suit'] = n % 2 === 0 ? 'tong' : 'tiao';
    n++;
    if (avoid && suit === avoid.suit && value === avoid.value) continue;
    tiles.push(tile(suit, value, `${prefix}_${tiles.length}`));
  }
  return tiles;
}

describe('deal and flowers', () => {
  it('deals 14 to the dealer and 13 to everyone else, with flowers set aside', () => {
    const deck = generateTileDeck(true);
    const flowerAt = deck.findIndex(candidate => candidate.suit === 'flower');
    [deck[0], deck[flowerAt]] = [deck[flowerAt], deck[0]];

    const dealt = dealDeck(deck, makePlayers(), 0);
    const state: GameState = {
      ...makeState(),
      phase: 'playing',
      players: dealt.players,
      wall: dealt.wall,
      currentTurn: 0,
      lastDrawnTile: dealt.lastDrawnTile,
    };

    assert.equal(dealt.players[0].hand.length, 14);
    assert.equal(dealt.players[1].hand.length, 13);
    assert.equal(dealt.players[2].hand.length, 13);
    assert.equal(dealt.players[3].hand.length, 13);
    assert.ok(dealt.players[0].flowers.length >= 1);
    assert.equal(dealt.players.every(player => player.hand.every(candidate => candidate.suit !== 'flower')), true);
    assert.equal(dealt.lastDrawnTile.suit === 'flower', false);
    assert.equal(describeHandProblem(state, true), null);
  });

  it('keeps a 136-tile deal inside the same limits', () => {
    const state = startRound(makeState({
      settings: { minFan: 0, maxFan: 10, includeFlowers: false, turnTimeLimit: 0 },
    }));
    assert.equal(state.players[0].hand.length, 14);
    assert.equal(state.players[1].flowers.length, 0);
    assert.equal(describeHandProblem(state, true), null);
  });

  it('replaces a flower drawn from the wall and still adds one playable tile', () => {
    const opened = startRound(makeState());
    const discarded = opened.players[0].hand[0];
    const afterDiscard = applyDiscard(opened, 0, discarded);
    const flowerIndex = afterDiscard.wall.findIndex(candidate => candidate.suit === 'flower');
    assert.ok(flowerIndex >= 0);
    const wall = afterDiscard.wall.slice();
    [wall[0], wall[flowerIndex]] = [wall[flowerIndex], wall[0]];
    const beforeFlowers = afterDiscard.players[1].flowers.length;
    const drawn = applyDraw({ ...afterDiscard, wall }, 1);

    assert.equal(drawn.players[1].hand.length, 14);
    assert.ok(drawn.players[1].flowers.length > beforeFlowers);
    assert.equal(drawn.lastDrawnTile?.suit === 'flower', false);
    assert.equal(describeHandProblem(drawn, true), null);
  });
});

describe('claim, draw, and discard counts', () => {
  function claimWindow(kind: 'peng' | 'gang' | 'chi'): GameState {
    const discard = tile('wan', kind === 'chi' ? 4 : 5, 'discard');
    const players = makePlayers();
    players[0] = {
      ...players[0],
      hand: filler('d0', 13),
      discards: [discard],
    };
    players[2] = { ...players[2], hand: filler('d2', 13) };
    players[3] = { ...players[3], hand: filler('d3', 13) };

    if (kind === 'chi') {
      players[1] = {
        ...players[1],
        hand: [tile('wan', 2, 'chi-2'), tile('wan', 3, 'chi-3'), ...filler('c1', 11, { suit: 'wan', value: 4 })],
      };
    } else {
      const copies = kind === 'gang' ? 3 : 2;
      const matches = Array.from({ length: copies }, (_, index) => tile('wan', 5, `match-${index}`));
      players[1] = {
        ...players[1],
        hand: [...matches, ...filler('c1', 13 - copies, { suit: 'wan', value: 5 })],
      };
    }

    return makeState({
      phase: 'claim_window',
      players,
      wall: [tile('tong', 9, 'repl'), tile('tiao', 9, 'repl-2'), ...filler('wall', 8)],
      lastDiscard: { tile: discard, seat: 0 },
      currentTurn: 0,
    });
  }

  it('pung leaves 14 playable tiles and refuses the wall draw', () => {
    const state = claimWindow('peng');
    const claimed = applyClaim(state, 1, 'peng');
    assert.equal(playableCount(claimed.players[1]), 14);
    assert.equal(claimed.players[1].hand.length, 11);
    assert.equal(claimed.players[1].melds[0]?.tiles.length, 3);
    assert.equal(claimed.phase, 'playing');

    const drawn = applyDraw(claimed, 1);
    assert.equal(drawn, claimed);
    const otherSeat = applyDraw(claimed, 2);
    assert.equal(otherSeat, claimed);
    assert.equal(describeHandProblem(claimed), null);
  });

  it('does not pung a hand that already drew the turn tile', () => {
    const state = claimWindow('peng');
    const drawn = applyDraw(state, 1);
    assert.equal(drawn.players[1].hand.length, 14);
    assert.equal(drawn.phase, 'playing');

    const claimed = applyClaim(drawn, 1, 'peng');
    assert.equal(claimed, drawn);
    assert.equal(playableCount(drawn.players[1]), 14);
  });

  it('chow removes exactly the two hand tiles', () => {
    const state = claimWindow('chi');
    const claimed = applyClaim(state, 1, 'chi', [
      state.players[1].hand[0],
      state.players[1].hand[1],
      state.lastDiscard!.tile,
    ]);
    assert.equal(claimed.players[1].hand.length, 11);
    assert.equal(playableCount(claimed.players[1]), 14);
    assert.equal(applyDraw(claimed, 1), claimed);
    assert.equal(describeHandProblem(claimed), null);
  });

  it('kong takes one replacement tile and then stops', () => {
    const state = claimWindow('gang');
    const claimed = applyClaim(state, 1, 'gang');
    assert.equal(claimed.players[1].melds[0]?.type, 'gang');
    assert.equal(claimed.players[1].melds[0]?.tiles.length, 4);
    assert.equal(claimed.players[1].hand.length, 11);
    assert.equal(playableCount(claimed.players[1]), 15);
    assert.equal(applyDraw(claimed, 1), claimed);
    assert.equal(describeHandProblem(claimed), null);

    const discarded = claimed.players[1].hand[0];
    const after = applyDiscard(claimed, 1, discarded);
    assert.equal(playableCount(after.players[1]), 14);
    assert.equal(after.phase, 'claim_window');
  });

  it('does not draw for the player after the discarder once someone else has punged', () => {
    const state = claimWindow('peng');
    const players = state.players.map(player => ({ ...player }));
    players[2] = {
      ...players[2],
      hand: [tile('wan', 5, 'p2-a'), tile('wan', 5, 'p2-b'), ...filler('p2', 11, { suit: 'wan', value: 5 })],
    };
    const punged = applyClaim({ ...state, players }, 2, 'peng');
    assert.equal(punged.currentTurn, 2);
    assert.equal(playableCount(punged.players[2]), 14);
    assert.equal(applyDraw(punged, 1), punged);
    assert.equal(punged.players[1].hand.length, 13);
  });

  it('added kong removes the single matching tile and draws a replacement', () => {
    const kongTile = tile('wan', 7, 'add');
    const players = makePlayers();
    players[0] = {
      ...players[0],
      hand: [kongTile, ...filler('h0', 10, { suit: 'wan', value: 7 })],
      melds: [{ type: 'peng', tiles: [tile('wan', 7, 'm1'), tile('wan', 7, 'm2'), tile('wan', 7, 'm3')] }],
    };
    for (const seat of [1, 2, 3]) {
      players[seat] = { ...players[seat], hand: filler(`w${seat}`, 13) };
    }
    const state = makeState({
      phase: 'playing',
      currentTurn: 0,
      players,
      wall: [tile('tong', 1, 'next')],
    });

    const upgraded = applySelfAction(state, 0, 'bu_gang', kongTile);
    assert.equal(upgraded.players[0].hand.some(candidate => candidate.id === 'add'), false);
    assert.equal(upgraded.players[0].melds[0]?.type, 'bu_gang');
    assert.equal(upgraded.players[0].melds[0]?.tiles.length, 4);
    assert.equal(playableCount(upgraded.players[0]), 15);
    assert.equal(applyDraw(upgraded, 0), upgraded);
  });

  it('concealed kong removes four tiles and draws one replacement', () => {
    const matches = [0, 1, 2, 3].map(index => tile('dragon', 1, `k${index}`));
    const players = makePlayers();
    players[0] = { ...players[0], hand: [...matches, ...filler('h0', 10)] };
    for (const seat of [1, 2, 3]) {
      players[seat] = { ...players[seat], hand: filler(`w${seat}`, 13) };
    }
    const state = makeState({
      phase: 'playing',
      currentTurn: 0,
      players,
      wall: [tile('tong', 2, 'next')],
    });
    const kong = applySelfAction(state, 0, 'an_gang', matches[0]);
    assert.equal(kong.players[0].hand.length, 11);
    assert.equal(kong.players[0].melds[0]?.type, 'an_gang');
    assert.equal(playableCount(kong.players[0]), 15);
    assert.equal(applyDraw(kong, 0), kong);
  });
});

describe('claim priority', () => {
  it('ranks hu above pung and pung above chow', () => {
    const fromSeat = 0;
    const hu = { seat: 2, type: 'hu' as const };
    const pung = { seat: 1, type: 'peng' as const };
    const chow = { seat: 1, type: 'chi' as const };
    assert.equal(claimOutranks(hu, pung, fromSeat), true);
    assert.equal(claimOutranks(pung, chow, fromSeat), true);
    assert.equal(claimOutranks(chow, pung, fromSeat), false);
  });

  it('gives a bot pung priority over a human chow', () => {
    const discard = tile('wan', 5, 'discard');
    const players = makePlayers(false);
    players[1] = { ...players[1], isBot: false, hand: [tile('wan', 3, 'a'), tile('wan', 4, 'b'), ...filler('h1', 11)] };
    players[2] = { ...players[2], isBot: true, hand: filler('h2', 13) };
    players[0] = { ...players[0], isBot: true, hand: filler('h0', 13), discards: [discard] };
    players[3] = { ...players[3], isBot: true, hand: filler('h3', 13) };
    const state = makeState({
      phase: 'claim_window',
      players,
      lastDiscard: { tile: discard, seat: 0 },
    });
    const result = evaluateClaimWindow(state, 1, {
      decideBot: () => ({ type: 'peng' }),
    });
    assert.deepEqual(result.humanActions.map(action => action.type), []);
    assert.equal(result.autoClaim?.seat, 2);
    assert.equal(result.autoClaim?.type, 'peng');
  });

  it('lets the human win when they can hu and a bot can only pung', () => {
    const discard = tile('wind', 1, 'east-win');
    const hand = [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(value => tile('wan', value, `w${value}`)),
      ...[1, 2, 3].map(value => tile('tong', value, `t${value}`)),
      tile('wind', 1, 'east-hand'),
    ];
    const players = makePlayers(true);
    players[1] = { ...players[1], isBot: false, hand };
    players[0] = { ...players[0], hand: filler('h0', 13), discards: [discard] };
    players[2] = { ...players[2], hand: filler('h2', 13) };
    players[3] = { ...players[3], hand: filler('h3', 13) };
    const state = makeState({
      phase: 'claim_window',
      players,
      lastDiscard: { tile: discard, seat: 0 },
    });
    const result = evaluateClaimWindow(state, 1, {
      decideBot: () => ({ type: 'peng' }),
    });
    assert.equal(result.autoClaim, null);
    assert.ok(result.humanActions.some(action => action.type === 'hu'));
  });
});

describe('full hands', () => {
  function step(state: GameState): GameState {
    if (state.phase === 'claim_window') {
      const { autoClaim } = evaluateClaimWindow(state, -1);
      if (autoClaim) return applyClaim(state, autoClaim.seat, autoClaim.type, autoClaim.tiles);
      return applyDraw(state, (state.lastDiscard!.seat + 1) % 4);
    }
    if (state.phase !== 'playing') return state;
    const seat = state.currentTurn;
    const player = state.players[seat];
    const decision = botDecideSelfAction(player, state.prevWind, state.settings.minFan);
    if (decision.type === 'hu' || decision.type === 'an_gang' || decision.type === 'bu_gang') {
      const acted = applySelfAction(state, seat, decision.type, decision.tile);
      if (acted !== state) return acted;
    }
    return applyDiscard(state, seat, botChooseDiscard(player));
  }

  function play(includeFlowers: boolean, minFan: number) {
    let state = startRound(makeState({
      settings: { minFan, maxFan: 10, includeFlowers, turnTimeLimit: 0 },
      players: makePlayers(true),
    }));
    for (let turn = 0; turn < 400 && state.phase !== 'round_end'; turn++) {
      assert.equal(describeHandProblem(state, true), null, `turn ${turn} ${state.phase}`);
      const next = step(state);
      assert.notEqual(next, state, `stalled on turn ${turn} (${state.phase})`);
      state = next;
    }
    assert.equal(state.phase, 'round_end');
    assert.equal(describeHandProblem(state, true), null);
    // The imported decider is part of the same claim path the table uses.
    assert.equal(typeof botDecideClaim, 'function');
  }

  it('keeps every seat at 13 or 14 plus kongs through complete games', () => {
    for (let game = 0; game < 3; game++) play(true, 0);
    play(true, 3);
    play(false, 0);
  });
});
