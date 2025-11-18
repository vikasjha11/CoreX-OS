import { useState, useEffect, useCallback } from 'react';

export default function ProcessPlanet({ onBack }) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, overheated
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [planetTemp, setPlanetTemp] = useState(0); // 0-100 temperature

  // Creatures (processes)
  const [creatures, setCreatures] = useState([
    { id: 1, name: 'Blobby', state: 'ready', color: 'bg-yellow-400', x: 100, y: 150, emoji: '👾' },
    { id: 2, name: 'Zippy', state: 'ready', color: 'bg-yellow-400', x: 150, y: 180, emoji: '🐙' },
    { id: 3, name: 'Fuzzy', state: 'ready', color: 'bg-yellow-400', x: 120, y: 220, emoji: '🦑' },
    { id: 4, name: 'Sparky', state: 'ready', color: 'bg-yellow-400', x: 80, y: 190, emoji: '🦀' },
    { id: 5, name: 'Wiggly', state: 'ready', color: 'bg-yellow-400', x: 140, y: 160, emoji: '🐡' }
  ]);

  const [cpuBusy, setCpuBusy] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [contextSwitchCount, setContextSwitchCount] = useState(0);
  const [lastSwitchTime, setLastSwitchTime] = useState(Date.now());

  // Zone configurations
  const ZONES = {
    ready: { name: 'Ready Zone', color: 'yellow', emoji: '⏳', bounds: { x: 50, y: 130, width: 150, height: 120 } },
    running: { name: 'CPU Zone', color: 'blue', emoji: '⚡', bounds: { x: 250, y: 130, width: 120, height: 120 } },
    waiting: { name: 'Waiting Zone', color: 'green', emoji: '💤', bounds: { x: 420, y: 130, width: 150, height: 120 } }
  };

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 2000);
  }, []);

  // Send creature to CPU
  const scheduleCreature = (creatureId) => {
    if (gameState === 'overheated') return;

    const creature = creatures.find(c => c.id === creatureId);
    if (!creature || creature.state === 'running') return;

    // Check if CPU is available
    const runningCreatures = creatures.filter(c => c.state === 'running');
    if (runningCreatures.length > 0) {
      // Context switch
      const currentTime = Date.now();
      const timeSinceLastSwitch = currentTime - lastSwitchTime;
      
      setCreatures(prev => prev.map(c => {
        if (c.state === 'running') {
          return { ...c, state: 'waiting', color: 'bg-green-400', x: 450 + Math.random() * 80, y: 150 + Math.random() * 80 };
        }
        if (c.id === creatureId) {
          return { ...c, state: 'running', color: 'bg-blue-400', x: 290, y: 170 };
        }
        return c;
      }));

      // Quick switch bonus
      if (timeSinceLastSwitch < 2000) {
        setCombo(prev => prev + 1);
        setScore(prev => prev + 15 + (combo * 5));
        addAlert(`⚡ Quick Switch! +${15 + (combo * 5)}`, 'success');
      } else {
        setScore(prev => prev + 10);
        setCombo(0);
      }

      setContextSwitchCount(prev => prev + 1);
      setLastSwitchTime(currentTime);
      setCpuBusy(true);
      addAlert('🔄 Context Switch!', 'info');
    } else {
      // First schedule
      setCreatures(prev => prev.map(c => 
        c.id === creatureId 
          ? { ...c, state: 'running', color: 'bg-blue-400', x: 290, y: 170 }
          : c
      ));
      setScore(prev => prev + 10);
      setCpuBusy(true);
      setLastSwitchTime(Date.now());
      addAlert('🎯 Scheduled to CPU!', 'success');
    }
  };

  // Move creature to waiting
  const moveToWaiting = (creatureId) => {
    setCreatures(prev => prev.map(c => 
      c.id === creatureId 
        ? { ...c, state: 'waiting', color: 'bg-green-400', x: 450 + Math.random() * 80, y: 150 + Math.random() * 80 }
        : c
    ));
    addAlert('💤 Moved to Waiting', 'info');
  };

  // Move creature back to ready
  const moveToReady = (creatureId) => {
    setCreatures(prev => prev.map(c => 
      c.id === creatureId 
        ? { ...c, state: 'ready', color: 'bg-yellow-400', x: 80 + Math.random() * 100, y: 150 + Math.random() * 80 }
        : c
    ));
    addAlert('⏳ Back to Ready', 'info');
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      // Check temperature based on waiting processes
      const waitingCount = creatures.filter(c => c.state === 'waiting').length;
      const runningCount = creatures.filter(c => c.state === 'running').length;

      // Temperature increases with waiting processes
      setPlanetTemp(prev => {
        let newTemp = prev;
        if (waitingCount >= 3) {
          newTemp = Math.min(100, prev + 5);
        } else if (waitingCount > 0) {
          newTemp = Math.min(100, prev + 2);
        } else {
          newTemp = Math.max(0, prev - 3);
        }

        // Overheat check
        if (newTemp >= 100) {
          setGameState('overheated');
          addAlert('🔥 PLANET OVERHEATED!', 'error');
        }

        return newTemp;
      });

      // Score for keeping CPU active
      if (runningCount > 0) {
        setScore(prev => prev + 1);
      }

      // Auto-complete running process randomly
      if (Math.random() < 0.1) {
        setCreatures(prev => prev.map(c => 
          c.state === 'running'
            ? { ...c, state: 'ready', color: 'bg-yellow-400', x: 80 + Math.random() * 100, y: 150 + Math.random() * 80 }
            : c
        ));
        setCpuBusy(false);
        addAlert('✅ Process Completed!', 'success');
        setScore(prev => prev + 20);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState, creatures, addAlert]);

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center z-50 p-6 overflow-y-auto">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 max-w-3xl border-2 border-purple-500/50 shadow-2xl my-8">
          <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
            👾 PROCESS PLANET 🪐
          </h2>
          
          <div className="space-y-6 text-gray-200">
            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">⭐ OS Concepts:</h3>
              <p className="text-gray-300">• Process States: Ready, Running, Waiting</p>
              <p className="text-gray-300">• Context Switching between processes</p>
              <p className="text-gray-300">• CPU Scheduling & Overload Management</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-2">🎮 How to Play:</h3>
              <p className="text-gray-300">• <strong>Click creatures</strong> to schedule them to the CPU Zone (blue)</p>
              <p className="text-gray-300">• <strong>Ready Zone (Yellow):</strong> Creatures waiting to be scheduled</p>
              <p className="text-gray-300">• <strong>CPU Zone (Blue):</strong> Creature currently executing</p>
              <p className="text-gray-300">• <strong>Waiting Zone (Green):</strong> Creatures waiting for I/O</p>
              <p className="text-gray-300">• Keep CPU active and avoid too many waiting creatures!</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-green-400 mb-2">🎨 Animations:</h3>
              <p className="text-gray-300">• Creatures jump when scheduled ⚡</p>
              <p className="text-gray-300">• CPU glows when busy 💫</p>
              <p className="text-gray-300">• Planet smokes when overheating 🔥</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-2">🏆 Scoring:</h3>
              <p className="text-gray-300">• Keep CPU Active: +1 per tick</p>
              <p className="text-gray-300">• Schedule Process: +10</p>
              <p className="text-gray-300">• Complete Process: +20</p>
              <p className="text-gray-300">• Quick Context Switch: +15 + Combo Bonus</p>
              <p className="text-gray-300">• <strong>Avoid Overload:</strong> Too many waiting = planet overheats!</p>
            </div>

            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-bold text-white hover:scale-105 transition shadow-lg"
              >
                🚀 Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'overheated') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-orange-900 to-gray-900 flex items-center justify-center z-50">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-12 max-w-md text-center border-2 border-red-500/50 shadow-2xl">
          <div className="text-8xl mb-6 animate-bounce">🔥</div>
          <h2 className="text-4xl font-bold mb-4 text-red-400">PLANET OVERHEATED!</h2>
          <p className="text-gray-300 mb-2">Too many processes were waiting!</p>
          <p className="text-2xl font-bold text-yellow-400 mb-6">Final Score: {score}</p>
          <p className="text-gray-400 mb-8">Context Switches: {contextSwitchCount}</p>
          <button
            onClick={() => {
              setGameState('playing');
              setScore(0);
              setCombo(0);
              setPlanetTemp(0);
              setContextSwitchCount(0);
              setCreatures([
                { id: 1, name: 'Blobby', state: 'ready', color: 'bg-yellow-400', x: 100, y: 150, emoji: '👾' },
                { id: 2, name: 'Zippy', state: 'ready', color: 'bg-yellow-400', x: 150, y: 180, emoji: '🐙' },
                { id: 3, name: 'Fuzzy', state: 'ready', color: 'bg-yellow-400', x: 120, y: 220, emoji: '🦑' },
                { id: 4, name: 'Sparky', state: 'ready', color: 'bg-yellow-400', x: 80, y: 190, emoji: '🦀' },
                { id: 5, name: 'Wiggly', state: 'ready', color: 'bg-yellow-400', x: 140, y: 160, emoji: '🐡' }
              ]);
            }}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-bold text-white hover:scale-105 transition"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
            👾 Process Planet 🪐
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

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{score}</div>
            <div className="text-xs text-gray-400">Score</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{combo}x</div>
            <div className="text-xs text-gray-400">Combo</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400">{contextSwitchCount}</div>
            <div className="text-xs text-gray-400">Switches</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{planetTemp}°</div>
            <div className="text-xs text-gray-400">Temperature</div>
          </div>
        </div>

        {/* Temperature Bar */}
        <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Planet Temp:</span>
            <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  planetTemp > 80 ? 'bg-red-500 animate-pulse' :
                  planetTemp > 50 ? 'bg-orange-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${planetTemp}%` }}
              ></div>
            </div>
            {planetTemp > 70 && <span className="text-red-400 animate-bounce">🔥</span>}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="max-w-6xl mx-auto bg-gray-800/50 rounded-2xl border-2 border-gray-700 p-6 relative" style={{ height: '400px' }}>
        {/* Zones */}
        <div className="absolute left-12 top-12 w-36 h-28 bg-yellow-500/20 border-2 border-yellow-400 rounded-lg flex flex-col items-center justify-center">
          <div className="text-3xl mb-1">⏳</div>
          <div className="text-xs font-bold text-yellow-400">Ready Zone</div>
        </div>

        <div className={`absolute left-60 top-12 w-32 h-28 border-2 border-blue-400 rounded-lg flex flex-col items-center justify-center transition ${
          cpuBusy ? 'bg-blue-500/40 animate-pulse shadow-lg shadow-blue-500/50' : 'bg-blue-500/20'
        }`}>
          <div className="text-3xl mb-1">⚡</div>
          <div className="text-xs font-bold text-blue-400">CPU Zone</div>
        </div>

        <div className="absolute right-12 top-12 w-36 h-28 bg-green-500/20 border-2 border-green-400 rounded-lg flex flex-col items-center justify-center">
          <div className="text-3xl mb-1">💤</div>
          <div className="text-xs font-bold text-green-400">Waiting Zone</div>
        </div>

        {/* Creatures */}
        {creatures.map(creature => (
          <div
            key={creature.id}
            onClick={() => scheduleCreature(creature.id)}
            className={`absolute ${creature.color} rounded-full w-12 h-12 flex items-center justify-center cursor-pointer 
              hover:scale-125 transition-all duration-300 shadow-lg border-2 border-white/50
              ${creature.state === 'running' ? 'animate-bounce' : ''}`}
            style={{ 
              left: `${creature.x}px`, 
              top: `${creature.y}px`,
              animation: creature.state === 'running' ? 'bounce 0.5s infinite' : 'none'
            }}
            title={`${creature.name} (${creature.state})`}
          >
            <span className="text-2xl">{creature.emoji}</span>
          </div>
        ))}

        {/* Smoke effect when hot */}
        {planetTemp > 80 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-6xl animate-pulse opacity-50">
              💨
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto mt-6 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-2">Process States:</h3>
            <div className="space-y-1 text-xs text-gray-300">
              <div>🟡 Ready: {creatures.filter(c => c.state === 'ready').length}</div>
              <div>🔵 Running: {creatures.filter(c => c.state === 'running').length}</div>
              <div>🟢 Waiting: {creatures.filter(c => c.state === 'waiting').length}</div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-2">Controls:</h3>
            <div className="space-y-1 text-xs text-gray-300">
              <div>• Click creatures to schedule to CPU</div>
              <div>• Keep CPU busy for points</div>
              <div>• Avoid overheating!</div>
            </div>
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
    </div>
  );
}
