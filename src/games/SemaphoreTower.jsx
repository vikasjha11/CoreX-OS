import { useState, useEffect, useCallback } from 'react';

export default function SemaphoreTower() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, won
  const [score, setScore] = useState(0);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [operationCount, setOperationCount] = useState(0);
  const [hasDeadlock, setHasDeadlock] = useState(false);

  // Power-ups
  const [powerUps, setPowerUps] = useState({
    unlockAll: { count: 2, cooldown: 0 },
    debugVision: { count: 3, active: false, cooldown: 0 }
  });

  // Semaphores for current floor
  const [semaphores, setSemaphores] = useState({});
  const [characters, setCharacters] = useState([]);
  const [doors, setDoors] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Floor configurations
  const FLOORS = {
    1: {
      name: 'Producer-Consumer Room',
      type: 'producer-consumer',
      description: 'Balance producers and consumers with semaphores',
      semaphores: {
        empty: { value: 3, max: 3, color: 'blue' },
        full: { value: 0, max: 3, color: 'green' },
        mutex: { value: 1, max: 1, color: 'red' }
      },
      characters: [
        { id: 'P1', name: 'Producer 1', type: 'producer', position: { x: 100, y: 150 }, state: 'idle', blocked: false },
        { id: 'P2', name: 'Producer 2', type: 'producer', position: { x: 100, y: 250 }, state: 'idle', blocked: false },
        { id: 'C1', name: 'Consumer 1', type: 'consumer', position: { x: 500, y: 150 }, state: 'idle', blocked: false },
        { id: 'C2', name: 'Consumer 2', type: 'consumer', position: { x: 500, y: 250 }, state: 'idle', blocked: false }
      ],
      winCondition: () => operationCount >= 10 && !hasDeadlock
    },
    2: {
      name: 'Reader-Writer Library',
      type: 'reader-writer',
      description: 'Manage concurrent readers and exclusive writers',
      semaphores: {
        readCount: { value: 0, max: 5, color: 'blue' },
        writeMutex: { value: 1, max: 1, color: 'red' },
        resourceMutex: { value: 1, max: 1, color: 'purple' }
      },
      characters: [
        { id: 'R1', name: 'Reader 1', type: 'reader', position: { x: 100, y: 150 }, state: 'idle', blocked: false },
        { id: 'R2', name: 'Reader 2', type: 'reader', position: { x: 150, y: 150 }, state: 'idle', blocked: false },
        { id: 'R3', name: 'Reader 3', type: 'reader', position: { x: 200, y: 150 }, state: 'idle', blocked: false },
        { id: 'W1', name: 'Writer 1', type: 'writer', position: { x: 450, y: 150 }, state: 'idle', blocked: false },
        { id: 'W2', name: 'Writer 2', type: 'writer', position: { x: 500, y: 150 }, state: 'idle', blocked: false }
      ],
      winCondition: () => operationCount >= 15 && !hasDeadlock
    },
    3: {
      name: 'Dining Philosophers (BOSS)',
      type: 'dining-philosophers',
      description: 'Prevent deadlock with 5 philosophers and chopsticks',
      semaphores: {
        fork0: { value: 1, max: 1, color: 'yellow' },
        fork1: { value: 1, max: 1, color: 'yellow' },
        fork2: { value: 1, max: 1, color: 'yellow' },
        fork3: { value: 1, max: 1, color: 'yellow' },
        fork4: { value: 1, max: 1, color: 'yellow' }
      },
      characters: [
        { id: 'Phil0', name: 'Philosopher 0', type: 'philosopher', position: { x: 300, y: 100 }, state: 'thinking', blocked: false, leftFork: 'fork0', rightFork: 'fork1' },
        { id: 'Phil1', name: 'Philosopher 1', type: 'philosopher', position: { x: 450, y: 200 }, state: 'thinking', blocked: false, leftFork: 'fork1', rightFork: 'fork2' },
        { id: 'Phil2', name: 'Philosopher 2', type: 'philosopher', position: { x: 400, y: 350 }, state: 'thinking', blocked: false, leftFork: 'fork2', rightFork: 'fork3' },
        { id: 'Phil3', name: 'Philosopher 3', type: 'philosopher', position: { x: 200, y: 350 }, state: 'thinking', blocked: false, leftFork: 'fork3', rightFork: 'fork4' },
        { id: 'Phil4', name: 'Philosopher 4', type: 'philosopher', position: { x: 150, y: 200 }, state: 'thinking', blocked: false, leftFork: 'fork4', rightFork: 'fork0' }
      ],
      winCondition: () => operationCount >= 20 && !hasDeadlock
    }
  };

  // Initialize floor
  useEffect(() => {
    const floor = FLOORS[currentFloor];
    if (floor) {
      setSemaphores(floor.semaphores);
      setCharacters(floor.characters);
      setOperationCount(0);
      setHasDeadlock(false);
    }
  }, [currentFloor]);

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 3000);
  }, []);

  // Semaphore wait operation (P/down)
  const waitSemaphore = useCallback((semName, charId) => {
    setSemaphores(prev => {
      const sem = prev[semName];
      if (sem.value > 0) {
        addAlert(`${characters.find(c => c.id === charId)?.name} acquired ${semName}`, 'success');
        setOperationCount(c => c + 1);
        setScore(s => s + 10);
        return {
          ...prev,
          [semName]: { ...sem, value: sem.value - 1 }
        };
      } else {
        // Block character
        setCharacters(chars => chars.map(c => 
          c.id === charId ? { ...c, blocked: true, state: 'blocked' } : c
        ));
        addAlert(`${characters.find(c => c.id === charId)?.name} blocked on ${semName}`, 'warning');
        return prev;
      }
    });
  }, [addAlert, characters]);

  // Semaphore signal operation (V/up)
  const signalSemaphore = useCallback((semName, charId) => {
    setSemaphores(prev => {
      const sem = prev[semName];
      if (sem.value < sem.max) {
        addAlert(`${characters.find(c => c.id === charId)?.name} released ${semName}`, 'info');
        setOperationCount(c => c + 1);
        setScore(s => s + 10);
        
        // Unblock one waiting character
        setCharacters(chars => {
          const blockedChar = chars.find(c => c.blocked);
          if (blockedChar) {
            addAlert(`${blockedChar.name} unblocked!`, 'success');
            return chars.map(c => 
              c.id === blockedChar.id ? { ...c, blocked: false, state: 'idle' } : c
            );
          }
          return chars;
        });

        return {
          ...prev,
          [semName]: { ...sem, value: sem.value + 1 }
        };
      }
      return prev;
    });
  }, [addAlert, characters]);

  // Detect deadlock
  const detectDeadlock = useCallback(() => {
    const allBlocked = characters.every(c => c.blocked);
    const allSemaphoresZero = Object.values(semaphores).every(s => s.value === 0);
    
    if (allBlocked && allSemaphoresZero && characters.length > 0) {
      setHasDeadlock(true);
      addAlert('💀 DEADLOCK DETECTED! All characters blocked!', 'danger');
      setScore(s => Math.max(0, s - 100));
      return true;
    }
    return false;
  }, [characters, semaphores, addAlert]);

  // Producer-Consumer operations
  const producerProduce = (charId) => {
    waitSemaphore('empty', charId);
    setTimeout(() => {
      waitSemaphore('mutex', charId);
      setTimeout(() => {
        // Produce item
        addAlert('🏭 Item produced!', 'success');
        signalSemaphore('mutex', charId);
        signalSemaphore('full', charId);
        setCharacters(chars => chars.map(c => 
          c.id === charId ? { ...c, state: 'produced' } : c
        ));
      }, 500);
    }, 500);
  };

  const consumerConsume = (charId) => {
    waitSemaphore('full', charId);
    setTimeout(() => {
      waitSemaphore('mutex', charId);
      setTimeout(() => {
        // Consume item
        addAlert('🍔 Item consumed!', 'success');
        signalSemaphore('mutex', charId);
        signalSemaphore('empty', charId);
        setCharacters(chars => chars.map(c => 
          c.id === charId ? { ...c, state: 'consumed' } : c
        ));
      }, 500);
    }, 500);
  };

  // Reader-Writer operations
  const readerRead = (charId) => {
    waitSemaphore('resourceMutex', charId);
    setTimeout(() => {
      const readCount = semaphores.readCount.value + 1;
      setSemaphores(prev => ({
        ...prev,
        readCount: { ...prev.readCount, value: readCount }
      }));
      if (readCount === 1) {
        waitSemaphore('writeMutex', charId);
      }
      signalSemaphore('resourceMutex', charId);
      
      // Read
      addAlert('📖 Reading...', 'info');
      setTimeout(() => {
        waitSemaphore('resourceMutex', charId);
        const newReadCount = semaphores.readCount.value - 1;
        setSemaphores(prev => ({
          ...prev,
          readCount: { ...prev.readCount, value: newReadCount }
        }));
        if (newReadCount === 0) {
          signalSemaphore('writeMutex', charId);
        }
        signalSemaphore('resourceMutex', charId);
      }, 1000);
    }, 500);
  };

  const writerWrite = (charId) => {
    waitSemaphore('writeMutex', charId);
    setTimeout(() => {
      addAlert('✍️ Writing...', 'info');
      setTimeout(() => {
        signalSemaphore('writeMutex', charId);
      }, 1500);
    }, 500);
  };

  // Dining Philosophers operations
  const philosopherEat = (charId) => {
    const phil = characters.find(c => c.id === charId);
    if (!phil) return;

    // Try to pick up left fork
    waitSemaphore(phil.leftFork, charId);
    setTimeout(() => {
      // Try to pick up right fork
      waitSemaphore(phil.rightFork, charId);
      setTimeout(() => {
        // Eat
        addAlert(`${phil.name} is eating 🍝`, 'success');
        setCharacters(chars => chars.map(c => 
          c.id === charId ? { ...c, state: 'eating' } : c
        ));
        setTimeout(() => {
          // Put down forks
          signalSemaphore(phil.rightFork, charId);
          signalSemaphore(phil.leftFork, charId);
          setCharacters(chars => chars.map(c => 
            c.id === charId ? { ...c, state: 'thinking' } : c
          ));
        }, 2000);
      }, 500);
    }, 500);
  };

  // Power-up: Unlock All
  const useUnlockAll = () => {
    if (powerUps.unlockAll.count <= 0 || powerUps.unlockAll.cooldown > 0) return;

    // Reset all semaphores to max
    setSemaphores(prev => {
      const reset = {};
      Object.keys(prev).forEach(key => {
        reset[key] = { ...prev[key], value: prev[key].max };
      });
      return reset;
    });

    // Unblock all characters
    setCharacters(chars => chars.map(c => ({ ...c, blocked: false, state: 'idle' })));
    setHasDeadlock(false);

    setPowerUps(prev => ({
      ...prev,
      unlockAll: { count: prev.unlockAll.count - 1, cooldown: 15 }
    }));

    addAlert('🔓 All semaphores reset!', 'success');
    setScore(s => s + 50);
  };

  // Power-up: Debug Vision
  const useDebugVision = () => {
    if (powerUps.debugVision.count <= 0 || powerUps.debugVision.cooldown > 0) return;

    setPowerUps(prev => ({
      ...prev,
      debugVision: { count: prev.debugVision.count - 1, active: true, cooldown: 30 }
    }));

    addAlert('👁️ Debug Vision activated!', 'success');

    // Deactivate after 10 seconds
    setTimeout(() => {
      setPowerUps(prev => ({
        ...prev,
        debugVision: { ...prev.debugVision, active: false }
      }));
    }, 10000);
  };

  // Check win condition
  useEffect(() => {
    const floor = FLOORS[currentFloor];
    if (floor && floor.winCondition()) {
      if (currentFloor < 3) {
        addAlert(`🎉 Floor ${currentFloor} cleared! Going up...`, 'success');
        setScore(s => s + 200);
        setTimeout(() => {
          setCurrentFloor(f => f + 1);
        }, 2000);
      } else {
        setGameState('won');
        addAlert('🏆 Tower Escaped! You WIN!', 'success');
        setScore(s => s + 500);
      }
    }
  }, [operationCount, hasDeadlock, currentFloor, addAlert]);

  // Game loop for cooldowns
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerUps(prev => ({
        unlockAll: {
          ...prev.unlockAll,
          cooldown: Math.max(0, prev.unlockAll.cooldown - 1)
        },
        debugVision: {
          ...prev.debugVision,
          cooldown: Math.max(0, prev.debugVision.cooldown - 1)
        }
      }));

      // Periodic deadlock check
      detectDeadlock();
    }, 1000);

    return () => clearInterval(interval);
  }, [detectDeadlock]);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">🗼 Semaphore Tower Escape</h1>
            <p className="text-2xl text-indigo-300">Synchronize to Survive!</p>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-indigo-500/30">
            <h2 className="text-3xl font-bold mb-4 text-indigo-300">🧠 OS Concepts Learned</h2>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="bg-indigo-500/20 p-4 rounded-lg">✓ Semaphores (P & V operations)</div>
              <div className="bg-indigo-500/20 p-4 rounded-lg">✓ Producer-Consumer Problem</div>
              <div className="bg-indigo-500/20 p-4 rounded-lg">✓ Reader-Writer Problem</div>
              <div className="bg-indigo-500/20 p-4 rounded-lg">✓ Dining Philosophers Problem</div>
              <div className="bg-indigo-500/20 p-4 rounded-lg">✓ Synchronization & Locks</div>
              <div className="bg-indigo-500/20 p-4 rounded-lg">✓ Deadlock Prevention</div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-indigo-500/30">
            <h2 className="text-3xl font-bold mb-4 text-green-300">🎮 How to Play</h2>
            <ul className="space-y-3 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🗼</span>
                <span>Escape a 3-floor tower by solving semaphore puzzles</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🚪</span>
                <span>Each door has semaphore rules - wrong operations block characters</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <span><strong>Floor 1:</strong> Producer-Consumer puzzle (balance production/consumption)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📚</span>
                <span><strong>Floor 2:</strong> Reader-Writer library (manage concurrent access)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🍝</span>
                <span><strong>Floor 3 (BOSS):</strong> Dining Philosophers (prevent deadlock with 5 philosophers)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎨</span>
                <span>Visual semaphores shown as colored counters</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-indigo-500/30">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">🏆 Scoring</h2>
            <ul className="space-y-2 text-lg">
              <li>✓ Each semaphore operation: +10 points</li>
              <li>✓ Complete floor: +200 points</li>
              <li>✓ Fewer operations → more bonus points</li>
              <li>✓ No deadlock → bonus multiplier</li>
              <li>✓ Escape tower (beat floor 3): +500 points</li>
              <li>✓ Deadlock penalty: -100 points</li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-indigo-500/30">
            <h2 className="text-3xl font-bold mb-4 text-blue-300">⚡ Power-ups</h2>
            <div className="space-y-4 text-lg">
              <div className="bg-blue-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">🔓 Unlock All (2 uses)</div>
                <div>Reset all semaphores to max value and unblock all characters. Cost: 50 points. Cooldown: 15 seconds</div>
              </div>
              <div className="bg-purple-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">👁️ Debug Vision (3 uses)</div>
                <div>Shows which process holds which semaphore with visual indicators. Duration: 10 seconds. Cooldown: 30 seconds</div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-indigo-500/30">
            <h2 className="text-3xl font-bold mb-4 text-red-300">⭐ Features</h2>
            <ul className="space-y-2 text-lg">
              <li>🎨 Visual semaphore counters with color coding</li>
              <li>🔴🟢🔵 Different puzzle types per floor</li>
              <li>🍝 Dining Philosophers as epic boss level</li>
              <li>⚠️ Real-time deadlock detection</li>
              <li>🎭 Character state animations (idle, blocked, working)</li>
            </ul>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-2xl hover:scale-105 transition-transform shadow-lg"
          >
            Enter Tower 🗼
          </button>
        </div>
      </div>
    );
  }

  const floor = FLOORS[currentFloor];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-black text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">🗼 Floor {currentFloor}: {floor.name}</h1>
          <p className="text-xl text-indigo-300">{floor.description}</p>
          <div className="flex gap-4 text-lg mt-2">
            <span className="bg-indigo-600 px-4 py-2 rounded-lg">Score: {score}</span>
            <span className="bg-purple-600 px-4 py-2 rounded-lg">Operations: {operationCount}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {hasDeadlock && (
            <div className="text-2xl font-bold px-6 py-3 rounded-lg bg-red-600 animate-pulse">
              💀 DEADLOCK!
            </div>
          )}
          {powerUps.debugVision.active && (
            <div className="bg-purple-600 px-4 py-2 rounded-lg animate-pulse">
              👁️ Debug Vision Active
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="fixed top-20 right-8 z-50 space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-fade-in ${
              alert.type === 'danger' ? 'bg-red-600/90' :
              alert.type === 'success' ? 'bg-green-600/90' :
              alert.type === 'warning' ? 'bg-yellow-600/90' :
              'bg-blue-600/90'
            }`}
          >
            {alert.message}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Tower Room */}
        <div className="col-span-2 bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/30">
          <h2 className="text-2xl font-bold mb-4">🏰 Tower Room</h2>
          <div className="relative w-full h-[500px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-indigo-500/50">
            {/* Characters */}
            {characters.map(char => (
              <div
                key={char.id}
                className={`absolute transition-all ${char.blocked ? 'opacity-50 animate-pulse' : ''}`}
                style={{
                  left: char.position.x,
                  top: char.position.y,
                  width: 80,
                  height: 80
                }}
              >
                <div className={`w-full h-full rounded-full flex items-center justify-center text-3xl border-4 shadow-lg ${
                  char.type === 'producer' ? 'bg-blue-600 border-blue-400' :
                  char.type === 'consumer' ? 'bg-green-600 border-green-400' :
                  char.type === 'reader' ? 'bg-cyan-600 border-cyan-400' :
                  char.type === 'writer' ? 'bg-purple-600 border-purple-400' :
                  'bg-yellow-600 border-yellow-400'
                }`}>
                  {char.type === 'producer' ? '🏭' :
                   char.type === 'consumer' ? '🍔' :
                   char.type === 'reader' ? '📖' :
                   char.type === 'writer' ? '✍️' :
                   '🧙'}
                </div>
                <div className="text-xs text-center mt-1 font-bold">{char.name}</div>
                <div className="text-xs text-center text-gray-400">{char.state}</div>
                {char.blocked && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-lg animate-pulse">
                    🚫
                  </div>
                )}
                {powerUps.debugVision.active && char.blocked && (
                  <div className="absolute -bottom-6 left-0 right-0 text-xs text-center bg-yellow-500 text-black rounded px-1 font-bold">
                    Waiting
                  </div>
                )}
              </div>
            ))}

            {/* Dining philosophers table visualization */}
            {floor.type === 'dining-philosophers' && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-40 h-40 rounded-full bg-yellow-900/50 border-4 border-yellow-600 flex items-center justify-center text-6xl">
                  🍽️
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="space-y-6">
          {/* Semaphores */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/30">
            <h3 className="text-xl font-bold mb-4">🚦 Semaphores</h3>
            <div className="space-y-3">
              {Object.entries(semaphores).map(([name, sem]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{name}</span>
                    <span className={`text-2xl font-bold ${sem.value === 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {sem.value} / {sem.max}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-full rounded-full transition-all bg-${sem.color}-600`}
                      style={{ width: `${(sem.value / sem.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Character Actions */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ Actions</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {characters.map(char => (
                <div key={char.id} className="space-y-1">
                  <div className="font-bold text-sm">{char.name}</div>
                  {floor.type === 'producer-consumer' && (
                    <>
                      {char.type === 'producer' && (
                        <button
                          onClick={() => producerProduce(char.id)}
                          disabled={char.blocked}
                          className="w-full px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          🏭 Produce
                        </button>
                      )}
                      {char.type === 'consumer' && (
                        <button
                          onClick={() => consumerConsume(char.id)}
                          disabled={char.blocked}
                          className="w-full px-3 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          🍔 Consume
                        </button>
                      )}
                    </>
                  )}
                  {floor.type === 'reader-writer' && (
                    <>
                      {char.type === 'reader' && (
                        <button
                          onClick={() => readerRead(char.id)}
                          disabled={char.blocked}
                          className="w-full px-3 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          📖 Read
                        </button>
                      )}
                      {char.type === 'writer' && (
                        <button
                          onClick={() => writerWrite(char.id)}
                          disabled={char.blocked}
                          className="w-full px-3 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          ✍️ Write
                        </button>
                      )}
                    </>
                  )}
                  {floor.type === 'dining-philosophers' && (
                    <button
                      onClick={() => philosopherEat(char.id)}
                      disabled={char.blocked}
                      className="w-full px-3 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      🍝 Eat
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Power-ups */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ Power-ups</h3>
            <div className="space-y-3">
              <button
                onClick={useUnlockAll}
                disabled={powerUps.unlockAll.count <= 0 || powerUps.unlockAll.cooldown > 0}
                className="w-full px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                🔓 Unlock All
                <div className="text-xs mt-1">
                  {powerUps.unlockAll.count} uses
                  {powerUps.unlockAll.cooldown > 0 && ` (${powerUps.unlockAll.cooldown}s)`}
                </div>
              </button>
              <button
                onClick={useDebugVision}
                disabled={powerUps.debugVision.count <= 0 || powerUps.debugVision.cooldown > 0}
                className="w-full px-4 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                👁️ Debug Vision
                <div className="text-xs mt-1">
                  {powerUps.debugVision.count} uses
                  {powerUps.debugVision.cooldown > 0 && ` (${powerUps.debugVision.cooldown}s)`}
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowInstructions(true)}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            📖 Instructions
          </button>
        </div>
      </div>

      {/* Win Modal */}
      {gameState === 'won' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-12 rounded-3xl text-center max-w-2xl mx-4 shadow-2xl">
            <div className="text-8xl mb-6">🏆</div>
            <h2 className="text-5xl font-bold mb-4">Tower Escaped!</h2>
            <p className="text-3xl mb-6">Final Score: {score}</p>
            <p className="text-xl mb-8">You mastered all semaphore puzzles!</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-xl hover:scale-105 transition-transform"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
