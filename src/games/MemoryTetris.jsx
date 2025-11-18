import { useState, useEffect, useCallback } from 'react';

export default function MemoryTetris({ onBack }) {
  const [gameStatus, setGameStatus] = useState('instructions');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [memoryBlocks, setMemoryBlocks] = useState(Array(20).fill(null)); // 20 memory slots
  const [fallingProcess, setFallingProcess] = useState(null);
  const [fallPosition, setFallPosition] = useState(0);
  const [algorithm, setAlgorithm] = useState('FIRST_FIT');
  const [fragmentation, setFragmentation] = useState(0);
  const [powerUps, setPowerUps] = useState({ compactionHammer: 3, perfectFitHint: 2 });
  const [combo, setCombo] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const algorithms = [
    { name: 'FIRST_FIT', color: 'blue', description: 'First available space' },
    { name: 'BEST_FIT', color: 'green', description: 'Smallest sufficient space' },
    { name: 'WORST_FIT', color: 'purple', description: 'Largest available space' }
  ];

  const startGame = () => {
    setGameStatus('playing');
    setScore(0);
    setLevel(1);
    setMemoryBlocks(Array(20).fill(null));
    setFallingProcess(null);
    setFallPosition(0);
    setFragmentation(0);
    setCombo(0);
    setPowerUps({ compactionHammer: 3, perfectFitHint: 2 });
    setAlerts([]);
    spawnProcess();
  };

  const spawnProcess = () => {
    const sizes = [1, 2, 3, 4, 5];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    setFallingProcess({
      id: `P${Date.now() % 10000}`,
      size,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
    setFallPosition(0);
  };

  const calculateFragmentation = (blocks) => {
    let freeSpaces = 0;
    let fragCount = 0;
    
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] === null) {
        if (freeSpaces > 0 && i > 0 && blocks[i-1] !== null) {
          fragCount++;
        }
        freeSpaces++;
      }
    }
    
    const fragPercent = freeSpaces > 0 ? (fragCount / freeSpaces) * 100 : 0;
    return Math.min(100, Math.floor(fragPercent * 2));
  };

  const findFitPosition = (blocks, size, algoType) => {
    const freeRanges = [];
    let start = null;
    
    // Find all free ranges
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] === null) {
        if (start === null) start = i;
      } else {
        if (start !== null) {
          freeRanges.push({ start, size: i - start });
          start = null;
        }
      }
    }
    if (start !== null) {
      freeRanges.push({ start, size: blocks.length - start });
    }

    // Filter ranges that can fit the process
    const validRanges = freeRanges.filter(r => r.size >= size);
    if (validRanges.length === 0) return -1;

    // Apply algorithm
    if (algoType === 'FIRST_FIT') {
      return validRanges[0].start;
    } else if (algoType === 'BEST_FIT') {
      const best = validRanges.reduce((min, curr) => 
        curr.size < min.size ? curr : min
      );
      return best.start;
    } else if (algoType === 'WORST_FIT') {
      const worst = validRanges.reduce((max, curr) => 
        curr.size > max.size ? curr : max
      );
      return worst.start;
    }
    
    return -1;
  };

  const placeProcess = useCallback(() => {
    if (!fallingProcess) return;
    
    const position = findFitPosition(memoryBlocks, fallingProcess.size, algorithm);
    
    if (position === -1) {
      // Game over - no space
      setGameStatus('gameover');
      return;
    }

    // Place the process
    const newBlocks = [...memoryBlocks];
    for (let i = position; i < position + fallingProcess.size; i++) {
      newBlocks[i] = {
        id: fallingProcess.id,
        color: fallingProcess.color
      };
    }

    setMemoryBlocks(newBlocks);

    // Calculate if it's a perfect fit
    const freeSpaceBefore = position > 0 && newBlocks[position - 1] === null;
    const freeSpaceAfter = position + fallingProcess.size < newBlocks.length && 
                           newBlocks[position + fallingProcess.size] === null;
    const isPerfectFit = !freeSpaceBefore && !freeSpaceAfter;

    // Calculate score
    let points = fallingProcess.size * 10 * level;
    if (isPerfectFit) {
      points += 100;
      setCombo(c => c + 1);
      addAlert(`🎯 Perfect Fit! +100 bonus | Combo: ${combo + 1}x`);
    } else {
      setCombo(0);
    }

    // Combo multiplier
    if (combo > 0) {
      points *= (1 + combo * 0.2);
      addAlert(`🔥 Combo x${(1 + combo * 0.2).toFixed(1)} multiplier!`);
    }

    setScore(s => s + Math.floor(points));

    // Update fragmentation
    const newFrag = calculateFragmentation(newBlocks);
    setFragmentation(newFrag);

    // Check for level up
    if (score > level * 500) {
      setLevel(l => l + 1);
      addAlert(`⬆️ Level ${level + 1}!`);
    }

    // Spawn next process
    setTimeout(() => {
      spawnProcess();
    }, 500);

  }, [fallingProcess, memoryBlocks, algorithm, combo, level, score]);

  useEffect(() => {
    if (gameStatus !== 'playing' || !fallingProcess) return;

    const fallInterval = setInterval(() => {
      setFallPosition(pos => {
        if (pos >= 100) {
          placeProcess();
          return 0;
        }
        return pos + (5 + level * 2);
      });
    }, 100);

    return () => clearInterval(fallInterval);
  }, [gameStatus, fallingProcess, level, placeProcess]);

  const useCompactionHammer = () => {
    if (powerUps.compactionHammer <= 0 || score < 50) return;

    // Compact memory - move all processes to the left
    const compacted = [];
    const processes = [];
    
    // Extract all process blocks
    for (let i = 0; i < memoryBlocks.length; i++) {
      if (memoryBlocks[i] !== null) {
        processes.push(memoryBlocks[i]);
      }
    }
    
    // Place them compacted
    for (let i = 0; i < memoryBlocks.length; i++) {
      compacted[i] = i < processes.length ? processes[i] : null;
    }

    setMemoryBlocks(compacted);
    setFragmentation(0);
    setPowerUps(p => ({ ...p, compactionHammer: p.compactionHammer - 1 }));
    setScore(s => s - 50);
    addAlert('🔨 Memory Compacted! Fragmentation cleared!');
  };

  const usePerfectFitHint = () => {
    if (powerUps.perfectFitHint <= 0 || !fallingProcess) return;

    setShowHint(true);
    setPowerUps(p => ({ ...p, perfectFitHint: p.perfectFitHint - 1 }));
    addAlert('💡 Best position highlighted!');

    setTimeout(() => setShowHint(false), 3000);
  };

  const addAlert = (message) => {
    const alert = { id: Date.now(), message };
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 3000);
  };

  const handleKeyPress = useCallback((e) => {
    if (gameStatus !== 'playing') return;
    
    if (e.key === ' ') {
      e.preventDefault();
      placeProcess();
    } else if (e.key === 'c' || e.key === 'C') {
      useCompactionHammer();
    } else if (e.key === 'h' || e.key === 'H') {
      usePerfectFitHint();
    }
  }, [gameStatus, placeProcess]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (gameStatus === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black p-8">
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
          ← Back to Arcade
        </button>
        
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-2xl p-10 border-2 border-purple-500">
          <h2 className="text-5xl font-bold text-purple-400 mb-3 text-center">🧩 Memory Tetris</h2>
          <p className="text-gray-400 text-center mb-8 text-lg">Efficient Memory Block Allocation</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-purple-900/30 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-300 mb-4">🧠 OS Concepts Learned</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• First Fit / Best Fit / Worst Fit algorithms</li>
                  <li>• Internal & External Fragmentation</li>
                  <li>• Memory Compaction techniques</li>
                  <li>• Dynamic memory allocation</li>
                </ul>
              </div>

              <div className="bg-purple-900/30 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-300 mb-4">⚡ Power-ups</h3>
                <div className="space-y-3">
                  <div className="bg-red-800/30 p-3 rounded">
                    <div className="font-bold text-red-300">Compaction Hammer (50pts)</div>
                    <div className="text-sm text-gray-400">Crush fragmentation instantly</div>
                    <div className="text-xs text-gray-500 mt-1">Press 'C' to use</div>
                  </div>
                  <div className="bg-yellow-800/30 p-3 rounded">
                    <div className="font-bold text-yellow-300">Perfect Fit Hint</div>
                    <div className="text-sm text-gray-400">Highlights optimal position</div>
                    <div className="text-xs text-gray-500 mt-1">Press 'H' to use</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">🎮 Gameplay</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold">1.</span>
                    <span>Processes fall from top with memory size labeled</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold">2.</span>
                    <span>Choose allocation algorithm (First/Best/Worst Fit)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold">3.</span>
                    <span>Process auto-places based on selected algorithm</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold">4.</span>
                    <span>Press SPACE to place immediately</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold">5.</span>
                    <span>Bad choices → fragmentation → game over faster</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4">🏆 Scoring</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <span>Block placed: Size × 10 × Level</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <span>Perfect fit: +100 bonus points</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <span>Combo streak: Multiplier increases</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full mt-10 px-10 py-5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105 rounded-xl font-bold text-2xl transition-all shadow-2xl"
          >
            🎮 Start Game
          </button>
        </div>
      </div>
    );
  }

  const hintPosition = showHint && fallingProcess ? findFitPosition(memoryBlocks, fallingProcess.size, 'BEST_FIT') : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black p-8">
      <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
        ← Back
      </button>
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-4xl font-bold text-purple-400">🧩 Memory Tetris</h2>
            <p className="text-gray-400 mt-1">Minimize fragmentation, maximize efficiency</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{Math.floor(score)} pts</div>
            <div className="text-gray-400">Level {level} | Combo: {combo}x</div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-green-900/30 border border-green-500/50 px-4 py-2 rounded-lg text-green-300 animate-pulse">
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Fragmentation Meter */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex justify-between mb-2">
            <span className="text-white font-bold">Fragmentation</span>
            <span className={`font-bold ${fragmentation > 70 ? 'text-red-400' : fragmentation > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
              {fragmentation}%
            </span>
          </div>
          <div className="h-8 bg-gray-800 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-500 ${fragmentation > 70 ? 'bg-red-500' : fragmentation > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${fragmentation}%` }}
            />
          </div>
          {fragmentation > 70 && (
            <div className="mt-3 text-red-400 font-semibold animate-pulse">⚠️ HIGH FRAGMENTATION - Use compaction!</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Controls & Power-ups */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 space-y-6">
              <div>
                <h3 className="text-white font-bold mb-4">Algorithm</h3>
                <div className="space-y-2">
                  {algorithms.map(algo => (
                    <button
                      key={algo.name}
                      onClick={() => setAlgorithm(algo.name)}
                      className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-sm ${
                        algorithm === algo.name
                          ? `bg-gradient-to-r from-${algo.color}-500 to-${algo.color}-600 text-white shadow-lg`
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div>{algo.name.replace('_', ' ')}</div>
                      <div className="text-xs opacity-75">{algo.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold mb-4">⚡ Power-ups</h3>
                <div className="space-y-2">
                  <button
                    onClick={useCompactionHammer}
                    disabled={powerUps.compactionHammer <= 0 || score < 50}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold text-sm transition"
                  >
                    🔨 Compact ({powerUps.compactionHammer} left)
                    <div className="text-xs">Press C | 50pts</div>
                  </button>
                  <button
                    onClick={usePerfectFitHint}
                    disabled={powerUps.perfectFitHint <= 0}
                    className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold text-sm transition"
                  >
                    💡 Hint ({powerUps.perfectFitHint} left)
                    <div className="text-xs">Press H</div>
                  </button>
                </div>
              </div>

              <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
                <h4 className="text-purple-300 font-bold mb-2 text-sm">⌨️ Controls</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <div>SPACE - Place immediately</div>
                  <div>C - Use compaction</div>
                  <div>H - Show hint</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Memory Board */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white font-bold mb-4">Memory Blocks</h3>
              
              {/* Falling Process Preview */}
              {fallingProcess && (
                <div className="mb-4 bg-gray-800 rounded-lg p-4 border border-purple-500/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-bold">Incoming Process</div>
                      <div className="text-gray-400 text-sm">{fallingProcess.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">{fallingProcess.size} blocks</div>
                      <div className="text-gray-400 text-sm">Fall: {fallPosition}%</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${fallPosition}%` }} />
                  </div>
                </div>
              )}

              {/* Memory Grid */}
              <div className="grid grid-cols-10 gap-2">
                {memoryBlocks.map((block, idx) => {
                  const isHintPosition = showHint && idx >= hintPosition && idx < hintPosition + (fallingProcess?.size || 0);
                  
                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        block !== null
                          ? 'border-gray-600'
                          : isHintPosition
                          ? 'border-yellow-400 bg-yellow-400/20 animate-pulse'
                          : 'border-gray-700 bg-gray-800'
                      }`}
                      style={block !== null ? { backgroundColor: block.color } : {}}
                    >
                      {block !== null && (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
                          {block.id}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Statistics */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Used Blocks</div>
                  <div className="text-2xl font-bold text-white">{memoryBlocks.filter(b => b !== null).length}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Free Blocks</div>
                  <div className="text-2xl font-bold text-green-400">{memoryBlocks.filter(b => b === null).length}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Efficiency</div>
                  <div className="text-2xl font-bold text-purple-400">{Math.max(0, 100 - fragmentation)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Over Modal */}
        {gameStatus === 'gameover' && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl p-10 border-4 border-red-500 text-center max-w-md">
              <div className="text-7xl mb-4">💀</div>
              <div className="text-4xl text-red-400 font-bold mb-3">MEMORY FULL!</div>
              <div className="text-gray-300 mb-6">No space left for processes</div>
              <div className="text-3xl text-white font-bold mb-2">Final Score: {Math.floor(score)}</div>
              <div className="text-gray-400 mb-2">Level Reached: {level}</div>
              <div className="text-gray-400 mb-2">Max Combo: {combo}x</div>
              <div className="text-gray-400 mb-6">Final Fragmentation: {fragmentation}%</div>
              <button 
                onClick={startGame}
                className="px-10 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 rounded-xl font-bold text-lg transition-all hover:scale-105"
              >
                🔄 Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
