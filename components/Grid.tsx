import React from 'react';
import Cell from './Cell';
import { GameBoardState, Coordinate } from '../types';
import { UNIT_TYPES } from '../constants';

interface GridProps {
  board: GameBoardState;
  isEnemyBoard: boolean;
  onCellClick: (coord: Coordinate) => void;
  disabled: boolean;
  showShips: boolean;
  title: string;
}

const Grid: React.FC<GridProps> = ({ 
  board, 
  isEnemyBoard, 
  onCellClick, 
  disabled, 
  showShips,
  title
}) => {
  
  const getUnitColor = (r: number, c: number) => {
    const unit = board.placedUnits.find(pu => 
      pu.positions.some(p => p.row === r && p.col === c)
    );
    if (!unit) return undefined;
    const type = UNIT_TYPES.find(t => t.id === unit.typeId);
    return type?.color;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-snow-100 font-bold uppercase tracking-widest text-sm md:text-base opacity-90 mb-2 shadow-black drop-shadow-md">
        {title}
      </h3>
      
      <div className="relative p-2 bg-snow-800/60 rounded-xl backdrop-blur-md shadow-2xl border border-white/20">
        {/* Labels Top */}
        <div className="absolute top-0 left-0 w-full flex justify-between px-2 -mt-6 text-xs text-ice-300 font-mono font-bold">
           {['A','B','C','D','E','F','G','H','I','J'].map(l => <span key={l} className="flex-1 text-center">{l}</span>)}
        </div>
        
        {/* Labels Left */}
        <div className="absolute top-0 left-0 h-full flex flex-col justify-between py-2 -ml-6 text-xs text-ice-300 font-mono font-bold">
           {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n} className="flex-1 flex items-center justify-end pr-2">{n}</span>)}
        </div>

        <div 
          className="grid grid-cols-10 grid-rows-10 gap-px bg-snow-700/50 w-[300px] h-[300px] md:w-[400px] md:h-[400px] lg:w-[450px] lg:h-[450px] overflow-hidden rounded-lg"
          style={{ aspectRatio: '1/1' }}
        >
          {board.grid.map((row, rIndex) => (
            row.map((cellStatus, cIndex) => (
              <Cell
                key={`${rIndex}-${cIndex}`}
                row={rIndex}
                col={cIndex}
                status={cellStatus}
                isEnemyBoard={isEnemyBoard}
                onClick={() => onCellClick({ row: rIndex, col: cIndex })}
                disabled={disabled}
                showShips={showShips}
                shipColor={getUnitColor(rIndex, cIndex)}
              />
            ))
          ))}
        </div>
      </div>
    </div>
  );
};

export default Grid;
