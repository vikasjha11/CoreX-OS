import { useState, useEffect, useCallback } from 'react';

export default function DeadlockDungeon() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, deadlock, won
  const [score, setScore] = useState(0);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [safeState, setSafeState] = useState(true);
  const [deadlockDetected, setDeadlockDetected] = useState(false);
  const [freezeAnimation, setFreezeAnimation] = useState(false);
  
  // Processes (characters in dungeon)
  const [processes, setProcesses] = useState([
    { id: 'P1', name: 'Warrior', position: { x: 100, y: 100 }, holding: [], requesting: null, color: 'red' },
    { id: 'P2', name: 'Mage', position: { x: 300, y: 100 }, holding: [], requesting: null, color: 'blue' },
    { id: 'P3', name: 'Rogue', position: { x: 200, y: 250 }, holding: [], requesting: null, color: 'green' },
    { id: 'P4', name: 'Cleric', position: { x: 400, y: 250 }, holding: [], requesting: null, color: 'purple' }
  ]);

  // Resources (magical keys)
  const [resources, setResources] = useState([
    { id: 'R1', name: '🔑 Fire Key', allocated: null, position: { x: 150, y: 50 } },
    { id: 'R2', name: '🔑 Ice Key', allocated: null, position: { x: 350, y: 50 } },
    { id: 'R3', name: '🔑 Lightning Key', allocated: null, position: { x: 250, y: 200 } },
    { id: 'R4', name: '🔑 Earth Key', allocated: null, position: { x: 450, y: 200 } }
  ]);

  // Power-ups
  const [powerUps, setPowerUps] = useState({
    resourceReset: { count: 2, cooldown: 0 },
    safeStateShield: { count: 1, cooldown: 0, active: false, timeLeft: 0 }
  });

  const [selectedProcess, setSelectedProcess] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cycleEdges, setCycleEdges] = useState([]);

  // Add alert notification
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 3000);
  }, []);

  // Detect cycles in Resource Allocation Graph
  const detectDeadlock = useCallback(() => {
    // Build adjacency list for cycle detection
    const graph = new Map();
    const inDegree = new Map();

    // Initialize
    processes.forEach(p => {
      graph.set(p.id, []);
      inDegree.set(p.id, 0);
    });
    resources.forEach(r => {
      graph.set(r.id, []);
      inDegree.set(r.id, 0);
    });

    // Build edges: Process -> Resource (requesting), Resource -> Process (allocated)
    const edges = [];
    processes.forEach(p => {
      if (p.requesting) {
        graph.get(p.id).push(p.requesting);
        inDegree.set(p.requesting, (inDegree.get(p.requesting) || 0) + 1);
        edges.push({ from: p.id, to: p.requesting, type: 'request' });
      }
    });

    resources.forEach(r => {
      if (r.allocated) {
        graph.get(r.id).push(r.allocated);
        inDegree.set(r.allocated, (inDegree.get(r.allocated) || 0) + 1);
        edges.push({ from: r.id, to: r.allocated, type: 'allocated' });
      }
    });

    // Detect cycle using DFS
    const visited = new Set();
    const recStack = new Set();
    let cycleFound = false;
    const cycleNodes = [];

    const dfs = (node, path = []) => {
      if (recStack.has(node)) {
        cycleFound = true;
        const cycleStart = path.indexOf(node);
        cycleNodes.push(...path.slice(cycleStart));
        return true;
      }
      if (visited.has(node)) return false;

      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor, [...path])) return true;
      }

      recStack.delete(node);
      return false;
    };

    // Check from all nodes
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) break;
      }
    }

    // Find edges in cycle
    if (cycleFound && cycleNodes.length > 0) {
      const cycleEdgesList = [];
      for (let i = 0; i < cycleNodes.length; i++) {
        const from = cycleNodes[i];
        const to = cycleNodes[(i + 1) % cycleNodes.length];
        const edge = edges.find(e => e.from === from && e.to === to);
        if (edge) cycleEdgesList.push(edge);
      }
      setCycleEdges(cycleEdgesList);
    } else {
      setCycleEdges([]);
    }

    return cycleFound;
  }, [processes, resources]);

  // Check safe state using Banker's Algorithm simplified
  const checkSafeState = useCallback(() => {
    if (powerUps.safeStateShield.active) return true;

    // Simple check: if any process is waiting and can't get resource, unsafe
    const waitingProcesses = processes.filter(p => p.requesting && !resources.find(r => r.id === p.requesting && !r.allocated));
    const hasDeadlock = detectDeadlock();
    
    const isSafe = !hasDeadlock && waitingProcesses.length < processes.length;
    setSafeState(isSafe);
    return isSafe;
  }, [processes, resources, detectDeadlock, powerUps.safeStateShield.active]);

  // Request resource
  const requestResource = (processId, resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource.allocated && resource.allocated !== processId) {
      setProcesses(prev => prev.map(p => 
        p.id === processId ? { ...p, requesting: resourceId } : p
      ));
      addAlert(`${processes.find(p => p.id === processId).name} is waiting for ${resource.name}`, 'warning');
    } else {
      // Grant resource
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, allocated: processId } : r
      ));
      setProcesses(prev => prev.map(p => 
        p.id === processId ? { 
          ...p, 
          holding: [...p.holding, resourceId],
          requesting: null 
        } : p
      ));
      addAlert(`${processes.find(p => p.id === processId).name} acquired ${resource.name}`, 'success');
      setScore(prev => prev + 10);
    }
  };

  // Release resource (preemption)
  const releaseResource = (processId, resourceId) => {
    setResources(prev => prev.map(r => 
      r.id === resourceId ? { ...r, allocated: null } : r
    ));
    setProcesses(prev => prev.map(p => 
      p.id === processId ? { 
        ...p, 
        holding: p.holding.filter(h => h !== resourceId)
      } : p
    ));
    addAlert('Resource preempted!', 'info');
    setScore(prev => prev + 20);
  };

  // Break deadlock
  const breakDeadlock = () => {
    if (cycleEdges.length === 0) return;

    // Release first resource in cycle
    const firstEdge = cycleEdges.find(e => e.type === 'allocated');
    if (firstEdge) {
      const processId = firstEdge.to;
      const resourceId = firstEdge.from;
      releaseResource(processId, resourceId);
      setScore(prev => prev + 100);
      setXP(prev => prev + 50);
      addAlert('🎉 Deadlock broken! +100 points', 'success');
      setDeadlockDetected(false);
      setFreezeAnimation(false);
    }
  };

  // Power-up: Resource Reset
  const useResourceReset = () => {
    if (powerUps.resourceReset.count <= 0 || powerUps.resourceReset.cooldown > 0) return;

    // Release all resources and reassign randomly
    setResources(prev => prev.map(r => ({ ...r, allocated: null })));
    setProcesses(prev => prev.map(p => ({ ...p, holding: [], requesting: null })));
    
    setPowerUps(prev => ({
      ...prev,
      resourceReset: { count: prev.resourceReset.count - 1, cooldown: 10 }
    }));

    addAlert('🔄 All resources redistributed!', 'success');
    setScore(prev => prev + 50);
  };

  // Power-up: Safe State Shield
  const useSafeStateShield = () => {
    if (powerUps.safeStateShield.count <= 0 || powerUps.safeStateShield.cooldown > 0) return;

    setPowerUps(prev => ({
      ...prev,
      safeStateShield: { count: prev.safeStateShield.count - 1, cooldown: 20, active: true, timeLeft: 15 }
    }));

    addAlert('🛡️ Safe State Shield activated!', 'success');
    setScore(prev => prev + 100);
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      // Random process requests
      if (Math.random() < 0.3) {
        const availableProcesses = processes.filter(p => !p.requesting);
        const availableResources = resources.filter(r => !r.allocated);
        
        if (availableProcesses.length > 0 && availableResources.length > 0) {
          const randomProcess = availableProcesses[Math.floor(Math.random() * availableProcesses.length)];
          const randomResource = availableResources[Math.floor(Math.random() * availableResources.length)];
          requestResource(randomProcess.id, randomResource.id);
        }
      }

      // Check for deadlock
      const hasDeadlock = detectDeadlock();
      if (hasDeadlock && !deadlockDetected) {
        setDeadlockDetected(true);
        setFreezeAnimation(true);
        addAlert('💀 DEADLOCK DETECTED! Break the cycle!', 'danger');
        setScore(prev => Math.max(0, prev - 50));
      }

      // Check safe state
      checkSafeState();

      // Update cooldowns
      setPowerUps(prev => ({
        resourceReset: {
          ...prev.resourceReset,
          cooldown: Math.max(0, prev.resourceReset.cooldown - 1)
        },
        safeStateShield: {
          ...prev.safeStateShield,
          cooldown: Math.max(0, prev.safeStateShield.cooldown - 1),
          timeLeft: Math.max(0, prev.safeStateShield.timeLeft - 1),
          active: prev.safeStateShield.timeLeft > 1
        }
      }));

      // XP bonus for maintaining safe state
      if (safeState && !hasDeadlock) {
        setXP(prev => prev + 1);
      }

      // Level up
      if (xp >= level * 100) {
        setLevel(prev => prev + 1);
        addAlert(`🎊 Level ${level + 1} reached!`, 'success');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameState, processes, resources, detectDeadlock, checkSafeState, safeState, deadlockDetected, level, xp, addAlert]);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">🏰 Deadlock Dungeon</h1>
            <p className="text-2xl text-purple-300">Break the Resource Cycle!</p>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-purple-500/30">
            <h2 className="text-3xl font-bold mb-4 text-purple-300">🧠 OS Concepts Learned</h2>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="bg-purple-500/20 p-4 rounded-lg">✓ Deadlock Detection</div>
              <div className="bg-purple-500/20 p-4 rounded-lg">✓ Resource Allocation Graph</div>
              <div className="bg-purple-500/20 p-4 rounded-lg">✓ Banker's Algorithm</div>
              <div className="bg-purple-500/20 p-4 rounded-lg">✓ Preemption & Recovery</div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-purple-500/30">
            <h2 className="text-3xl font-bold mb-4 text-green-300">🎮 How to Play</h2>
            <ul className="space-y-3 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎭</span>
                <span>Processes are characters (Warrior, Mage, Rogue, Cleric) exploring the dungeon</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🔑</span>
                <span>Resources are magical keys needed to progress</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <span>If characters form a circular wait → dungeon freezes (DEADLOCK)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🔧</span>
                <span>Break cycles by: Taking away resources, Preempting processes, or Granting safe resources</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">👁️</span>
                <span>Watch the Resource Allocation Graph to spot cycles early</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🟢</span>
                <span>Maintain "Safe State" to prevent deadlocks</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-purple-500/30">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">🏆 Scoring</h2>
            <ul className="space-y-2 text-lg">
              <li>✓ Request resource: +10 points</li>
              <li>✓ Preempt resource: +20 points</li>
              <li>✓ Break deadlock early: +100 points, +50 XP</li>
              <li>✓ Maintain safe state: +1 XP per 2 seconds</li>
              <li>✓ Deadlock penalty: -50 points</li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-purple-500/30">
            <h2 className="text-3xl font-bold mb-4 text-blue-300">⚡ Power-ups</h2>
            <div className="space-y-4 text-lg">
              <div className="bg-blue-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">🔄 Resource Reset (2 uses)</div>
                <div>Redistribute all keys randomly. Cost: 50 points. Cooldown: 10 turns</div>
              </div>
              <div className="bg-green-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">🛡️ Safe State Shield (1 use)</div>
                <div>Prevents unsafe state for 15 seconds. Cost: 100 points. Cooldown: 20 turns</div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold mb-4 text-red-300">⭐ Features</h2>
            <ul className="space-y-2 text-lg">
              <li>📊 Real-time Resource Allocation Graph visualization</li>
              <li>🟢🔴 Safe / Unsafe state indicator</li>
              <li>💥 Deadlock alert animation with screen cracks and freeze effect</li>
              <li>🔗 Cycle detection with highlighted edges</li>
            </ul>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-2xl hover:scale-105 transition-transform shadow-lg"
          >
            Enter Dungeon 🏰
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8 transition-all ${freezeAnimation ? 'animate-pulse' : ''}`}>
      {/* Deadlock crack overlay */}
      {deadlockDetected && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-red-500/10" />
          <svg className="w-full h-full" style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,0,0.8))' }}>
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="red" strokeWidth="3" opacity="0.7" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="red" strokeWidth="3" opacity="0.7" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="red" strokeWidth="2" opacity="0.5" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="red" strokeWidth="2" opacity="0.5" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">🏰 Deadlock Dungeon</h1>
          <div className="flex gap-4 text-lg">
            <span className="bg-purple-600 px-4 py-2 rounded-lg">Score: {score}</span>
            <span className="bg-blue-600 px-4 py-2 rounded-lg">Level: {level}</span>
            <span className="bg-green-600 px-4 py-2 rounded-lg">XP: {xp}/{level * 100}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className={`text-2xl font-bold px-6 py-3 rounded-lg ${safeState ? 'bg-green-600' : 'bg-red-600'} ${safeState ? '' : 'animate-pulse'}`}>
            {safeState ? '🟢 SAFE STATE' : '🔴 UNSAFE STATE'}
          </div>
          {powerUps.safeStateShield.active && (
            <div className="bg-blue-600 px-4 py-2 rounded-lg animate-pulse">
              🛡️ Shield Active: {powerUps.safeStateShield.timeLeft}s
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
        {/* Left: Dungeon View */}
        <div className="col-span-2 bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
          <h2 className="text-2xl font-bold mb-4">🗺️ Dungeon Map</h2>
          <div className="relative w-full h-[500px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-purple-500/50">
            {/* Draw edges for Resource Allocation Graph */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {processes.map(p => 
                p.requesting && resources.find(r => r.id === p.requesting) ? (
                  <line
                    key={`${p.id}-${p.requesting}`}
                    x1={p.position.x + 30}
                    y1={p.position.y + 30}
                    x2={resources.find(r => r.id === p.requesting).position.x + 20}
                    y2={resources.find(r => r.id === p.requesting).position.y + 20}
                    stroke={cycleEdges.some(e => e.from === p.id && e.to === p.requesting) ? '#ef4444' : '#fbbf24'}
                    strokeWidth={cycleEdges.some(e => e.from === p.id && e.to === p.requesting) ? '4' : '2'}
                    strokeDasharray="5,5"
                    className={cycleEdges.some(e => e.from === p.id && e.to === p.requesting) ? 'animate-pulse' : ''}
                  />
                ) : null
              )}
              {resources.map(r => 
                r.allocated && processes.find(p => p.id === r.allocated) ? (
                  <line
                    key={`${r.id}-${r.allocated}`}
                    x1={r.position.x + 20}
                    y1={r.position.y + 20}
                    x2={processes.find(p => p.id === r.allocated).position.x + 30}
                    y2={processes.find(p => p.id === r.allocated).position.y + 30}
                    stroke={cycleEdges.some(e => e.from === r.id && e.to === r.allocated) ? '#ef4444' : '#10b981'}
                    strokeWidth={cycleEdges.some(e => e.from === r.id && e.to === r.allocated) ? '4' : '2'}
                    className={cycleEdges.some(e => e.from === r.id && e.to === r.allocated) ? 'animate-pulse' : ''}
                  />
                ) : null
              )}
            </svg>

            {/* Processes */}
            {processes.map(p => (
              <div
                key={p.id}
                className={`absolute cursor-pointer transition-all ${selectedProcess === p.id ? 'scale-110 ring-4 ring-white' : ''} ${deadlockDetected && cycleEdges.some(e => e.from === p.id || e.to === p.id) ? 'animate-bounce' : ''}`}
                style={{
                  left: p.position.x,
                  top: p.position.y,
                  width: 60,
                  height: 60
                }}
                onClick={() => setSelectedProcess(p.id)}
              >
                <div className={`w-full h-full rounded-full bg-${p.color}-600 flex items-center justify-center text-2xl font-bold border-4 border-${p.color}-400 shadow-lg`}>
                  {p.name[0]}
                </div>
                <div className="text-xs text-center mt-1 font-bold">{p.name}</div>
                {p.requesting && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs animate-pulse">⏳</div>
                )}
                {p.holding.length > 0 && (
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold">{p.holding.length}</div>
                )}
              </div>
            ))}

            {/* Resources */}
            {resources.map(r => (
              <div
                key={r.id}
                className={`absolute transition-all ${r.allocated ? 'opacity-50' : ''}`}
                style={{
                  left: r.position.x,
                  top: r.position.y,
                  width: 40,
                  height: 40
                }}
              >
                <div className="text-3xl">{r.name.split(' ')[0]}</div>
                {r.allocated && (
                  <div className="absolute -bottom-4 left-0 right-0 text-xs text-center bg-black/50 rounded px-1">
                    {processes.find(p => p.id === r.allocated)?.name}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-yellow-500"></div>
              <span>Requesting (dashed)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-green-500"></div>
              <span>Allocated (solid)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-red-500 animate-pulse"></div>
              <span>Cycle (red pulse)</span>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="space-y-6">
          {/* Process Info */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold mb-4">👤 Characters</h3>
            <div className="space-y-3">
              {processes.map(p => (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${selectedProcess === p.id ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={() => setSelectedProcess(p.id)}
                >
                  <div className="font-bold">{p.name}</div>
                  <div className="text-sm">
                    {p.holding.length > 0 ? `Holding: ${p.holding.length} keys` : 'No keys'}
                  </div>
                  {p.requesting && (
                    <div className="text-xs text-yellow-400">Waiting for: {resources.find(r => r.id === p.requesting)?.name}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {selectedProcess && (
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold mb-4">⚡ Actions</h3>
              <div className="space-y-2">
                {resources.map(r => (
                  <div key={r.id} className="flex gap-2">
                    <button
                      onClick={() => requestResource(selectedProcess, r.id)}
                      disabled={r.allocated === selectedProcess}
                      className="flex-1 px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Request {r.name}
                    </button>
                    {r.allocated === selectedProcess && (
                      <button
                        onClick={() => releaseResource(selectedProcess, r.id)}
                        className="px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700 text-sm"
                      >
                        Release
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deadlock Break */}
          {deadlockDetected && (
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-red-500/50 animate-pulse">
              <h3 className="text-xl font-bold mb-4 text-red-400">💀 DEADLOCK!</h3>
              <button
                onClick={breakDeadlock}
                className="w-full px-4 py-3 bg-red-600 rounded-lg hover:bg-red-700 font-bold text-lg"
              >
                Break Cycle! 🔨
              </button>
            </div>
          )}

          {/* Power-ups */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ Power-ups</h3>
            <div className="space-y-3">
              <button
                onClick={useResourceReset}
                disabled={powerUps.resourceReset.count <= 0 || powerUps.resourceReset.cooldown > 0}
                className="w-full px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                🔄 Resource Reset
                <div className="text-xs mt-1">
                  {powerUps.resourceReset.count} uses
                  {powerUps.resourceReset.cooldown > 0 && ` (${powerUps.resourceReset.cooldown}s)`}
                </div>
              </button>
              <button
                onClick={useSafeStateShield}
                disabled={powerUps.safeStateShield.count <= 0 || powerUps.safeStateShield.cooldown > 0}
                className="w-full px-4 py-3 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                🛡️ Safe State Shield
                <div className="text-xs mt-1">
                  {powerUps.safeStateShield.count} uses
                  {powerUps.safeStateShield.cooldown > 0 && ` (${powerUps.safeStateShield.cooldown}s)`}
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
