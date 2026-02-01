import { BOARD_SIZE, UNIT_TYPES } from '../constants';
import { Coordinate, GameBoardState, PlacedUnit, CellStatus, UnitType } from '../types';

export const createEmptyBoard = (): GameBoardState => ({
  grid: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(CellStatus.EMPTY)),
  placedUnits: [],
  shotsFired: [],
});

export const isValidPlacement = (
  board: GameBoardState,
  unit: UnitType,
  start: Coordinate,
  orientation: 'horizontal' | 'vertical'
): boolean => {
  const { row, col } = start;
  
  if (orientation === 'horizontal') {
    if (col + unit.size > BOARD_SIZE) return false;
  } else {
    if (row + unit.size > BOARD_SIZE) return false;
  }

  for (let i = 0; i < unit.size; i++) {
    const r = orientation === 'vertical' ? row + i : row;
    const c = orientation === 'horizontal' ? col + i : col;
    
    const isOccupied = board.placedUnits.some(pu => 
      pu.positions.some(pos => pos.row === r && pos.col === c)
    );
    if (isOccupied) return false;
  }

  return true;
};

export const placeUnit = (
  board: GameBoardState,
  unit: UnitType,
  start: Coordinate,
  orientation: 'horizontal' | 'vertical'
): GameBoardState => {
  const newPositions: Coordinate[] = [];
  for (let i = 0; i < unit.size; i++) {
    newPositions.push({
      row: orientation === 'vertical' ? start.row + i : start.row,
      col: orientation === 'horizontal' ? start.col + i : start.col,
    });
  }

  const newPlacedUnit: PlacedUnit = {
    id: `${unit.id}-${Date.now()}`,
    typeId: unit.id,
    positions: newPositions,
    hits: 0,
    isSunk: false,
    orientation,
  };

  const newGrid = board.grid.map(row => [...row]);
  newPositions.forEach(pos => {
    newGrid[pos.row][pos.col] = CellStatus.OCCUPIED;
  });

  return {
    ...board,
    grid: newGrid,
    placedUnits: [...board.placedUnits, newPlacedUnit],
  };
};

export const fireShot = (board: GameBoardState, target: Coordinate): { 
  board: GameBoardState, 
  result: 'HIT' | 'MISS' | 'SUNK', 
  sunkUnitName?: string 
} => {
  const existingShot = board.shotsFired.find(s => s.row === target.row && s.col === target.col);
  if (existingShot) return { board, result: 'MISS' };

  const newGrid = board.grid.map(r => [...r]);
  const cellContent = board.grid[target.row][target.col];
  const isHit = cellContent === CellStatus.OCCUPIED;
  
  let result: 'HIT' | 'MISS' | 'SUNK' = isHit ? 'HIT' : 'MISS';
  let sunkName = undefined;

  let newPlacedUnits = [...board.placedUnits];

  if (isHit) {
    newGrid[target.row][target.col] = CellStatus.HIT;
    
    newPlacedUnits = newPlacedUnits.map(unit => {
      const hitPosition = unit.positions.find(p => p.row === target.row && p.col === target.col);
      if (hitPosition) {
        const newHits = unit.hits + 1;
        const unitType = UNIT_TYPES.find(t => t.id === unit.typeId);
        const isSunk = unitType ? newHits >= unitType.size : false;
        
        if (isSunk) {
          result = 'SUNK';
          sunkName = unitType?.name;
        }
        return { ...unit, hits: newHits, isSunk };
      }
      return unit;
    });
  } else {
    newGrid[target.row][target.col] = CellStatus.MISS;
  }

  return {
    board: {
      ...board,
      grid: newGrid,
      placedUnits: newPlacedUnits,
      shotsFired: [...board.shotsFired, target],
    },
    result,
    sunkUnitName: sunkName,
  };
};

export const checkWinCondition = (board: GameBoardState): boolean => {
  return board.placedUnits.length > 0 && board.placedUnits.every(c => c.isSunk);
};

export const getRandomPlacement = (board: GameBoardState): GameBoardState => {
  let newBoard = { ...board };
  
  for (const unitType of UNIT_TYPES) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      
      if (isValidPlacement(newBoard, unitType, { row, col }, orientation)) {
        newBoard = placeUnit(newBoard, unitType, { row, col }, orientation);
        placed = true;
      }
      attempts++;
    }
  }
  return newBoard;
};
