import React from 'react';
import { CellStatus } from '../types';

interface CellProps {
  row: number;
  col: number;
  status: CellStatus;
  isEnemyBoard: boolean;
  onClick: () => void;
  disabled: boolean;
  showShips: boolean; 
  shipColor?: string; 
}

const Cell: React.FC<CellProps> = ({ 
  status, 
  isEnemyBoard, 
  onClick, 
  disabled, 
  showShips, 
  shipColor 
}) => {
  
  const baseClasses = "w-full h-full border border-snow-700/30 transition-all duration-300 relative overflow-hidden";
  
  let bgClass = "bg-snow-800/40"; // Default dark snow
  let content = null;

  if (status === CellStatus.MISS) {
    bgClass = "bg-snow-900"; // Deep hole
    content = (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        <div className="w-2 h-2 rounded-full bg-black/40 shadow-inner"></div>
      </div>
    );
  } else if (status === CellStatus.HIT) {
    bgClass = "bg-red-500/10";
    content = (
      <div className="absolute inset-0 flex items-center justify-center animate-splat z-10">
        {/* Snowball Splat Graphic */}
        <svg viewBox="0 0 100 100" className="w-full h-full text-white drop-shadow-lg">
           <path fill="currentColor" d="M50 25 C55 20 60 20 65 25 C70 20 75 25 75 30 C80 30 85 35 80 40 C85 45 80 50 80 55 C85 60 80 65 75 65 C80 75 70 80 60 75 C55 80 50 80 45 75 C35 80 25 75 30 65 C20 65 15 60 20 55 C15 50 20 45 20 40 C15 35 20 30 25 30 C25 20 35 20 40 25 C45 20 50 20 50 25 Z" />
           <circle cx="50" cy="50" r="15" fill="#ef4444" /> {/* Red center hit */}
        </svg>
      </div>
    );
  } else if (status === CellStatus.OCCUPIED && showShips) {
    bgClass = `${shipColor || 'bg-slate-400'} border-white/20`;
    content = (
        <div className="w-full h-full flex items-center justify-center opacity-80">
            {/* Worm/Unit Marker */}
            <div className="w-2/3 h-2/3 rounded-full bg-white/20 border-2 border-white/40"></div>
        </div>
    );
  }

  // Interactive Hover
  const hoverClass = (!disabled && status === CellStatus.EMPTY && isEnemyBoard) 
    ? "hover:bg-ice-500/30 cursor-crosshair active:scale-95" 
    : "";

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`${baseClasses} ${bgClass} ${hoverClass}`}
    >
      {content}
      {/* Snow texture overlay */}
      {status === CellStatus.EMPTY && !isEnemyBoard && showShips && (
        <div className="w-full h-full opacity-0 hover:opacity-100 bg-white/10" />
      )}
    </div>
  );
};

export default React.memo(Cell);
