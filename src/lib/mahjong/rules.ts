import { Tile, Meld, WinningFan, WinResult } from './types';
import { areTilesEqual, sortTiles, getTileKey } from './tiles';

// Helper: group tiles by "suit_value"
function getTileCounts(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = getTileKey(t);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/**
 * Check if the player can Chi the discarded tile.
 * Chi is only allowed on suited tiles (wan, tong, tiao) and must form a 3-tile run.
 * Returns array of [tile1, tile2] from hand that can combine with discarded tile.
 */
export function getChiOptions(hand: Tile[], tile: Tile): Tile[][] {
  if (tile.suit === 'wind' || tile.suit === 'dragon' || tile.suit === 'flower') {
    return [];
  }

  const v = tile.value;
  const s = tile.suit;
  const options: Tile[][] = [];

  const findTile = (val: number): Tile | undefined => {
    return hand.find(t => t.suit === s && t.value === val);
  };

  // Pattern 1: [v-2, v-1, v]
  if (v >= 3) {
    const tMinus2 = findTile(v - 2);
    const tMinus1 = findTile(v - 1);
    if (tMinus2 && tMinus1) {
      options.push([tMinus2, tMinus1]);
    }
  }

  // Pattern 2: [v-1, v, v+1]
  if (v >= 2 && v <= 8) {
    const tMinus1 = findTile(v - 1);
    const tPlus1 = findTile(v + 1);
    if (tMinus1 && tPlus1) {
      options.push([tMinus1, tPlus1]);
    }
  }

  // Pattern 3: [v, v+1, v+2]
  if (v <= 7) {
    const tPlus1 = findTile(v + 1);
    const tPlus2 = findTile(v + 2);
    if (tPlus1 && tPlus2) {
      options.push([tPlus1, tPlus2]);
    }
  }

  return options;
}

/**
 * Check if player has at least 2 matching tiles for Peng.
 */
export function canPeng(hand: Tile[], tile: Tile): boolean {
  if (tile.suit === 'flower') return false;
  const matches = hand.filter(t => areTilesEqual(t, tile));
  return matches.length >= 2;
}

/**
 * Check if player has at least 3 matching tiles for Gang (Exposed Kong).
 */
export function canExposedGang(hand: Tile[], tile: Tile): boolean {
  if (tile.suit === 'flower') return false;
  const matches = hand.filter(t => areTilesEqual(t, tile));
  return matches.length >= 3;
}

/**
 * Check for self-turn Gang options:
 * 1. Concealed Kong (An-Gang): 4 matching tiles in hand.
 * 2. Added Kong (Bu-Gang): 1 matching tile in hand for an already exposed Peng meld.
 */
export function getSelfGangOptions(hand: Tile[], melds: Meld[]): { type: 'an_gang' | 'bu_gang'; tile: Tile }[] {
  const options: { type: 'an_gang' | 'bu_gang'; tile: Tile }[] = [];
  const counts = getTileCounts(hand);

  // Check An-gang
  for (const [key, count] of counts.entries()) {
    if (count === 4) {
      const tile = hand.find(t => getTileKey(t) === key);
      if (tile && tile.suit !== 'flower') {
        options.push({ type: 'an_gang', tile });
      }
    }
  }

  // Check Bu-gang
  for (const meld of melds) {
    if (meld.type === 'peng') {
      const match = hand.find(t => areTilesEqual(t, meld.tiles[0]));
      if (match) {
        options.push({ type: 'bu_gang', tile: match });
      }
    }
  }

  return options;
}

// Check standard 4-meld + 1-pair structure recursively
function checkMeldsAndEye(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 2) return false;

  const counts = getTileCounts(tiles);
  const keys = Array.from(counts.keys());

  // Try every possible pair as the "Eye"
  for (const eyeKey of keys) {
    if ((counts.get(eyeKey) || 0) >= 2) {
      const remainingTiles = [...tiles];
      // Remove pair
      let removed = 0;
      for (let i = remainingTiles.length - 1; i >= 0 && removed < 2; i--) {
        if (getTileKey(remainingTiles[i]) === eyeKey) {
          remainingTiles.splice(i, 1);
          removed++;
        }
      }

      if (canFormMelds(remainingTiles)) {
        return true;
      }
    }
  }

  return false;
}

