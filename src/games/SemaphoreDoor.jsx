import { useState, useEffect, useCallback } from 'react';

export default function SemaphoreDoor({ onBack }) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [treasuresCollected, setTreasuresCollected] = useState(0);

  // Door state
  const [doorState, setDoorState] = useState('locked'); // locked, open
  const [semaphoreValue, setSemaphoreValue] = useState(1); // Binary semaphore
  const [isDoorJammed, setIsDoorJammed] = useState(false);

  // Adventurers (processes)
  const [adventurers, setAdventurers] = useState([
    { id: 1, name: 'Knight', position: -100, emoji: '🧙', waiting: false, passed: false },
    { id: 2, name: 'Wizard', position: -200, emoji: '🧙‍♀️', waiting: false, passed: false },
    { id: 3, name: 'Archer', position: -300, emoji: '🏹', waiting: false, passed: false }
  ]);

  const [currentAdventurer, setCurrentAdventurer] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [sequenceHistory, setSequenceHistory] = useState([]);
  const [correctSequences, setCorrectSequences] = useState(0);

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 2500);
  }, []);

  // Wait operation (P/down) - Lock the door
  const waitOperation = () => {
    if (isDoorJammed) return;

    setSemaphoreValue(prev => {
      const newValue = prev - 1;
      
      if (newValue < 0) {
        // Error - trying to lock when already locked
        setIsDoorJammed(true);
        addAlert('🚨 DOOR JAMMED! Wrong sequence!', 'error');
        setScore(prev => Math.max(0, prev - 20));
        return prev;
      }

      setDoorState('locked');
      addAlert('🔒 WAIT: Door Locked', 'info');
      setSequenceHistory(prev => [...prev, 'WAIT']);
      return newValue;
    });
  };

  // Signal operation (V/up) - Unlock the door
  const signalOperation = () => {
    if (isDoorJammed) return;

    setSemaphoreValue(prev => {
      const newValue = prev + 1;
      
      if (newValue > 1) {
        // Error - trying to unlock when already unlocked
        setIsDoorJammed(true);
        addAlert('🚨 DOOR JAMMED! Wrong sequence!', 'error');
        setScore(prev => Math.max(0, prev - 20));
        return prev;
      }

      setDoorState('open');
      addAlert('🔓 SIGNAL: Door Opened', 'success');
      setSequenceHistory(prev => [...prev, 'SIGNAL']);
      return newValue;
    });
  };

  // Reset door when jammed
  const resetDoor = () => {
    setIsDoorJammed(false);
    setDoorState('locked');
    setSemaphoreValue(1);
    setSequenceHistory([]);
    setAdventurers(prev => prev.map(a => ({ ...a, waiting: false, position: a.position })));
    addAlert('🔧 Door Reset!', 'info');
  };

  // Move adventurer through door
  const moveAdventurerThrough = () => {
    if (doorState !== 'open' || !currentAdventurer) return;

    const adventurer = adventurers.find(a => a.id === currentAdventurer);
    if (!adventurer || adventurer.passed) return;

    // Adventurer enters (WAIT)
    setAdventurers(prev => prev.map(a => 
      a.id === currentAdventurer 
        ? { ...a, position: 400, waiting: true }
        : a
    ));

    // Simulate passing through
    setTimeout(() => {
      setAdventurers(prev => prev.map(a => 
        a.id === currentAdventurer 
          ? { ...a, position: 900, waiting: false, passed: true }
          : a
      ));

      // Collect treasure
      setTreasuresCollected(prev => prev + 1);
      setScore(prev => prev + 50);
      setCorrectSequences(prev => prev + 1);
      addAlert(`${adventurer.emoji} passed! +50`, 'success');

      // Check if correct sequence was used
      if (sequenceHistory.length === 2 && 
          sequenceHistory[0] === 'WAIT' && 
          sequenceHistory[1] === 'SIGNAL') {
        setScore(prev => prev + 10);
        addAlert('✅ Perfect Sequence! +10', 'success');
      }

      // Reset for next adventurer
      setDoorState('locked');
      setSemaphoreValue(1);
      setSequenceHistory([]);
      setCurrentAdventurer(null);

      // Spawn next adventurer
      if (treasuresCollected + 1 < adventurers.length) {
        setTimeout(() => {
          setCurrentAdventurer(adventurers[treasuresCollected + 1]?.id);
        }, 500);
      }
    }, 1500);
  };

  // Initialize first adventurer
  useEffect(() => {
    if (gameState === 'playing' && currentAdventurer === null && adventurers.length > 0) {
      setCurrentAdventurer(adventurers[0].id);
    }
  }, [gameState, currentAdventurer, adventurers]);

  // Animate adventurers moving to door
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setAdventurers(prev => prev.map(a => {
        if (a.id === currentAdventurer && !a.waiting && !a.passed && a.position < 100) {
          return { ...a, position: a.position + 2 };
        }
        return a;
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, currentAdventurer]);

  // Check level up
  useEffect(() => {
    if (treasuresCollected >= level * 3) {
      setLevel(prev => prev + 1);
      addAlert(`🎉 Level ${level + 1}!`, 'success');
    }
  }, [treasuresCollected, level, addAlert]);

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 flex items-center justify-center z-50 p-6 overflow-y-auto">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 max-w-3xl border-2 border-purple-500/50 shadow-2xl my-8">
          <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
            🚪 SEMAPHORE DOOR 🔐
          </h2>
          
          <div className="space-y-6 text-gray-200">
            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-2">⭐ OS Concepts:</h3>
              <p className="text-gray-300">• Binary Semaphores (0 or 1)</p>
              <p className="text-gray-300">• Wait (P) and Signal (V) Operations</p>
              <p className="text-gray-300">• Mutual Exclusion & Critical Sections</p>
              <p className="text-gray-300">• Process Synchronization</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-pink-400 mb-2">🎮 How to Play:</h3>
              <p className="text-gray-300">• A magical treasure door opens with correct semaphore sequence</p>
              <p className="text-gray-300">• Help adventurers pass one by one</p>
              <p className="text-gray-300">• <strong>WAIT:</strong> Lock the door (P operation, semaphore - 1)</p>
              <p className="text-gray-300">• <strong>SIGNAL:</strong> Unlock the door (V operation, semaphore + 1)</p>
              <p className="text-gray-300">• Wrong sequence → door jams!</p>
              <p className="text-gray-300">• Correct: WAIT → adventurer enters → SIGNAL → next</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">🎨 Animations:</h3>
              <p className="text-gray-300">• Door glows green (open) / red (locked) 🚪</p>
              <p className="text-gray-300">• Adventurers dance when door opens 💃</p>
              <p className="text-gray-300">• Sparks fly when door jams ⚡</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-2">🏆 Scoring:</h3>
              <p className="text-gray-300">• Correct Sequence: +10</p>
              <p className="text-gray-300">• Adventurer Passes: +50</p>
              <p className="text-gray-300">• Door Jam: -20</p>
            </div>

            <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
              <p className="text-sm text-gray-300">
                <strong>💡 Tip:</strong> One process uses the resource at a time! 
                WAIT locks the door (enter critical section), SIGNAL unlocks it (exit critical section).
              </p>
            </div>

            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-bold text-white hover:scale-105 transition shadow-lg"
              >
                🚪 Open The Door
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentAdv = adventurers.find(a => a.id === currentAdventurer);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
            🚪 Semaphore Door 🔐
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstructions(true)}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition"
            >
              ❓ Help
            </button>
            {onBack && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBack();
                }}
                className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition"
              >
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400">{score}</div>
            <div className="text-xs text-gray-400">Score</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-pink-500/30">
            <div className="text-2xl font-bold text-pink-400">{level}</div>
            <div className="text-xs text-gray-400">Level</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{treasuresCollected}</div>
            <div className="text-xs text-gray-400">Treasures</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{correctSequences}</div>
            <div className="text-xs text-gray-400">Perfect</div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="max-w-6xl mx-auto bg-gray-800/50 rounded-2xl border-2 border-gray-700 p-8 relative" style={{ height: '400px' }}>
        {/* Path */}
        <div className="absolute top-1/2 left-0 right-0 h-24 bg-yellow-900/20 border-y-2 border-yellow-600/30 transform -translate-y-1/2"></div>

        {/* Door */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className={`relative w-32 h-48 rounded-t-full transition-all duration-500 ${
            doorState === 'open' 
              ? 'bg-gradient-to-b from-green-500 to-green-700 shadow-2xl shadow-green-500/50 animate-pulse' 
              : 'bg-gradient-to-b from-red-500 to-red-700 shadow-2xl shadow-red-500/30'
          } ${isDoorJammed ? 'animate-shake' : ''}`}>
            {/* Door decoration */}
            <div className="absolute inset-4 border-4 border-white/30 rounded-t-full"></div>
            <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 text-4xl">
              {doorState === 'open' ? '🔓' : '🔒'}
            </div>
            
            {/* Jammed sparks */}
            {isDoorJammed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl animate-ping">⚡</div>
              </div>
            )}

            {/* Adventurer in doorway */}
            {currentAdv && currentAdv.waiting && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-5xl animate-bounce">
                {currentAdv.emoji}
              </div>
            )}
          </div>

          {/* Door base */}
          <div className="w-32 h-4 bg-gray-700 rounded-b-lg"></div>
        </div>

        {/* Adventurers */}
        {adventurers.map(adventurer => {
          if (adventurer.passed) return null;
          
          return (
            <div
              key={adventurer.id}
              className={`absolute text-5xl transition-all duration-200 ${
                adventurer.id === currentAdventurer ? 'animate-pulse' : ''
              }`}
              style={{ 
                left: `${adventurer.position}px`, 
                top: '50%', 
                transform: 'translateY(-50%)',
                opacity: adventurer.position > 800 ? 0 : 1
              }}
            >
              {adventurer.emoji}
            </div>
          );
        })}

        {/* Treasure chest */}
        <div className="absolute right-16 top-1/2 transform -translate-y-1/2 text-6xl">
          💎
        </div>

        {/* Sequence display */}
        <div className="absolute top-4 left-4 bg-gray-900/80 rounded-lg p-3 min-w-48">
          <div className="text-xs text-gray-400 mb-1">Current Sequence:</div>
          <div className="flex gap-1">
            {sequenceHistory.length === 0 ? (
              <span className="text-gray-500 text-xs">No operations yet</span>
            ) : (
              sequenceHistory.map((op, idx) => (
                <span 
                  key={idx}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    op === 'WAIT' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                  }`}
                >
                  {op}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Semaphore value */}
        <div className="absolute top-4 right-4 bg-gray-900/80 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Semaphore Value:</div>
          <div className={`text-3xl font-bold ${
            semaphoreValue === 1 ? 'text-green-400' : 
            semaphoreValue === 0 ? 'text-red-400' : 
            'text-orange-400'
          }`}>
            {semaphoreValue}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 text-center">Semaphore Operations</h3>
          <div className="space-y-3">
            <button
              onClick={waitOperation}
              disabled={isDoorJammed}
              className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-bold text-white hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
            >
              🔒 WAIT (P) - Lock Door
            </button>
            <button
              onClick={signalOperation}
              disabled={isDoorJammed}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-bold text-white hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
            >
              🔓 SIGNAL (V) - Unlock Door
            </button>
            <button
              onClick={moveAdventurerThrough}
              disabled={doorState !== 'open' || !currentAdv || currentAdv.waiting}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-bold text-white hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
            >
              ➡️ Move Adventurer Through
            </button>
          </div>
        </div>

        <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Door Status:</h3>
            <div className={`px-4 py-2 rounded-lg text-center font-bold ${
              isDoorJammed ? 'bg-red-500 text-white' :
              doorState === 'open' ? 'bg-green-500 text-white' :
              'bg-red-500/50 text-white'
            }`}>
              {isDoorJammed ? '⚠️ JAMMED' : doorState === 'open' ? '🟢 OPEN' : '🔴 LOCKED'}
            </div>
          </div>

          {isDoorJammed && (
            <button
              onClick={resetDoor}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-bold text-white hover:scale-105 transition shadow-lg"
            >
              🔧 Reset Door
            </button>
          )}

          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-2">Current Adventurer:</h3>
            {currentAdv && !currentAdv.passed ? (
              <div className="text-center text-3xl">{currentAdv.emoji}</div>
            ) : (
              <div className="text-center text-gray-500 text-sm">Waiting...</div>
            )}
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <div>💡 <strong>Correct Flow:</strong></div>
            <div>1. WAIT (lock) → semaphore = 0</div>
            <div>2. Adventurer enters</div>
            <div>3. SIGNAL (unlock) → semaphore = 1</div>
            <div>4. Next adventurer</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`px-4 py-2 rounded-lg shadow-lg animate-fade-in ${
              alert.type === 'success' ? 'bg-green-500' :
              alert.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            } text-white font-bold`}
          >
            {alert.message}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          25% { transform: translate(-50%, -50%) rotate(-5deg); }
          75% { transform: translate(-50%, -50%) rotate(5deg); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
