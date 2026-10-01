import { Tile, Meld, Player } from './types';
import { canPeng, canExposedGang, getChiOptions, isWinningHand, calculateFans, getSelfGangOptions } from './rules';
import { areTilesEqual, getTileKey } from './tiles';

/**
 * Score the usefulness of a tile in hand.
 * Higher score = more useful, keep it.
 * Lower score = less useful, prefer discarding it.
 */
function evaluateTileUtility(tile: Tile, hand: Tile[]): number {
  let score = 0;
  const sameSuitTiles = hand.filter(t => t.suit === tile.suit);
  const identicalCount = hand.filter(t => areTilesEqual(t, tile)).length;

  // Multiples are very valuable (pairs, triplets)
  if (identicalCount >= 3) score += 40;
  else if (identicalCount === 2) score += 25;

  // Honors evaluation
  if (tile.suit === 'wind' || tile.suit === 'dragon') {
    // Isolated honor tile is the least useful
    if (identicalCount === 1) return -10;
    return score + 10;
  }

  // Suited tiles evaluation (wan, tong, tiao)
  const val = tile.value;
  const hasNeighbor1 = sameSuitTiles.some(t => t.value === val - 1 || t.value === val + 1);
  const hasNeighbor2 = sameSuitTiles.some(t => t.value === val - 2 || t.value === val + 2);

  if (hasNeighbor1) score += 15;
  if (hasNeighbor2) score += 8;

  // Middle tiles (3, 4, 5, 6, 7) have more sequence flexibility than terminals (1, 9)
  if (val >= 3 && val <= 7) {
    score += 5;
  } else if (val === 2 || val === 8) {
    score += 3;
  } else {
    // 1 and 9
    score += 1;
  }

  return score;
}

/**
 * Select the best tile to discard from hand.
 */
export function botChooseDiscard(player: Player): Tile {
  const hand = player.hand;
  if (hand.length === 0) throw new Error('Empty hand');

  let lowestScore = Infinity;
  let bestTileToDiscard = hand[0];

  for (const tile of hand) {
    const score = evaluateTileUtility(tile, hand);
    if (score < lowestScore) {
      lowestScore = score;
      bestTileToDiscard = tile;
    }
  }

  return bestTileToDiscard;
}

/**
 * Decide whether a bot should claim a discarded tile.
 */
export function botDecideClaim(
  bot: Player,
  discardedTile: Tile,
  fromSeat: number,
  roundWind: string,
  minFan: number
): { type: 'hu' | 'gang' | 'peng' | 'chi' | 'pass'; tiles?: Tile[] } {
  // 1. Highest Priority: HU (Win)
  if (isWinningHand(bot.hand, discardedTile)) {
    const { qualifies } = calculateFans(
      bot.hand,
      bot.melds,
      discardedTile,
      false,
      bot.seat,
      roundWind,
      bot.flowers,
      minFan
    );
    if (qualifies) {
      return { type: 'hu' };
    }
  }

  // 2. Gang
  if (canExposedGang(bot.hand, discardedTile)) {
    const matching = bot.hand.filter(t => areTilesEqual(t, discardedTile)).slice(0, 3);
    // Dragon or seat wind Gang is almost always advantageous
    if (discardedTile.suit === 'dragon' || discardedTile.suit === 'wind' || Math.random() > 0.3) {
      return { type: 'gang', tiles: [...matching, discardedTile] };
    }
  }

  // 3. Peng
  if (canPeng(bot.hand, discardedTile)) {
    const matching = bot.hand.filter(t => areTilesEqual(t, discardedTile)).slice(0, 2);
    // Honor triplets give fans
    if (discardedTile.suit === 'dragon' || discardedTile.suit === 'wind' || Math.random() > 0.4) {
      return { type: 'peng', tiles: [...matching, discardedTile] };
    }
  }

  // 4. Chi (Only from left player: (bot.seat - 1 + 4) % 4 === fromSeat)
  const isLeftPlayer = (bot.seat - 1 + 4) % 4 === fromSeat;
  if (isLeftPlayer) {
    const chiOpts = getChiOptions(bot.hand, discardedTile);
    if (chiOpts.length > 0 && Math.random() > 0.5) {
      // Pick first combination
      return { type: 'chi', tiles: [...chiOpts[0], discardedTile] };
    }
  }

  return { type: 'pass' };
}

/**
 * Decide whether bot should declare self-turn action (Hu, An-gang, Bu-gang).
 */
export function botDecideSelfAction(
  bot: Player,
  roundWind: string,
  minFan: number
): { type: 'hu' | 'an_gang' | 'bu_gang' | 'none'; tile?: Tile } {
  // Check self-draw Hu
  if (bot.hand.length % 3 === 2 && isWinningHand(bot.hand)) {
    const lastTile = bot.hand[bot.hand.length - 1];
    const handWithoutLast = bot.hand.slice(0, -1);
    const { qualifies } = calculateFans(
      handWithoutLast,
      bot.melds,
      lastTile,
      true,
      bot.seat,
      roundWind,
      bot.flowers,
      minFan
    );
    if (qualifies) {
      return { type: 'hu', tile: lastTile };
    }
  }

  // Check self gang
  const gangOptions = getSelfGangOptions(bot.hand, bot.melds);
  if (gangOptions.length > 0 && Math.random() > 0.3) {
    return { type: gangOptions[0].type, tile: gangOptions[0].tile };
  }

  return { type: 'none' };
}
