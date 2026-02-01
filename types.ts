export type Coordinate = {
  row: number;
  col: number;
};

export enum CellStatus {
  EMPTY = 'EMPTY',
  OCCUPIED = 'OCCUPIED',
  HIT = 'HIT',     // Hit a worm/fort
  MISS = 'MISS',   // Hit snow
}

export enum GamePhase {
  MENU = 'MENU',
  LOBBY = 'LOBBY',
  SETUP = 'SETUP',
  WAITING_FOR_OPPONENT = 'WAITING_FOR_OPPONENT',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
}

export enum PlayerType {
  HUMAN = 'HUMAN',
  AI = 'AI',
  REMOTE = 'REMOTE',
}

export enum GameMode {
  SINGLE_PLAYER = 'SINGLE_PLAYER',
  MULTI_PLAYER = 'MULTI_PLAYER',
}

export type UnitType = {
  id: string;
  name: string;
  size: number;
  color: string; // Tailwind class
};

export type PlacedUnit = {
  id: string; // unique instance id
  typeId: string;
  positions: Coordinate[];
  hits: number;
  isSunk: boolean; // is fully frozen/eliminated
  orientation: 'horizontal' | 'vertical';
};

export type GameBoardState = {
  grid: CellStatus[][]; // 10x10 grid of status
  placedUnits: PlacedUnit[];
  shotsFired: Coordinate[]; // History
};

export type GameState = {
  mode: GameMode;
  phase: GamePhase;
  turn: PlayerType;
  winner: PlayerType | null;
  humanBoard: GameBoardState;
  enemyBoard: GameBoardState;
  selectedUnitId: string | null; 
  setupOrientation: 'horizontal' | 'vertical';
  aiThinking: boolean;
  lastMessage: string;
  peerId: string | null;
  opponentPeerId: string | null;
};

// Network Message Types
export type MessageType = 
  | { type: 'READY' }
  | { type: 'FIRE'; row: number; col: number }
  | { type: 'RESULT'; row: number; col: number; result: 'HIT' | 'MISS' | 'SUNK'; sunkName?: string }
  | { type: 'RESTART' };
