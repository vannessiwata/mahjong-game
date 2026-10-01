import { Tile, Suit } from './types';

export const SUIT_ORDER: Record<Suit, number> = {
  wan: 0,
  tong: 1,
  tiao: 2,
  wind: 3,
  dragon: 4,
  flower: 5,
};

const WAN_CHINESE = ['一萬', '二萬', '三萬', '四萬', '五萬', '六萬', '七萬', '八萬', '九萬'];
const TONG_CHINESE = ['一筒', '二筒', '三筒', '四筒', '五筒', '六筒', '七筒', '八筒', '九筒'];
const TIAO_CHINESE = ['一條', '二條', '三條', '四條', '五條', '六條', '七條', '八條', '九條'];
const WIND_CHINESE = ['東', '南', '西', '北'];
const DRAGON_CHINESE = ['紅中', '發財', '白板'];
const FLOWER_CHINESE = ['春', '夏', '秋', '冬', '梅', '蘭', '菊', '竹'];

export function generateTileDeck(includeFlowers = true): Tile[] {
  const deck: Tile[] = [];

  // Wan (Characters / 萬)
  for (let val = 1; val <= 9; val++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push({
        id: `wan_${val}_${copy}`,
        suit: 'wan',
        value: val,
        name: `${val} Wan`,
        chinese: WAN_CHINESE[val - 1],
      });
    }
  }

  // Tong (Dots / 筒)
  for (let val = 1; val <= 9; val++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push({
        id: `tong_${val}_${copy}`,
        suit: 'tong',
        value: val,
        name: `${val} Tong`,
        chinese: TONG_CHINESE[val - 1],
      });
    }
  }

  // Tiao (Bamboo / 條)
  for (let val = 1; val <= 9; val++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push({
        id: `tiao_${val}_${copy}`,
        suit: 'tiao',
        value: val,
        name: `${val} Tiao`,
        chinese: TIAO_CHINESE[val - 1],
      });
    }
  }

  // Winds (1: East 東, 2: South 南, 3: West 西, 4: North 北)
  for (let val = 1; val <= 4; val++) {
    const names = ['East Wind', 'South Wind', 'West Wind', 'North Wind'];
    for (let copy = 0; copy < 4; copy++) {
      deck.push({
        id: `wind_${val}_${copy}`,
        suit: 'wind',
        value: val,
        name: names[val - 1],
        chinese: WIND_CHINESE[val - 1],
      });
    }
  }

  // Dragons (1: Red 中, 2: Green 發, 3: White 白)
  for (let val = 1; val <= 3; val++) {
    const names = ['Red Dragon', 'Green Dragon', 'White Dragon'];
    for (let copy = 0; copy < 4; copy++) {
      deck.push({
        id: `dragon_${val}_${copy}`,
        suit: 'dragon',
        value: val,
        name: names[val - 1],
        chinese: DRAGON_CHINESE[val - 1],
      });
    }
  }

  // Flowers (1-4: Seasons 春夏秋冬, 5-8: Plants 梅蘭菊竹)
  if (includeFlowers) {
    const flowerNames = [
      'Spring (春)', 'Summer (夏)', 'Autumn (秋)', 'Winter (冬)',
      'Plum (梅)', 'Orchid (蘭)', 'Chrysanthemum (菊)', 'Bamboo (竹)'
    ];
    for (let val = 1; val <= 8; val++) {
      deck.push({
        id: `flower_${val}_0`,
        suit: 'flower',
        value: val,
        name: flowerNames[val - 1],
        chinese: FLOWER_CHINESE[val - 1],
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Tile[]): Tile[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function areTilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) {
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    }
    return a.value - b.value;
  });
}

export function getTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.value}`;
}