function canFormMelds(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;

  const sorted = sortTiles(tiles);
  const first = sorted[0];

  // Try Triplet (Peng) with first tile
  const firstKey = getTileKey(first);
  const sameCount = sorted.filter(t => getTileKey(t) === firstKey).length;
  if (sameCount >= 3) {
    const nextTiles = [...sorted];
    // Remove 3 matching
    let removed = 0;
    for (let i = nextTiles.length - 1; i >= 0 && removed < 3; i--) {
      if (getTileKey(nextTiles[i]) === firstKey) {
        nextTiles.splice(i, 1);
        removed++;
      }
    }
    if (canFormMelds(nextTiles)) {
      return true;
    }
  }

  // Try Sequence (Chow) with first tile (suited only)
  if (first.suit === 'wan' || first.suit === 'tong' || first.suit === 'tiao') {
    const v = first.value;
    const s = first.suit;
    const secondIndex = sorted.findIndex(t => t.suit === s && t.value === v + 1);
    const thirdIndex = sorted.findIndex(t => t.suit === s && t.value === v + 2);

    if (secondIndex !== -1 && thirdIndex !== -1) {
      const nextTiles = [...sorted];
      // Remove in descending index order
      const indices = [0, secondIndex, thirdIndex].sort((a, b) => b - a);
      for (const idx of indices) {
        nextTiles.splice(idx, 1);
      }
      if (canFormMelds(nextTiles)) {
        return true;
      }
    }
  }

  return false;
}

// Special Hand: Seven Pairs (七對子)
function isSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const counts = getTileCounts(tiles);
  for (const count of counts.values()) {
    if (count !== 2 && count !== 4) return false; // 4 copies can count as 2 pairs
  }
  return true;
}

// Special Hand: Thirteen Orphans (十三幺)
function isThirteenOrphans(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const counts = getTileCounts(tiles);
  const requiredKeys = [
    'wan_1', 'wan_9',
    'tong_1', 'tong_9',
    'tiao_1', 'tiao_9',
    'wind_1', 'wind_2', 'wind_3', 'wind_4',
    'dragon_1', 'dragon_2', 'dragon_3',
  ];

  let hasPair = false;
  for (const req of requiredKeys) {
    const c = counts.get(req) || 0;
    if (c === 0) return false;
    if (c === 2) hasPair = true;
  }
  return hasPair;
}

/**
 * Check if hand + optional tile forms a winning hand.
 */
export function isWinningHand(hand: Tile[], additionalTile?: Tile): boolean {
  const allTiles = additionalTile ? [...hand, additionalTile] : [...hand];
  if (allTiles.length % 3 !== 2) return false;

  // Thirteen orphans check
  if (allTiles.length === 14 && isThirteenOrphans(allTiles)) {
    return true;
  }

  // Seven pairs check (only valid if concealed hand)
  if (allTiles.length === 14 && isSevenPairs(allTiles)) {
    return true;
  }

  // Standard 4 melds + 1 eye
  return checkMeldsAndEye(allTiles);
}

function canFormAllChows(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  const sorted = sortTiles(tiles);
  const first = sorted[0];
  if (first.suit !== 'wan' && first.suit !== 'tong' && first.suit !== 'tiao') return false;

  const v = first.value;
  const s = first.suit;
  const secondIndex = sorted.findIndex(t => t.suit === s && t.value === v + 1);
  const thirdIndex = sorted.findIndex(t => t.suit === s && t.value === v + 2);

  if (secondIndex !== -1 && thirdIndex !== -1) {
    const nextTiles = [...sorted];
    const indices = [0, secondIndex, thirdIndex].sort((a, b) => b - a);
    for (const idx of indices) {
      nextTiles.splice(idx, 1);
    }
    return canFormAllChows(nextTiles);
  }
  return false;
}

