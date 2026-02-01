import React, { useState } from 'react';

interface MainMenuProps {
  onPlayAI: () => void;
  onHostGame: () => void;
  onJoinGame: (code: string) => void;
  isConnecting: boolean;
  hostCode: string | null;
  error: string | null;
  onCancel: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
  onPlayAI, 
  onHostGame, 
  onJoinGame, 
  isConnecting, 
  hostCode, 
  error,
  onCancel
}) => {
  const [mode, setMode] = useState<'MAIN' | 'HOSTING' | 'JOINING'>('MAIN');
  const [joinCode, setJoinCode] = useState('');

  if (mode === 'HOSTING') {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-snow-800/90 rounded-2xl border border-white/20 backdrop-blur-xl shadow-2xl max-w-md w-full animate-float">
        <h2 className="text-2xl font-bold text-white">Snow Fort Lobby</h2>
        
        {hostCode ? (
          <div className="text-center">
            <p className="text-ice-300 mb-2">Tell your opponent this code:</p>
            <div className="text-5xl font-mono font-black text-white tracking-widest my-4 bg-snow-900/50 p-6 rounded-2xl border-2 border-dashed border-ice-300/50">
              {hostCode}
            </div>
            <p className="text-sm text-ice-300 animate-pulse">Waiting for challenger...</p>
          </div>
        ) : (
          <p className="animate-pulse">Building Fort...</p>
        )}

        <button onClick={() => { setMode('MAIN'); onCancel(); }} className="mt-4 text-sm text-white/50 hover:text-white">Cancel</button>
      </div>
    );
  }

  if (mode === 'JOINING') {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-snow-800/90 rounded-2xl border border-white/20 backdrop-blur-xl shadow-2xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-white">Join the Fight</h2>
        
        <div className="w-full">
          <label className="text-xs text-ice-300 uppercase tracking-widest mb-1 block">Battle Code</label>
          <input 
            type="number" 
            pattern="[0-9]*"
            maxLength={4}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.slice(0, 4))}
            className="w-full bg-snow-900/50 border border-snow-600 rounded-xl p-4 text-center text-3xl font-mono text-white focus:outline-none focus:border-ice-500 transition-colors"
            placeholder="0000"
          />
        </div>

        {error && <p className="text-red-300 text-sm bg-red-900/40 px-3 py-1 rounded">{error}</p>}

        <div className="flex gap-2 w-full">
          <button onClick={() => { setMode('MAIN'); onCancel(); }} className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10">Back</button>
          <button 
            disabled={joinCode.length !== 4 || isConnecting}
            onClick={() => onJoinGame(joinCode)} 
            className="flex-1 py-3 bg-ice-500 hover:bg-ice-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg shadow-ice-900/20 text-snow-900"
          >
            {isConnecting ? 'Connecting...' : 'Join Fight'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-snow-800/80 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl max-w-md w-full">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-ice-300 drop-shadow-sm">WORMS</h2>
        <h3 className="text-lg font-bold text-ice-300 tracking-wider">SNOWBALL WARFARE</h3>
      </div>

      <button 
        onClick={onPlayAI}
        className="w-full py-4 bg-gradient-to-r from-ice-500 to-blue-600 hover:from-ice-400 hover:to-blue-500 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/30 transition-all transform hover:scale-105 text-white"
      >
        Single Player (vs AI)
      </button>
      
      <div className="flex items-center gap-2 w-full opacity-50 py-2">
        <div className="h-px bg-white/20 flex-1"></div>
        <span className="text-xs font-mono text-ice-200">MULTIPLAYER</span>
        <div className="h-px bg-white/20 flex-1"></div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <button 
          onClick={() => { setMode('HOSTING'); onHostGame(); }}
          className="py-6 bg-snow-700 hover:bg-snow-600 rounded-xl font-semibold flex flex-col items-center gap-2 transition-colors border border-white/5 shadow-lg"
        >
          <span className="text-3xl">🏰</span>
          Host
        </button>
        <button 
          onClick={() => setMode('JOINING')}
          className="py-6 bg-snow-700 hover:bg-snow-600 rounded-xl font-semibold flex flex-col items-center gap-2 transition-colors border border-white/5 shadow-lg"
        >
          <span className="text-3xl">❄️</span>
          Join
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
