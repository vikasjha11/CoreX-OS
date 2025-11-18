import { useState, useEffect, useCallback } from 'react';

export default function ProducerConsumerFactory() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, paused
  const [score, setScore] = useState(0);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);

  // Buffer system
  const [bufferSize, setBufferSize] = useState(5);
  const [buffer, setBuffer] = useState([]); // Array of items in buffer
  const [nextItemId, setNextItemId] = useState(1);

  // Semaphores
  const [semaphores, setSemaphores] = useState({
    empty: 5, // Available slots
    full: 0,  // Filled slots
    mutex: 1  // Mutual exclusion
  });

  // Producers and Consumers
  const [producers, setProducers] = useState([
    { id: 'P1', name: 'Producer 1', state: 'idle', speed: 3, blockedOn: null },
    { id: 'P2', name: 'Producer 2', state: 'idle', speed: 2, blockedOn: null }
  ]);

  const [consumers, setConsumers] = useState([
    { id: 'C1', name: 'Consumer 1', state: 'idle', speed: 3, blockedOn: null },
    { id: 'C2', name: 'Consumer 2', state: 'idle', speed: 2, blockedOn: null }
  ]);

  const [stats, setStats] = useState({
    produced: 0,
    consumed: 0,
    producerBlocks: 0,
    consumerBlocks: 0,
    averageBufferLevel: 0
  });

  const [alerts, setAlerts] = useState([]);
  const [bufferHistory, setBufferHistory] = useState(Array(30).fill(0));

  // Power-ups
  const [powerUps, setPowerUps] = useState({
    bufferExpand: { count: 2, cooldown: 0 },
    speedSync: { count: 2, cooldown: 0, active: false, timeLeft: 0 }
  });

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 2500);
  }, []);

  // Semaphore wait (P operation)
  const waitSemaphore = useCallback((semName, actorId) => {
    setSemaphores(prev => {
      if (prev[semName] > 0) {
        return { ...prev, [semName]: prev[semName] - 1 };
      } else {
        // Block the actor
        const isProducer = actorId.startsWith('P');
        if (isProducer) {
          setProducers(p => p.map(prod => 
            prod.id === actorId ? { ...prod, state: 'blocked', blockedOn: semName } : prod
          ));
          setStats(s => ({ ...s, producerBlocks: s.producerBlocks + 1 }));
          addAlert(`${actorId} blocked - Buffer full!`, 'warning');
        } else {
          setConsumers(c => c.map(cons => 
            cons.id === actorId ? { ...cons, state: 'blocked', blockedOn: semName } : cons
          ));
          setStats(s => ({ ...s, consumerBlocks: s.consumerBlocks + 1 }));
          addAlert(`${actorId} blocked - Buffer empty!`, 'warning');
        }
        return prev;
      }
    });
  }, [addAlert]);

  // Semaphore signal (V operation)
  const signalSemaphore = useCallback((semName) => {
    setSemaphores(prev => {
      const newValue = Math.min(prev[semName] + 1, bufferSize);
      
      // Unblock waiting actors
      if (semName === 'empty') {
        // Unblock a producer
        setProducers(p => {
          const blockedProducer = p.find(prod => prod.state === 'blocked' && prod.blockedOn === 'empty');
          if (blockedProducer) {
            addAlert(`${blockedProducer.id} unblocked!`, 'success');
            return p.map(prod => 
              prod.id === blockedProducer.id ? { ...prod, state: 'idle', blockedOn: null } : prod
            );
          }
          return p;
        });
      } else if (semName === 'full') {
        // Unblock a consumer
        setConsumers(c => {
          const blockedConsumer = c.find(cons => cons.state === 'blocked' && cons.blockedOn === 'full');
          if (blockedConsumer) {
            addAlert(`${blockedConsumer.id} unblocked!`, 'success');
            return c.map(cons => 
              cons.id === blockedConsumer.id ? { ...cons, state: 'idle', blockedOn: null } : cons
            );
          }
          return c;
        });
      }
      
      return { ...prev, [semName]: newValue };
    });
  }, [bufferSize, addAlert]);

  // Produce item
  const produce = useCallback((producerId) => {
    const producer = producers.find(p => p.id === producerId);
    if (!producer || producer.state === 'blocked') return;

    // Wait on empty
    if (semaphores.empty <= 0) {
      waitSemaphore('empty', producerId);
      return;
    }

    // Wait on mutex
    if (semaphores.mutex <= 0) return;

    // Produce
    setProducers(p => p.map(prod => 
      prod.id === producerId ? { ...prod, state: 'producing' } : prod
    ));

    setTimeout(() => {
      waitSemaphore('empty', producerId);
      waitSemaphore('mutex', producerId);

      const newItem = {
        id: nextItemId,
        producedBy: producerId,
        color: producerId === 'P1' ? 'blue' : 'green'
      };

      setBuffer(prev => [...prev, newItem]);
      setNextItemId(id => id + 1);
      setStats(s => ({ ...s, produced: s.produced + 1 }));
      setScore(sc => sc + 10);
      setXP(x => x + 5);

      signalSemaphore('mutex');
      signalSemaphore('full');

      setProducers(p => p.map(prod => 
        prod.id === producerId ? { ...prod, state: 'idle' } : prod
      ));

      addAlert(`${producerId} produced item #${nextItemId}`, 'success');
    }, 1000 / producer.speed);
  }, [producers, semaphores, nextItemId, waitSemaphore, signalSemaphore, addAlert]);

  // Consume item
  const consume = useCallback((consumerId) => {
    const consumer = consumers.find(c => c.id === consumerId);
    if (!consumer || consumer.state === 'blocked') return;

    // Wait on full
    if (semaphores.full <= 0) {
      waitSemaphore('full', consumerId);
      return;
    }

    // Wait on mutex
    if (semaphores.mutex <= 0) return;

    // Consume
    setConsumers(c => c.map(cons => 
      cons.id === consumerId ? { ...cons, state: 'consuming' } : cons
    ));

    setTimeout(() => {
      waitSemaphore('full', consumerId);
      waitSemaphore('mutex', consumerId);

      setBuffer(prev => {
        if (prev.length === 0) return prev;
        const [removed, ...remaining] = prev;
        
        setStats(s => ({ ...s, consumed: s.consumed + 1 }));
        setScore(sc => sc + 15);
        setXP(x => x + 5);

        addAlert(`${consumerId} consumed item #${removed.id}`, 'info');
        
        return remaining;
      });

      signalSemaphore('mutex');
      signalSemaphore('empty');

      setConsumers(c => c.map(cons => 
        cons.id === consumerId ? { ...cons, state: 'idle' } : cons
      ));
    }, 1000 / consumer.speed);
  }, [consumers, semaphores, waitSemaphore, signalSemaphore, addAlert]);

  // Power-up: Buffer Expand
  const useBufferExpand = () => {
    if (powerUps.bufferExpand.count <= 0 || powerUps.bufferExpand.cooldown > 0) return;

    setBufferSize(s => s + 5);
    setSemaphores(prev => ({ ...prev, empty: prev.empty + 5 }));

    setPowerUps(prev => ({
      ...prev,
      bufferExpand: { count: prev.bufferExpand.count - 1, cooldown: 30 }
    }));

    addAlert('📦 Buffer expanded by 5 slots!', 'success');
    setScore(s => s + 100);
  };

  // Power-up: Speed Sync
  const useSpeedSync = () => {
    if (powerUps.speedSync.count <= 0 || powerUps.speedSync.cooldown > 0) return;

    // Set all speeds to 3
    setProducers(p => p.map(prod => ({ ...prod, speed: 3 })));
    setConsumers(c => c.map(cons => ({ ...cons, speed: 3 })));

    setPowerUps(prev => ({
      ...prev,
      speedSync: { count: prev.speedSync.count - 1, cooldown: 40, active: true, timeLeft: 20 }
    }));

    addAlert('⚡ Speed synchronized!', 'success');
    setScore(s => s + 50);

    setTimeout(() => {
      // Reset speeds
      setProducers(p => p.map((prod, idx) => ({ ...prod, speed: idx === 0 ? 3 : 2 })));
      setConsumers(c => c.map((cons, idx) => ({ ...cons, speed: idx === 0 ? 3 : 2 })));
      
      setPowerUps(prev => ({
        ...prev,
        speedSync: { ...prev.speedSync, active: false, timeLeft: 0 }
      }));
      
      addAlert('Speed sync ended', 'info');
    }, 20000);
  };

  // Auto-production logic
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      // Auto-produce from random producer
      if (Math.random() < 0.6) {
        const availableProducers = producers.filter(p => p.state === 'idle');
        if (availableProducers.length > 0) {
          const randomProducer = availableProducers[Math.floor(Math.random() * availableProducers.length)];
          produce(randomProducer.id);
        }
      }

      // Auto-consume from random consumer
      if (Math.random() < 0.6) {
        const availableConsumers = consumers.filter(c => c.state === 'idle');
        if (availableConsumers.length > 0) {
          const randomConsumer = availableConsumers[Math.floor(Math.random() * availableConsumers.length)];
          consume(randomConsumer.id);
        }
      }

      // Update buffer history
      setBufferHistory(prev => [...prev.slice(1), buffer.length]);

      // Calculate average buffer level
      const avgBuffer = bufferHistory.reduce((sum, val) => sum + val, 0) / bufferHistory.length;
      setStats(s => ({ ...s, averageBufferLevel: avgBuffer }));

      // Bonus for maintaining steady buffer (40-60% full)
      const bufferPercentage = (buffer.length / bufferSize) * 100;
      if (bufferPercentage >= 40 && bufferPercentage <= 60) {
        setScore(sc => sc + 3);
        setXP(x => x + 2);
      }

      // Bonus for avoiding blocking
      if (producers.every(p => p.state !== 'blocked') && consumers.every(c => c.state !== 'blocked')) {
        setScore(sc => sc + 2);
      }

      // Update cooldowns
      setPowerUps(prev => ({
        bufferExpand: {
          ...prev.bufferExpand,
          cooldown: Math.max(0, prev.bufferExpand.cooldown - 1)
        },
        speedSync: {
          ...prev.speedSync,
          cooldown: Math.max(0, prev.speedSync.cooldown - 1),
          timeLeft: Math.max(0, prev.speedSync.timeLeft - 1)
        }
      }));

      // Level up
      if (xp >= level * 100) {
        setLevel(l => l + 1);
        addAlert(`🎊 Level ${level + 1}!`, 'success');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, producers, consumers, buffer, bufferSize, bufferHistory, produce, consume, xp, level, addAlert]);

  // Check for buffer full/empty alerts
  useEffect(() => {
    if (buffer.length === bufferSize && semaphores.empty === 0) {
      addAlert('⚠️ BUFFER FULL!', 'warning');
    }
    if (buffer.length === 0 && semaphores.full === 0) {
      addAlert('⚠️ BUFFER EMPTY!', 'warning');
    }
  }, [buffer.length, bufferSize, semaphores, addAlert]);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">🏭 Producer-Consumer Factory</h1>
            <p className="text-2xl text-orange-300">Master Synchronization!</p>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-orange-500/30">
            <h2 className="text-3xl font-bold mb-4 text-orange-300">🧠 OS Concepts Learned</h2>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="bg-orange-500/20 p-4 rounded-lg">✓ Buffers & Bounded Storage</div>
              <div className="bg-orange-500/20 p-4 rounded-lg">✓ Semaphores (P & V)</div>
              <div className="bg-orange-500/20 p-4 rounded-lg">✓ Synchronization</div>
              <div className="bg-orange-500/20 p-4 rounded-lg">✓ Race Conditions</div>
              <div className="bg-orange-500/20 p-4 rounded-lg">✓ Mutual Exclusion</div>
              <div className="bg-orange-500/20 p-4 rounded-lg">✓ Producer-Consumer Problem</div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-orange-500/30">
            <h2 className="text-3xl font-bold mb-4 text-green-300">🎮 How to Play</h2>
            <ul className="space-y-3 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🏭</span>
                <span>Producers make boxes, consumers pick them from the buffer</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📦</span>
                <span>Buffer has limited slots (starts at 5)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🚫</span>
                <span>If buffer is full → producer blocks (cannot produce)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🈳</span>
                <span>If buffer is empty → consumer blocks (cannot consume)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎮</span>
                <span>Control semaphore logic by clicking Produce/Consume buttons</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <span>Watch animated conveyor belt and real-time semaphore counters</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">⚖️</span>
                <span>Keep buffer 40-60% full for optimal performance</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-orange-500/30">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">🏆 Scoring</h2>
            <ul className="space-y-2 text-lg">
              <li>✓ Produce item: +10 points, +5 XP</li>
              <li>✓ Consume item: +15 points, +5 XP</li>
              <li>✓ Maintain steady buffer (40-60% full): +3 points/sec, +2 XP/sec</li>
              <li>✓ Avoid blocking: +2 points/sec bonus</li>
              <li>✓ Use Buffer Expand: +100 points</li>
              <li>✓ Use Speed Sync: +50 points</li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-orange-500/30">
            <h2 className="text-3xl font-bold mb-4 text-blue-300">⚡ Power-ups</h2>
            <div className="space-y-4 text-lg">
              <div className="bg-blue-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">📦 Buffer Expand (2 uses)</div>
                <div>Adds +5 buffer slots permanently. Cooldown: 30 seconds</div>
              </div>
              <div className="bg-purple-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">⚡ Speed Sync (2 uses)</div>
                <div>Aligns producer/consumer speeds for 20 seconds. Cooldown: 40 seconds</div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-orange-500/30">
            <h2 className="text-3xl font-bold mb-4 text-cyan-300">💡 Semaphore Logic</h2>
            <ul className="space-y-2 text-lg">
              <li>🔹 <strong>Empty:</strong> Counts available buffer slots</li>
              <li>🔹 <strong>Full:</strong> Counts items in buffer</li>
              <li>🔹 <strong>Mutex:</strong> Ensures mutual exclusion (only 1 at a time)</li>
              <li>🔹 Producers: wait(empty) → produce → signal(full)</li>
              <li>🔹 Consumers: wait(full) → consume → signal(empty)</li>
            </ul>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-bold text-2xl hover:scale-105 transition-transform shadow-lg"
          >
            Start Factory 🏭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-black text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">🏭 Producer-Consumer Factory</h1>
          <div className="flex gap-4 text-lg">
            <span className="bg-orange-600 px-4 py-2 rounded-lg">Score: {score}</span>
            <span className="bg-purple-600 px-4 py-2 rounded-lg">Level: {level}</span>
            <span className="bg-green-600 px-4 py-2 rounded-lg">XP: {xp}/{level * 100}</span>
            <span className={`px-4 py-2 rounded-lg ${buffer.length === bufferSize ? 'bg-red-600 animate-pulse' : buffer.length === 0 ? 'bg-yellow-600' : 'bg-blue-600'}`}>
              Buffer: {buffer.length}/{bufferSize}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {powerUps.speedSync.active && (
            <div className="bg-purple-600 px-4 py-2 rounded-lg animate-pulse">
              ⚡ Speed Sync: {powerUps.speedSync.timeLeft}s
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

      <div className="grid grid-cols-4 gap-6">
        {/* Left: Factory View */}
        <div className="col-span-3 space-y-6">
          {/* Producers */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
            <h2 className="text-2xl font-bold mb-4">🏭 Producers</h2>
            <div className="grid grid-cols-2 gap-4">
              {producers.map(prod => (
                <div key={prod.id} className={`p-4 rounded-lg ${prod.state === 'blocked' ? 'bg-red-600/30' : prod.state === 'producing' ? 'bg-green-600/30 animate-pulse' : 'bg-gray-700'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">{prod.name}</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      prod.state === 'blocked' ? 'bg-red-600' :
                      prod.state === 'producing' ? 'bg-green-600' :
                      'bg-blue-600'
                    }`}>
                      {prod.state}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-3">Speed: {prod.speed}x</div>
                  {prod.state === 'blocked' && (
                    <div className="text-sm text-red-400 mb-2">Blocked on: {prod.blockedOn}</div>
                  )}
                  <button
                    onClick={() => produce(prod.id)}
                    disabled={prod.state !== 'idle'}
                    className="w-full px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  >
                    Produce 📦
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Conveyor Belt Buffer */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
            <h2 className="text-2xl font-bold mb-4">📦 Buffer Conveyor ({buffer.length}/{bufferSize})</h2>
            <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-xl p-6 border-2 border-orange-500/50">
              <div className="flex gap-2 h-24 items-center overflow-x-auto">
                {buffer.map(item => (
                  <div
                    key={item.id}
                    className={`min-w-20 h-20 rounded-lg bg-${item.color}-600 flex items-center justify-center font-bold text-2xl animate-slide-in shadow-lg`}
                  >
                    📦
                  </div>
                ))}
                {Array.from({ length: bufferSize - buffer.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="min-w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-4xl text-gray-600"
                  >
                    ⬜
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span className={buffer.length === bufferSize ? 'text-red-400 font-bold animate-pulse' : ''}>
                {buffer.length === bufferSize ? '⚠️ BUFFER FULL' : ''}
              </span>
              <span className={buffer.length === 0 ? 'text-yellow-400 font-bold animate-pulse' : ''}>
                {buffer.length === 0 ? '⚠️ BUFFER EMPTY' : ''}
              </span>
            </div>
          </div>

          {/* Consumers */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
            <h2 className="text-2xl font-bold mb-4">🍔 Consumers</h2>
            <div className="grid grid-cols-2 gap-4">
              {consumers.map(cons => (
                <div key={cons.id} className={`p-4 rounded-lg ${cons.state === 'blocked' ? 'bg-red-600/30' : cons.state === 'consuming' ? 'bg-green-600/30 animate-pulse' : 'bg-gray-700'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">{cons.name}</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      cons.state === 'blocked' ? 'bg-red-600' :
                      cons.state === 'consuming' ? 'bg-green-600' :
                      'bg-blue-600'
                    }`}>
                      {cons.state}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-3">Speed: {cons.speed}x</div>
                  {cons.state === 'blocked' && (
                    <div className="text-sm text-red-400 mb-2">Blocked on: {cons.blockedOn}</div>
                  )}
                  <button
                    onClick={() => consume(cons.id)}
                    disabled={cons.state !== 'idle'}
                    className="w-full px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  >
                    Consume 🍔
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Buffer History Graph */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
            <h2 className="text-2xl font-bold mb-4">📊 Buffer Level History</h2>
            <div className="h-32 flex items-end gap-1">
              {bufferHistory.map((value, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-orange-500 rounded-t transition-all"
                  style={{ height: `${(value / bufferSize) * 100}%` }}
                  title={`${value}/${bufferSize}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>30s ago</span>
              <span>Avg: {stats.averageBufferLevel.toFixed(1)}</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Stats */}
        <div className="space-y-6">
          {/* Semaphore Counters */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
            <h3 className="text-xl font-bold mb-4">🚦 Semaphores</h3>
            <div className="space-y-4">
              <div className="bg-blue-600/30 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Empty</span>
                  <span className="text-3xl font-bold">{semaphores.empty}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(semaphores.empty / bufferSize) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">Available slots</div>
              </div>

              <div className="bg-green-600/30 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Full</span>
                  <span className="text-3xl font-bold">{semaphores.full}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(semaphores.full / bufferSize) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">Items in buffer</div>
              </div>

              <div className="bg-red-600/30 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Mutex</span>
                  <span className="text-3xl font-bold">{semaphores.mutex}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${semaphores.mutex * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">Mutual exclusion</div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
            <h3 className="text-xl font-bold mb-4">📈 Statistics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Produced:</span>
                <span className="font-bold text-blue-400">{stats.produced}</span>
              </div>
              <div className="flex justify-between">
                <span>Consumed:</span>
                <span className="font-bold text-green-400">{stats.consumed}</span>
              </div>
              <div className="flex justify-between">
                <span>Producer Blocks:</span>
                <span className="font-bold text-red-400">{stats.producerBlocks}</span>
              </div>
              <div className="flex justify-between">
                <span>Consumer Blocks:</span>
                <span className="font-bold text-yellow-400">{stats.consumerBlocks}</span>
              </div>
              <div className="flex justify-between">
                <span>Buffer Avg:</span>
                <span className="font-bold">{stats.averageBufferLevel.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Power-ups */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ Power-ups</h3>
            <div className="space-y-3">
              <button
                onClick={useBufferExpand}
                disabled={powerUps.bufferExpand.count <= 0 || powerUps.bufferExpand.cooldown > 0}
                className="w-full px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                📦 Buffer Expand
                <div className="text-xs mt-1">
                  {powerUps.bufferExpand.count} uses (+5 slots)
                  {powerUps.bufferExpand.cooldown > 0 && ` (${powerUps.bufferExpand.cooldown}s)`}
                </div>
              </button>
              <button
                onClick={useSpeedSync}
                disabled={powerUps.speedSync.count <= 0 || powerUps.speedSync.cooldown > 0}
                className="w-full px-4 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                ⚡ Speed Sync
                <div className="text-xs mt-1">
                  {powerUps.speedSync.count} uses (20s)
                  {powerUps.speedSync.cooldown > 0 && ` (${powerUps.speedSync.cooldown}s)`}
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
    </div>
  );
}