function checkPingHu(allTiles: Tile[], melds: Meld[]): boolean {
  // All exposed melds must be 'chi'
  for (const m of melds) {
    if (m.type !== 'chi') return false;
  }

  // Ping Hu eye and runs must be suited (no winds, no dragons, no flowers)
  for (const t of allTiles) {
    if (t.suit === 'wind' || t.suit === 'dragon' || t.suit === 'flower') return false;
  }

  const counts = getTileCounts(allTiles);
  for (const [key, count] of counts.entries()) {
    if (count >= 2) {
      const remaining = [...allTiles];
      let removed = 0;
      for (let i = remaining.length - 1; i >= 0 && removed < 2; i--) {
        if (getTileKey(remaining[i]) === key) {
          remaining.splice(i, 1);
          removed++;
        }
      }
      if (canFormAllChows(remaining)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculate Hong Kong Mahjong Fan breakdown.
 */
export function calculateFans(
  hand: Tile[],
  melds: Meld[],
  winningTile: Tile,
  isZimo: boolean,
  playerSeat: number,
  roundWind: string,
  flowers: Tile[],
  minFan = 0
): { fans: WinningFan[]; totalFan: number; qualifies: boolean } {
  const allTiles = [...hand, winningTile];
  const fans: WinningFan[] = [];

  // 1. Thirteen Orphans (13 Fan / Limit)
  if (melds.length === 0 && isThirteenOrphans(allTiles)) {
    fans.push({ name: 'Thirteen Orphans', chinese: '十三幺', fan: 13 });
    return { fans, totalFan: 13, qualifies: 13 >= minFan };
  }

  // 2. Seven Pairs (4 Fan)
  if (melds.length === 0 && isSevenPairs(allTiles)) {
    fans.push({ name: 'Seven Pairs', chinese: '七對子', fan: 4 });
  }

  // Collect all melds (exposed + concealed in hand)
  const suitsInPlay = new Set<string>();
  let hasHonors = false;
  let hasDragons = false;
  let hasWinds = false;

  for (const t of allTiles) {
    if (t.suit === 'dragon') {
      hasDragons = true;
      hasHonors = true;
    } else if (t.suit === 'wind') {
      hasWinds = true;
      hasHonors = true;
    } else if (t.suit !== 'flower') {
      suitsInPlay.add(t.suit);
    }
  }

  for (const m of melds) {
    for (const t of m.tiles) {
      if (t.suit === 'dragon') {
        hasDragons = true;
        hasHonors = true;
      } else if (t.suit === 'wind') {
        hasWinds = true;
        hasHonors = true;
      } else if (t.suit !== 'flower') {
        suitsInPlay.add(t.suit);
      }
    }
  }

  // Pure One Suit (清一色 - 7 Fan) vs Mixed One Suit (混一色 - 3 Fan)
  if (suitsInPlay.size === 1 && !hasHonors) {
    fans.push({ name: 'Pure One Suit', chinese: '清一色', fan: 7 });
  } else if (suitsInPlay.size === 1 && hasHonors) {
    fans.push({ name: 'Mixed One Suit', chinese: '混一色', fan: 3 });
  } else if (suitsInPlay.size === 0 && hasHonors) {
    fans.push({ name: 'All Honors', chinese: '字一色', fan: 10 });
  }

  // All Triplets / Pong Pong Hu (對對胡 - 3 Fan)
  const isAllTriplets = checkAllTriplets(allTiles, melds);
  if (isAllTriplets) {
    fans.push({ name: 'All Triplets', chinese: '對對胡', fan: 3 });
  }

  // Ping Hu / All Chows (平胡 - 1 Fan)
  if (checkPingHu(allTiles, melds)) {
    fans.push({ name: 'All Chows (Ping Hu)', chinese: '平胡', fan: 1 });
  }

  // Dragon Pungs (1 Fan each)
  const dragonCounts = countPungsByType(allTiles, melds, 'dragon');
  let dragonPungsCount = 0;
  for (let val = 1; val <= 3; val++) {
    if (dragonCounts.get(`dragon_${val}`) || 0) {
      dragonPungsCount++;
      const name = val === 1 ? 'Red Dragon' : val === 2 ? 'Green Dragon' : 'White Dragon';
      const cName = val === 1 ? '紅中' : val === 2 ? '發財' : '白板';
      fans.push({ name: `${name} Pung`, chinese: `${cName}刻`, fan: 1 });
    }
  }

  // Big Three Dragons (8 Fan) or Little Three Dragons (5 Fan)
  if (dragonPungsCount === 3) {
    // Override individual dragon pungs with Big Three Dragons
    const filtered = fans.filter(f => !f.name.includes('Dragon Pung'));
    fans.length = 0;
    fans.push(...filtered, { name: 'Big Three Dragons', chinese: '大三元', fan: 8 });
  }

  // Seat Wind Pung (1 Fan)
  // Seats: 0=East, 1=South, 2=West, 3=North
  const seatWindVal = playerSeat + 1;
  const windCounts = countPungsByType(allTiles, melds, 'wind');
  if (windCounts.get(`wind_${seatWindVal}`) || 0) {
    fans.push({ name: 'Seat Wind', chinese: '門風刻', fan: 1 });
  }

  // Round Wind Pung (1 Fan)
  const roundWindVal = roundWind === 'east' ? 1 : roundWind === 'south' ? 2 : roundWind === 'west' ? 3 : 4;
  if (windCounts.get(`wind_${roundWindVal}`) || 0) {
    fans.push({ name: 'Round Wind', chinese: '圈風刻', fan: 1 });
  }

  // Self-Draw / Zimo (1 Fan)
  if (isZimo) {
    fans.push({ name: 'Self-Draw', chinese: '自摸', fan: 1 });
  }

  // Concealed Hand / Men Qing (1 Fan)
  if (melds.length === 0 && !isZimo) {
    fans.push({ name: 'Concealed Hand', chinese: '門前清', fan: 1 });
  }

  // Flowers (1 Fan for own seat flower, 2 Fan for complete suit)
  if (flowers.length > 0) {
    // Flower 1 & 5 for Seat 0, 2 & 6 for Seat 1, 3 & 7 for Seat 2, 4 & 8 for Seat 3
    const ownFlower1 = playerSeat + 1;
    const ownFlower2 = playerSeat + 5;
    for (const f of flowers) {
      if (f.value === ownFlower1 || f.value === ownFlower2) {
        fans.push({ name: `Seat Flower (${f.chinese})`, chinese: `正花 (${f.chinese})`, fan: 1 });
      }
    }
  } else {
    // No Flowers bonus (1 Fan)
    fans.push({ name: 'No Flowers', chinese: '無花', fan: 1 });
  }

  // If no fans earned yet, but valid hand, it's a Chicken Hand (雞胡 - 0 Fan)
  if (fans.length === 0) {
    fans.push({ name: 'Chicken Hand', chinese: '平胡 / 雞胡', fan: 0 });
  }

  const totalFan = fans.reduce((sum, f) => sum + f.fan, 0);
  return {
    fans,
    totalFan,
    qualifies: totalFan >= minFan,
  };
}

function countPungsByType(tiles: Tile[], melds: Meld[], suit: string): Map<string, number> {
  const result = new Map<string, number>();

  // From exposed melds
  for (const m of melds) {
    if ((m.type === 'peng' || m.type === 'gang' || m.type === 'an_gang' || m.type === 'bu_gang') && m.tiles[0].suit === suit) {
      const key = getTileKey(m.tiles[0]);
      result.set(key, (result.get(key) || 0) + 1);
    }
  }

  // From hand
  const counts = getTileCounts(tiles);
  for (const [key, count] of counts.entries()) {
    if (key.startsWith(suit) && count >= 3) {
      result.set(key, (result.get(key) || 0) + 1);
    }
  }

  return result;
}

function checkAllTriplets(hand: Tile[], melds: Meld[]): boolean {
  for (const m of melds) {
    if (m.type === 'chi') return false;
  }
  const counts = getTileCounts(hand);
  let pairCount = 0;
  for (const count of counts.values()) {
    if (count === 2) {
      pairCount++;
    } else if (count !== 3 && count !== 4) {
      return false;
    }
  }
  return pairCount === 1;
}

/**
 * Get all waiting tiles (Ting / 聽牌) that would let this hand win.
 */
export function getWaitingTiles(hand: Tile[]): Tile[] {
  if (hand.length % 3 !== 1) return [];

  const waiting: Tile[] = [];
  const testDeck: Tile[] = [];

  // Generate 1 of each possible tile to test
  const WAN_CHINESE = ['一萬', '二萬', '三萬', '四萬', '五萬', '六萬', '七萬', '八萬', '九萬'];
  const TONG_CHINESE = ['一筒', '二筒', '三筒', '四筒', '五筒', '六筒', '七筒', '八筒', '九筒'];
  const TIAO_CHINESE = ['一條', '二條', '三條', '四條', '五條', '六條', '七條', '八條', '九條'];
  const WIND_CHINESE = ['東', '南', '西', '北'];
  const DRAGON_CHINESE = ['紅中', '發財', '白板'];

  for (let v = 1; v <= 9; v++) {
    testDeck.push({ id: `ting_wan_${v}`, suit: 'wan', value: v, name: `${v} Wan`, chinese: WAN_CHINESE[v - 1] });
    testDeck.push({ id: `ting_tong_${v}`, suit: 'tong', value: v, name: `${v} Tong`, chinese: TONG_CHINESE[v - 1] });
    testDeck.push({ id: `ting_tiao_${v}`, suit: 'tiao', value: v, name: `${v} Tiao`, chinese: TIAO_CHINESE[v - 1] });
  }
  for (let v = 1; v <= 4; v++) {
    const names = ['East Wind', 'South Wind', 'West Wind', 'North Wind'];
    testDeck.push({ id: `ting_wind_${v}`, suit: 'wind', value: v, name: names[v - 1], chinese: WIND_CHINESE[v - 1] });
  }
  for (let v = 1; v <= 3; v++) {
    const names = ['Red Dragon', 'Green Dragon', 'White Dragon'];
    testDeck.push({ id: `ting_dragon_${v}`, suit: 'dragon', value: v, name: names[v - 1], chinese: DRAGON_CHINESE[v - 1] });
  }

  for (const candidate of testDeck) {
    if (isWinningHand(hand, candidate)) {
      waiting.push(candidate);
    }
  }

  return waiting;
}
