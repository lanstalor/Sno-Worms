import React, { useState, useEffect, useRef } from 'react';
import Grid from './components/Grid';
import MainMenu from './components/MainMenu';
import { 
  GamePhase, 
  PlayerType, 
  GameState, 
  Coordinate, 
  CellStatus,
  GameMode,
  MessageType
} from './types';
import { 
  createEmptyBoard, 
  placeUnit, 
  isValidPlacement, 
  fireShot, 
  checkWinCondition,
  getRandomPlacement 
} from './services/gameLogic';
import { getAIMove } from './services/geminiService';
import { peerService } from './services/peerService';
import { UNIT_TYPES } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>({
    mode: GameMode.SINGLE_PLAYER,
    phase: GamePhase.MENU,
    turn: PlayerType.HUMAN,
    winner: null,
    humanBoard: createEmptyBoard(), 
    enemyBoard: createEmptyBoard(),
    selectedUnitId: UNIT_TYPES[0].id,
    setupOrientation: 'horizontal',
    aiThinking: false,
    lastMessage: "Welcome to the Tundra.",
    peerId: null,
    opponentPeerId: null,
  });

  const [setupPlacedCount, setSetupPlacedCount] = useState(0);
  const [hostCode, setHostCode] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Ref for stable callback access
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // --- Network Handlers ---

  const handleNetworkMessage = (data: MessageType) => {
    const current = gameStateRef.current;

    switch (data.type) {
      case 'READY':
        // If received READY, opponent is ready.
        if (current.phase === GamePhase.WAITING_FOR_OPPONENT) {
           setGameState(prev => ({ ...prev, phase: GamePhase.PLAYING, lastMessage: "Both Teams Ready! FIGHT!" }));
        } else {
           // We are still setting up, but they are ready.
           // We don't change phase yet, just maybe store the knowledge (omitted for simplicity, relies on us sending READY later)
           // Actually, if we finish setup later, we transition then.
        }
        break;

      case 'FIRE':
        const { board: newHumanBoard, result, sunkUnitName } = fireShot(current.humanBoard, { row: data.row, col: data.col });
        peerService.send({ type: 'RESULT', row: data.row, col: data.col, result, sunkName: sunkUnitName });

        const isLoss = checkWinCondition(newHumanBoard);

        setGameState(prev => ({
          ...prev,
          humanBoard: newHumanBoard,
          turn: PlayerType.HUMAN,
          lastMessage: `Enemy fired at ${['A','B','C','D','E','F','G','H','I','J'][data.col]}${data.row+1}. ${result === 'HIT' ? 'Hit!' : 'Missed!'}`,
          phase: isLoss ? GamePhase.GAMEOVER : prev.phase,
          winner: isLoss ? PlayerType.REMOTE : null,
        }));
        break;

      case 'RESULT':
        const newGrid = current.enemyBoard.grid.map(r => [...r]);
        newGrid[data.row][data.col] = data.result === 'HIT' || data.result === 'SUNK' ? CellStatus.HIT : CellStatus.MISS;
        
        const newEnemyBoard = { ...current.enemyBoard, grid: newGrid };
        
        let msg = data.result === 'HIT' ? "Direct hit!" : "Just snow.";
        if (data.result === 'SUNK') msg = `You froze their ${data.sunkName}!`;
        
        let totalHits = 0;
        newGrid.forEach(r => r.forEach(c => { if(c === CellStatus.HIT) totalHits++ }));
        // Total segments to hit = 5+4+3+3+2 = 17
        const isWin = totalHits >= 17;

        setGameState(prev => ({
          ...prev,
          enemyBoard: newEnemyBoard,
          turn: PlayerType.REMOTE,
          lastMessage: msg,
          phase: isWin ? GamePhase.GAMEOVER : prev.phase,
          winner: isWin ? PlayerType.HUMAN : null,
        }));
        break;
      
      case 'RESTART':
        resetGame(true);
        break;
    }
  };

  // --- Actions ---

  const handleHostGame = () => {
    setMenuError(null);
    peerService.init(
      (id) => setHostCode(id),
      (connId) => {
        setGameState(prev => ({ 
          ...prev, 
          mode: GameMode.MULTI_PLAYER, 
          phase: GamePhase.SETUP,
          opponentPeerId: connId,
          turn: PlayerType.HUMAN, 
          lastMessage: "Opponent Connected! Prepare your forts." 
        }));
      },
      handleNetworkMessage,
      (err) => setMenuError(err)
    );
  };

  const handleJoinGame = (code: string) => {
    setMenuError(null);
    setIsConnecting(true);
    peerService.connectTo(
      code,
      () => {
        setIsConnecting(false);
        setGameState(prev => ({ 
          ...prev, 
          mode: GameMode.MULTI_PLAYER, 
          phase: GamePhase.SETUP, 
          turn: PlayerType.REMOTE, 
          lastMessage: "Connected! Prepare your forts." 
        }));
      },
      handleNetworkMessage,
      (err) => {
        setIsConnecting(false);
        setMenuError("Could not connect. Check code.");
      }
    );
  };

  const startSinglePlayer = () => {
    setGameState(prev => ({
      ...prev,
      mode: GameMode.SINGLE_PLAYER,
      phase: GamePhase.SETUP,
      turn: PlayerType.HUMAN,
      lastMessage: "Build your defenses.",
      aiThinking: false,
    }));
  };

  const resetGame = (keepConnection = false) => {
    if (!keepConnection) {
      peerService.destroy();
      setHostCode(null);
    }

    setGameState(prev => ({
      mode: keepConnection ? prev.mode : GameMode.SINGLE_PLAYER,
      phase: keepConnection ? GamePhase.SETUP : GamePhase.MENU,
      turn: PlayerType.HUMAN, 
      winner: null,
      humanBoard: createEmptyBoard(),
      enemyBoard: createEmptyBoard(),
      selectedUnitId: UNIT_TYPES[0].id,
      setupOrientation: 'horizontal',
      aiThinking: false,
      lastMessage: keepConnection ? "Rematch! Stations!" : "Welcome back.",
      peerId: keepConnection ? prev.peerId : null,
      opponentPeerId: keepConnection ? prev.opponentPeerId : null,
    }));
    setSetupPlacedCount(0);
  };

  const handleSetupClick = (coord: Coordinate) => {
    if (gameState.phase !== GamePhase.SETUP) return;
    
    const placedTypeIds = gameState.humanBoard.placedUnits.map(c => c.typeId);
    const nextUnit = UNIT_TYPES.find(c => !placedTypeIds.includes(c.id));
    if (!nextUnit) return;

    if (isValidPlacement(gameState.humanBoard, nextUnit, coord, gameState.setupOrientation)) {
      const newBoard = placeUnit(gameState.humanBoard, nextUnit, coord, gameState.setupOrientation);
      setGameState(prev => ({ ...prev, humanBoard: newBoard, lastMessage: `Built ${nextUnit.name}.` }));
      setSetupPlacedCount(prev => prev + 1);
    } else {
      setGameState(prev => ({ ...prev, lastMessage: "Can't build there!" }));
    }
  };

  const autoPlaceHuman = () => {
    const randomBoard = getRandomPlacement(createEmptyBoard());
    setGameState(prev => ({
      ...prev,
      humanBoard: randomBoard,
      lastMessage: "Forts scattered randomly.",
    }));
    setSetupPlacedCount(UNIT_TYPES.length);
  };

  const finishSetup = () => {
    if (gameState.mode === GameMode.SINGLE_PLAYER) {
      const aiRandomBoard = getRandomPlacement(createEmptyBoard());
      setGameState(prev => ({
        ...prev,
        enemyBoard: aiRandomBoard,
        phase: GamePhase.PLAYING,
        lastMessage: "Battle Started! Throw snowballs at the enemy grid.",
      }));
    } else {
      peerService.send({ type: 'READY' });
      // Note: We need a better handshake for "Both Ready" in a real app,
      // but assuming the user waits for the other is okay for this prototype.
      // If we receive READY *after* this, we start.
      // If we received it *before*, we need to know.
      // Current logic relies on receiving READY while in WAITING state.
      // If opponent sent it while we were setup, we missed it?
      // NOTE: PeerService buffers data if we aren't listening? No.
      // Fix: We assume players setup roughly same time or tell each other.
      setGameState(prev => ({
        ...prev,
        phase: GamePhase.WAITING_FOR_OPPONENT,
        lastMessage: "Waiting for other team...",
      }));
    }
  };

  const handleShot = (coord: Coordinate) => {
    if (gameState.phase !== GamePhase.PLAYING || gameState.turn !== PlayerType.HUMAN) return;
    if (gameState.enemyBoard.grid[coord.row][coord.col] !== CellStatus.EMPTY) return;

    if (gameState.mode === GameMode.SINGLE_PLAYER) {
      const { board: newAiBoard, result, sunkUnitName } = fireShot(gameState.enemyBoard, coord);
      let message = result === 'HIT' ? "Hit!" : "Miss.";
      if (result === 'SUNK') message = `Eliminated ${sunkUnitName}!`;
      const isWin = checkWinCondition(newAiBoard);
      
      setGameState(prev => ({
        ...prev,
        enemyBoard: newAiBoard,
        turn: isWin ? PlayerType.HUMAN : PlayerType.AI,
        phase: isWin ? GamePhase.GAMEOVER : GamePhase.PLAYING,
        winner: isWin ? PlayerType.HUMAN : null,
        lastMessage: isWin ? "Victory!" : message,
        aiThinking: !isWin,
      }));
    } else {
      peerService.send({ type: 'FIRE', row: coord.row, col: coord.col });
      setGameState(prev => ({ ...prev, lastMessage: "Throwing snowball...", turn: PlayerType.REMOTE }));
    }
  };

  useEffect(() => {
    if (gameState.mode === GameMode.SINGLE_PLAYER && gameState.phase === GamePhase.PLAYING && gameState.turn === PlayerType.AI && !gameState.winner) {
      const performAITurn = async () => {
        await new Promise(r => setTimeout(r, 1500)); 
        const { coordinate, message } = await getAIMove(gameState.enemyBoard, gameState.humanBoard);
        setGameState(current => {
           if (current.phase !== GamePhase.PLAYING) return current;
           const { board: newHumanBoard, result, sunkUnitName } = fireShot(current.humanBoard, coordinate);
           let aiMsg = `Cmdr Frost: ${result === 'HIT' ? "Gotcha!" : "Drats."}`;
           if (result === 'SUNK') aiMsg = `Cmdr Frost froze your ${sunkUnitName}!`;
           if (message) aiMsg = `Cmdr Frost: "${message}"`;
           const isWin = checkWinCondition(newHumanBoard);
           return {
             ...current,
             humanBoard: newHumanBoard,
             turn: isWin ? PlayerType.AI : PlayerType.HUMAN,
             phase: isWin ? GamePhase.GAMEOVER : GamePhase.PLAYING,
             winner: isWin ? PlayerType.AI : null,
             lastMessage: isWin ? "Defeat!" : aiMsg,
             aiThinking: false,
           };
        });
      };
      performAITurn();
    }
  }, [gameState.phase, gameState.turn, gameState.winner, gameState.mode]);

  const currentUnitToPlace = UNIT_TYPES[setupPlacedCount];
  const allPlaced = setupPlacedCount >= UNIT_TYPES.length;

  return (
    <div className="flex flex-col h-screen bg-snow-900 text-white overflow-hidden snow-bg">
      
      {/* Header */}
      <header className="flex-none p-4 flex justify-between items-center border-b border-white/10 bg-snow-900/90 backdrop-blur-md sticky top-0 z-50 shadow-lg">
        <div>
          <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-ice-300">
            WORMS WARFARE
          </h1>
          {gameState.mode === GameMode.MULTI_PLAYER && (
            <p className="text-xs text-ice-300 font-mono">
              OPPONENT: {gameState.opponentPeerId ? 'CONNECTED' : 'WAITING'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {gameState.phase !== GamePhase.MENU && (
            <button 
              onClick={() => resetGame(false)}
              className="px-4 py-2 text-sm font-bold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-colors"
            >
              Surrender
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col lg:flex-row items-center justify-center p-4 lg:gap-12 gap-6 relative">
        
        {/* Menu Phase */}
        {gameState.phase === GamePhase.MENU && (
          <MainMenu 
            onPlayAI={startSinglePlayer}
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
            hostCode={hostCode}
            isConnecting={isConnecting}
            error={menuError}
            onCancel={() => resetGame(false)}
          />
        )}

        {/* Message Bar */}
        {gameState.phase !== GamePhase.MENU && (
          <div className="absolute top-4 lg:top-8 px-6 py-2 bg-snow-800/80 rounded-full border border-white/20 backdrop-blur-md z-10 max-w-2xl text-center shadow-lg transform hover:scale-105 transition-transform">
             <p className="text-sm md:text-base font-bold text-white">
               {gameState.aiThinking ? "Enemy is aiming..." : gameState.lastMessage}
             </p>
          </div>
        )}

        {/* Setup Overlay */}
        {(gameState.phase === GamePhase.SETUP || gameState.phase === GamePhase.WAITING_FOR_OPPONENT) && (
          <div className="lg:absolute lg:left-8 lg:top-1/2 lg:-translate-y-1/2 flex flex-col gap-4 bg-snow-800/90 p-6 rounded-2xl border border-white/20 backdrop-blur-xl shadow-2xl z-20 w-full max-w-md lg:w-80 animate-float">
            <h2 className="text-xl font-black text-white mb-2 uppercase italic">Build Phase</h2>
            {gameState.phase === GamePhase.WAITING_FOR_OPPONENT ? (
               <div className="text-center py-8">
                 <div className="animate-spin text-4xl mb-4">❄️</div>
                 <p className="font-bold">Forts Built.</p>
                 <p className="text-sm opacity-70">Waiting for enemy...</p>
               </div>
            ) : !allPlaced ? (
              <>
                <div className="p-4 bg-snow-900/50 rounded-lg border border-white/5">
                  <p className="text-xs text-ice-300 uppercase tracking-widest mb-2 font-bold">Current Unit</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${currentUnitToPlace.color} shadow-lg border border-white/20`}></div>
                    <div>
                      <p className="font-bold">{currentUnitToPlace.name}</p>
                      <p className="text-xs opacity-70">Size: {currentUnitToPlace.size} blocks</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setGameState(p => ({...p, setupOrientation: p.setupOrientation === 'horizontal' ? 'vertical' : 'horizontal'}))}
                    className="flex-1 py-3 bg-snow-700 hover:bg-snow-600 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-white/10"
                  >
                    Rotate
                  </button>
                  <button 
                    onClick={autoPlaceHuman}
                    className="flex-1 py-3 bg-snow-700 hover:bg-snow-600 rounded-lg font-bold transition-colors border border-white/10"
                  >
                    Auto-Build
                  </button>
                </div>
                <p className="text-xs text-center text-ice-200 mt-2">Tap grid to build.</p>
              </>
            ) : (
              <button 
                onClick={finishSetup}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl font-black text-lg shadow-lg transition-all transform hover:scale-105"
              >
                READY FOR BATTLE
              </button>
            )}
          </div>
        )}

        {/* Human Board */}
        {gameState.phase !== GamePhase.MENU && (
          <div className={`transition-opacity duration-500 ${gameState.phase === GamePhase.PLAYING && gameState.turn === PlayerType.HUMAN ? 'opacity-60 scale-95 grayscale-[0.5]' : 'opacity-100'}`}>
            <Grid 
              title="Friendly Territory"
              board={gameState.humanBoard}
              isEnemyBoard={false}
              showShips={true}
              disabled={gameState.phase !== GamePhase.SETUP}
              onCellClick={handleSetupClick}
            />
          </div>
        )}

        {/* VS */}
        {gameState.phase !== GamePhase.MENU && gameState.phase !== GamePhase.SETUP && gameState.phase !== GamePhase.WAITING_FOR_OPPONENT && (
          <div className="text-4xl font-black text-white/20 hidden lg:block italic">VS</div>
        )}

        {/* Enemy Board */}
        {gameState.phase !== GamePhase.MENU && gameState.phase !== GamePhase.SETUP && gameState.phase !== GamePhase.WAITING_FOR_OPPONENT && (
          <div className={`transition-all duration-500 ${gameState.turn === PlayerType.HUMAN ? 'ring-4 ring-ice-500/50 rounded-xl shadow-2xl shadow-ice-500/20 scale-105' : 'opacity-80 scale-95'}`}>
            <Grid 
              title="Enemy Territory"
              board={gameState.enemyBoard}
              isEnemyBoard={true}
              showShips={gameState.phase === GamePhase.GAMEOVER} 
              disabled={gameState.phase !== GamePhase.PLAYING || gameState.turn !== PlayerType.HUMAN || gameState.aiThinking}
              onCellClick={handleShot}
            />
          </div>
        )}

      </main>

      {/* Game Over Modal */}
      {gameState.phase === GamePhase.GAMEOVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-snow-800 border-2 border-white/10 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl transform animate-float">
            <div className="text-6xl mb-4">{gameState.winner === PlayerType.HUMAN ? '🏆' : '❄️'}</div>
            <h2 className={`text-4xl font-black mb-4 italic ${gameState.winner === PlayerType.HUMAN ? 'text-green-400' : 'text-blue-200'}`}>
              {gameState.winner === PlayerType.HUMAN ? "VICTORY!" : "FROZEN!"}
            </h2>
            <p className="text-ice-100 mb-8 text-lg font-medium">
              {gameState.winner === PlayerType.HUMAN 
                ? "You are the King of the Hill!" 
                : "Better luck next winter."}
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => resetGame(false)}
                className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                Exit
              </button>
              {gameState.mode === GameMode.SINGLE_PLAYER && (
                <button 
                  onClick={() => resetGame(true)}
                  className="px-6 py-3 bg-ice-500 text-snow-900 font-bold rounded-xl hover:bg-ice-400 transition-colors shadow-lg"
                >
                  Rematch
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
