export type Suit = 'wan' | 'tong' | 'tiao' | 'wind' | 'dragon' | 'flower';

export type WindValue = 'east' | 'south' | 'west' | 'north';
export type DragonValue = 'red' | 'green' | 'white';

export interface Tile {
  id: string; // Unique tile id, e.g. "wan_1_0"
  suit: Suit;
  value: number; // 1-9 for wan/tong/tiao, 1-4 for wind (1=E,2=S,3=W,4=N), 1-3 for dragon (1=Red,2=Green,3=White), 1-8 for flower
  name: string; // Display name, e.g. "1 Wan", "Red Dragon", "East Wind"
  chinese: string; // Chinese character, e.g. "一萬", "紅中", "東"
}

export type MeldType = 'chi' | 'peng' | 'gang' | 'an_gang' | 'bu_gang';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  claimedFrom?: number; // Seat index (0-3) the tile was claimed from, if applicable
  claimedTile?: Tile;
}

export type SeatWind = 'east' | 'south' | 'west' | 'north';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  avatar: string;
  seat: number; // 0: East (Dealer initially), 1: South, 2: West, 3: North
  hand: Tile[]; // Concealed tiles in hand (13 or 14)
  melds: Meld[]; // Exposed melds (Chi, Peng, Gang)
  flowers: Tile[]; // Drawn flower/bonus tiles
  discards: Tile[]; // Tiles discarded by this player
  score: number; // Score / points (starting at e.g. 1000 or 500)
  isReady: boolean;
  isHost?: boolean;
}

export type GamePhase = 
  | 'lobby'
  | 'dealing'
  | 'playing'
  | 'claim_window' // Window when other players can claim the discarded tile (Hu, Gang, Peng, Chi)
  | 'round_end'
  | 'game_over';

export interface AvailableAction {
  type: 'chi' | 'peng' | 'gang' | 'hu';
  options?: Tile[][]; // For chi: all possible combinations in hand that complete a chow
  tile?: Tile; // The target tile being claimed
}

export interface PlayerActionRequest {
  seat: number;
  availableActions: AvailableAction[];
}

export interface WinningFan {
  name: string;
  chinese: string;
  fan: number;
}

export interface WinResult {
  winnerSeat: number;
  fromSeat?: number; // Claimed discard from seat, or undefined for Self-Draw (Zimo)
  isZimo: boolean;
  winningTile: Tile;
  fans: WinningFan[];
  totalFan: number;
  scoreChange: { [seat: number]: number };
}

export interface GameSettings {
  minFan: number; // Minimum fan required to win (e.g. 0 or 3, default 3 for authentic HK)
  maxFan: number; // Maximum fan limit (e.g. 8 or 10 or 13, default 10)
  includeFlowers: boolean; // 144 tiles with flowers or 136 standard
  turnTimeLimit: number; // Seconds per turn (0 = unlimited)
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  wall: Tile[]; // Remaining tiles to draw
  deadWall: Tile[]; // Kong replacement tiles / bonus tiles
  currentTurn: number; // Seat index (0-3) whose turn it is to draw/discard
  dealerSeat: number; // Current dealer seat
  prevWind: SeatWind; // Round wind (East, South, etc.)
  lastDiscard?: {
    tile: Tile;
    seat: number;
  };
  pendingClaims: {
    [seat: number]: 'pass' | { type: 'chi' | 'peng' | 'gang' | 'hu'; tiles?: Tile[] };
  };
  lastDrawnTile?: Tile;
  winResult?: WinResult;
  log: string[];
}
