import { useState, useEffect, useCallback } from 'react';

export default function OSTycoon() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, crashed, paused
  const [score, setScore] = useState(0);
  const [money, setMoney] = useState(1000);
  const [uptime, setUptime] = useState(0);

  // System resources
  const [resources, setResources] = useState({
    cpuCores: 2,
    cpuSpeed: 2.0, // GHz
    ramTotal: 4096, // MB
    ramUsed: 0,
    storageTotal: 100, // GB
    storageUsed: 0
  });

  // System metrics
  const [metrics, setMetrics] = useState({
    cpuLoad: 0, // 0-100%
    ramUsage: 0, // 0-100%
    storageUsage: 0, // 0-100%
    activeProcesses: 0,
    throughput: 0 // processes completed per minute
  });

  // Processes
  const [processes, setProcesses] = useState([]);
  const [nextProcessId, setNextProcessId] = useState(1);
  const [processHistory, setProcessHistory] = useState([]);

  // Event logs
  const [eventLogs, setEventLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Power-ups
  const [powerUps, setPowerUps] = useState({
    turboMode: { count: 2, cooldown: 0, active: false, timeLeft: 0 },
    garbageCollector: { count: 3, cooldown: 0 }
  });

  // CPU usage history for graph (last 30 seconds)
  const [cpuHistory, setCpuHistory] = useState(Array(30).fill(0));
  const [ramHistory, setRamHistory] = useState(Array(30).fill(0));

  // Process templates
  const PROCESS_TEMPLATES = [
    { name: 'WebServer', cpuUsage: 15, ramUsage: 512, duration: 10, priority: 2, revenue: 50 },
    { name: 'Database', cpuUsage: 25, ramUsage: 1024, duration: 15, priority: 3, revenue: 100 },
    { name: 'VideoRender', cpuUsage: 40, ramUsage: 2048, duration: 20, priority: 1, revenue: 150 },
    { name: 'FileSync', cpuUsage: 10, ramUsage: 256, duration: 8, priority: 1, revenue: 30 },
    { name: 'AIModel', cpuUsage: 50, ramUsage: 3072, duration: 25, priority: 3, revenue: 200 },
    { name: 'BackupTask', cpuUsage: 20, ramUsage: 512, duration: 12, priority: 1, revenue: 60 }
  ];

  // Add event log
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const log = { id: Date.now(), timestamp, message, type };
    setEventLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
  }, []);

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 3000);
  }, []);

  // Add CPU/RAM
  const addCPU = () => {
    const cost = 500 * resources.cpuCores;
    if (money < cost) {
      addAlert('Not enough money!', 'danger');
      return;
    }
    setMoney(m => m - cost);
    setResources(r => ({ ...r, cpuCores: r.cpuCores + 1 }));
    addLog(`Added CPU core (+1). Total: ${resources.cpuCores + 1}`, 'success');
    addAlert('CPU core added!', 'success');
    setScore(s => s + 100);
  };

  const addRAM = () => {
    const cost = 300;
    if (money < cost) {
      addAlert('Not enough money!', 'danger');
      return;
    }
    setMoney(m => m - cost);
    setResources(r => ({ ...r, ramTotal: r.ramTotal + 2048 }));
    addLog(`Added 2GB RAM. Total: ${(resources.ramTotal + 2048) / 1024}GB`, 'success');
    addAlert('RAM upgraded!', 'success');
    setScore(s => s + 50);
  };

  const addStorage = () => {
    const cost = 200;
    if (money < cost) {
      addAlert('Not enough money!', 'danger');
      return;
    }
    setMoney(m => m - cost);
    setResources(r => ({ ...r, storageTotal: r.storageTotal + 50 }));
    addLog(`Added 50GB storage. Total: ${resources.storageTotal + 50}GB`, 'success');
    addAlert('Storage expanded!', 'success');
    setScore(s => s + 30);
  };

  // Start a new process
  const startProcess = (template) => {
    // Check resources
    if (resources.ramUsed + template.ramUsage > resources.ramTotal) {
      addAlert('Not enough RAM!', 'danger');
      addLog(`Failed to start ${template.name}: Insufficient RAM`, 'error');
      return;
    }

    const newProcess = {
      id: nextProcessId,
      name: `${template.name}-${nextProcessId}`,
      ...template,
      startTime: uptime,
      remainingTime: template.duration,
      state: 'running'
    };

    setProcesses(prev => [...prev, newProcess]);
    setNextProcessId(id => id + 1);
    setResources(r => ({ ...r, ramUsed: r.ramUsed + template.ramUsage }));
    addLog(`Started process: ${newProcess.name}`, 'info');
    setScore(s => s + 10);
  };

  // Kill a process
  const killProcess = (processId) => {
    const process = processes.find(p => p.id === processId);
    if (!process) return;

    setProcesses(prev => prev.filter(p => p.id !== processId));
    setResources(r => ({ ...r, ramUsed: r.ramUsed - process.ramUsage }));
    addLog(`Killed process: ${process.name}`, 'warning');
    addAlert(`${process.name} terminated`, 'warning');
  };

  // Change process priority
  const changePriority = (processId, delta) => {
    setProcesses(prev => prev.map(p => 
      p.id === processId ? { ...p, priority: Math.max(1, Math.min(5, p.priority + delta)) } : p
    ));
  };

  // Power-up: Turbo Mode
  const useTurboMode = () => {
    if (powerUps.turboMode.count <= 0 || powerUps.turboMode.cooldown > 0) return;

    setResources(r => ({ ...r, cpuSpeed: r.cpuSpeed * 2 }));
    setPowerUps(prev => ({
      ...prev,
      turboMode: { count: prev.turboMode.count - 1, cooldown: 40, active: true, timeLeft: 15 }
    }));

    addAlert('🚀 Turbo Mode activated!', 'success');
    addLog('Turbo Mode: CPU speed x2', 'success');
    setMoney(m => m - 100);

    setTimeout(() => {
      setResources(r => ({ ...r, cpuSpeed: r.cpuSpeed / 2 }));
      setPowerUps(prev => ({
        ...prev,
        turboMode: { ...prev.turboMode, active: false, timeLeft: 0 }
      }));
      addLog('Turbo Mode ended', 'info');
    }, 15000);
  };

  // Power-up: Garbage Collector
  const useGarbageCollector = () => {
    if (powerUps.garbageCollector.count <= 0 || powerUps.garbageCollector.cooldown > 0) return;

    // Kill low priority processes
    const lowPriorityProcesses = processes.filter(p => p.priority === 1);
    lowPriorityProcesses.forEach(p => killProcess(p.id));

    setPowerUps(prev => ({
      ...prev,
      garbageCollector: { count: prev.garbageCollector.count - 1, cooldown: 20 }
    }));

    addAlert(`🗑️ Cleared ${lowPriorityProcesses.length} processes!`, 'success');
    addLog(`Garbage Collector cleared ${lowPriorityProcesses.length} low-priority processes`, 'success');
    setMoney(m => m - 50);
  };

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setUptime(u => u + 1);

      // Update processes
      setProcesses(prev => {
        const updated = prev.map(p => ({
          ...p,
          remainingTime: p.remainingTime - (powerUps.turboMode.active ? 2 : 1)
        }));

        // Complete finished processes
        const completed = updated.filter(p => p.remainingTime <= 0);
        completed.forEach(p => {
          setMoney(m => m + p.revenue);
          setScore(s => s + p.revenue);
          addLog(`Completed: ${p.name} (+$${p.revenue})`, 'success');
          setProcessHistory(h => [...h, { ...p, completedAt: uptime }]);
        });

        // Remove completed
        const remaining = updated.filter(p => p.remainingTime > 0);
        
        // Update RAM
        const completedRam = completed.reduce((sum, p) => sum + p.ramUsage, 0);
        if (completedRam > 0) {
          setResources(r => ({ ...r, ramUsed: r.ramUsed - completedRam }));
        }

        return remaining;
      });

      // Calculate CPU load
      const totalCpuUsage = processes.reduce((sum, p) => sum + p.cpuUsage, 0);
      const cpuCapacity = resources.cpuCores * 100;
      const cpuLoad = Math.min(100, (totalCpuUsage / cpuCapacity) * 100);
      
      // Calculate metrics
      const ramUsage = (resources.ramUsed / resources.ramTotal) * 100;
      
      setMetrics({
        cpuLoad: cpuLoad,
        ramUsage: ramUsage,
        storageUsage: (resources.storageUsed / resources.storageTotal) * 100,
        activeProcesses: processes.length,
        throughput: processHistory.length > 0 ? (processHistory.length / (uptime / 60)).toFixed(1) : 0
      });

      // Update history graphs
      setCpuHistory(prev => [...prev.slice(1), cpuLoad]);
      setRamHistory(prev => [...prev.slice(1), ramUsage]);

      // Check for system crash
      if (cpuLoad >= 100) {
        setGameState('crashed');
        addAlert('💥 SYSTEM CRASH! CPU Overload!', 'danger');
        addLog('CRITICAL: System crashed due to CPU overload', 'error');
        return;
      }

      // Random process spawning (easier - 30% chance)
      if (Math.random() < 0.3 && processes.length < 10) {
        const template = PROCESS_TEMPLATES[Math.floor(Math.random() * PROCESS_TEMPLATES.length)];
        if (resources.ramUsed + template.ramUsage <= resources.ramTotal) {
          startProcess(template);
        }
      }

      // Update power-up cooldowns
      setPowerUps(prev => ({
        turboMode: {
          ...prev.turboMode,
          cooldown: Math.max(0, prev.turboMode.cooldown - 1),
          timeLeft: Math.max(0, prev.turboMode.timeLeft - 1)
        },
        garbageCollector: {
          ...prev.garbageCollector,
          cooldown: Math.max(0, prev.garbageCollector.cooldown - 1)
        }
      }));

      // Bonus for optimal management
      if (cpuLoad > 50 && cpuLoad < 85 && processes.length > 2) {
        setScore(s => s + 5);
        setMoney(m => m + 10);
      }

      // Uptime bonus
      if (uptime % 30 === 0 && uptime > 0) {
        const bonus = uptime * 2;
        setScore(s => s + bonus);
        addLog(`Uptime bonus: +${bonus} points`, 'success');
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, processes, resources, uptime, powerUps.turboMode.active, processHistory, addLog, addAlert]);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">💻 OS Manager Tycoon</h1>
            <p className="text-2xl text-green-300">Build & Manage Your Operating System!</p>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-green-500/30">
            <h2 className="text-3xl font-bold mb-4 text-green-300">🧠 OS Concepts Learned</h2>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="bg-green-500/20 p-4 rounded-lg">✓ Process Management</div>
              <div className="bg-green-500/20 p-4 rounded-lg">✓ CPU Load & Scheduling</div>
              <div className="bg-green-500/20 p-4 rounded-lg">✓ Memory Management</div>
              <div className="bg-green-500/20 p-4 rounded-lg">✓ Multitasking</div>
              <div className="bg-green-500/20 p-4 rounded-lg">✓ Resource Allocation</div>
              <div className="bg-green-500/20 p-4 rounded-lg">✓ System Optimization</div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-green-500/30">
            <h2 className="text-3xl font-bold mb-4 text-blue-300">🎮 How to Play</h2>
            <ul className="space-y-3 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🏗️</span>
                <span>Run a small OS like SimCity for computers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">➕</span>
                <span>Add/remove CPUs, RAM, and storage to scale your system</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">⚙️</span>
                <span>Start processes manually or let them spawn automatically</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <span>Kill tasks when needed to free up resources</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <span>Keep CPU load below 100% or the system CRASHES!</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📈</span>
                <span>Watch real-time graphs and kernel event logs</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎲</span>
                <span>Adjust process priorities (1=low, 5=critical)</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-green-500/30">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">🏆 Scoring</h2>
            <ul className="space-y-2 text-lg">
              <li>✓ Longer uptime → higher score (bonus every 30 seconds)</li>
              <li>✓ Complete process: Revenue varies by task</li>
              <li>✓ Start process: +10 points</li>
              <li>✓ Optimal CPU load (50-85%): +5 points/sec + $10</li>
              <li>✓ Add CPU core: +100 points (costs $500 × cores)</li>
              <li>✓ Add RAM: +50 points (costs $300)</li>
              <li>✓ System crash: Game Over</li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-green-500/30">
            <h2 className="text-3xl font-bold mb-4 text-purple-300">⚡ Power-ups</h2>
            <div className="space-y-4 text-lg">
              <div className="bg-blue-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">🚀 Turbo Mode (2 uses) - $100</div>
                <div>CPU speed x2 for 15 seconds. Cooldown: 40 seconds</div>
              </div>
              <div className="bg-red-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">🗑️ Garbage Collector (3 uses) - $50</div>
                <div>Clears all low-priority processes. Cooldown: 20 seconds</div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-green-500/30">
            <h2 className="text-3xl font-bold mb-4 text-cyan-300">💡 Strategy Tips</h2>
            <ul className="space-y-2 text-lg">
              <li>🔹 Keep CPU load between 50-85% for optimal scoring</li>
              <li>🔹 Upgrade RAM early to handle more processes</li>
              <li>🔹 Use Garbage Collector when CPU approaches 90%</li>
              <li>🔹 High-priority processes give more revenue</li>
              <li>🔹 Balance resource upgrades with cash flow</li>
            </ul>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl font-bold text-2xl hover:scale-105 transition-transform shadow-lg"
          >
            Boot System 💻
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'crashed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 text-white p-8 flex items-center justify-center">
        <div className="bg-black/60 backdrop-blur-lg p-12 rounded-3xl text-center max-w-2xl border-4 border-red-500">
          <div className="text-8xl mb-6 animate-pulse">💥</div>
          <h2 className="text-5xl font-bold mb-4 text-red-500">SYSTEM CRASH!</h2>
          <p className="text-2xl mb-4">CPU Overload</p>
          <div className="bg-red-500/20 p-6 rounded-xl mb-6">
            <div className="text-3xl mb-2">Final Statistics</div>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div>Uptime: {uptime}s</div>
              <div>Score: {score}</div>
              <div>Money: ${money}</div>
              <div>Processes: {processHistory.length}</div>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl font-bold text-xl hover:scale-105 transition-transform"
          >
            Reboot System
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-black text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">💻 OS Manager Tycoon</h1>
          <div className="flex gap-4 text-lg">
            <span className="bg-green-600 px-4 py-2 rounded-lg">Score: {score}</span>
            <span className="bg-blue-600 px-4 py-2 rounded-lg">💰 ${money}</span>
            <span className="bg-purple-600 px-4 py-2 rounded-lg">⏱️ {uptime}s</span>
            <span className={`px-4 py-2 rounded-lg ${metrics.cpuLoad > 90 ? 'bg-red-600 animate-pulse' : metrics.cpuLoad > 70 ? 'bg-yellow-600' : 'bg-green-600'}`}>
              CPU: {metrics.cpuLoad.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {powerUps.turboMode.active && (
            <div className="bg-blue-600 px-4 py-2 rounded-lg animate-pulse">
              🚀 Turbo: {powerUps.turboMode.timeLeft}s
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
        {/* Left Column: Graphs & Metrics */}
        <div className="col-span-3 space-y-6">
          {/* CPU & RAM Usage Graphs */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
              <h3 className="text-xl font-bold mb-4">📊 CPU Usage History</h3>
              <div className="h-32 flex items-end gap-1">
                {cpuHistory.map((value, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-t transition-all ${
                      value > 90 ? 'bg-red-500' : value > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ height: `${value}%` }}
                    title={`${value.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>30s ago</span>
                <span>Now</span>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
              <h3 className="text-xl font-bold mb-4">📊 RAM Usage History</h3>
              <div className="h-32 flex items-end gap-1">
                {ramHistory.map((value, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-blue-500 rounded-t transition-all"
                    style={{ height: `${value}%` }}
                    title={`${value.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>30s ago</span>
                <span>Now</span>
              </div>
            </div>
          </div>

          {/* System Resources */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-2xl font-bold mb-4">⚙️ System Resources</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">CPU Cores</div>
                <div className="text-3xl font-bold">{resources.cpuCores}</div>
                <div className="text-sm mt-2">Speed: {resources.cpuSpeed.toFixed(1)} GHz</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">RAM</div>
                <div className="text-3xl font-bold">{(resources.ramTotal / 1024).toFixed(0)} GB</div>
                <div className="text-sm mt-2">Used: {(resources.ramUsed / 1024).toFixed(1)} GB</div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${metrics.ramUsage}%` }}
                  />
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Storage</div>
                <div className="text-3xl font-bold">{resources.storageTotal} GB</div>
                <div className="text-sm mt-2">Used: {resources.storageUsed} GB</div>
              </div>
            </div>
          </div>

          {/* Active Processes */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-2xl font-bold mb-4">🔄 Active Processes ({processes.length}/10)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {processes.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No active processes</div>
              ) : (
                processes.map(proc => (
                  <div key={proc.id} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold">{proc.name}</div>
                      <div className="text-sm text-gray-400">
                        CPU: {proc.cpuUsage}% | RAM: {proc.ramUsage}MB | Priority: {proc.priority}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${((proc.duration - proc.remainingTime) / proc.duration) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => changePriority(proc.id, 1)}
                        className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                        title="Increase priority"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => changePriority(proc.id, -1)}
                        className="px-2 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-sm"
                        title="Decrease priority"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => killProcess(proc.id)}
                        className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
                      >
                        Kill
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Event Logs */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-2xl font-bold mb-4">📜 Kernel Event Logs</h3>
            <div className="bg-black rounded-lg p-4 font-mono text-sm space-y-1 max-h-48 overflow-y-auto">
              {eventLogs.map(log => (
                <div
                  key={log.id}
                  className={`${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-gray-400'
                  }`}
                >
                  [{log.timestamp}] {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="space-y-6">
          {/* System Metrics */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-xl font-bold mb-4">📈 Metrics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>CPU Load:</span>
                <span className={`font-bold ${metrics.cpuLoad > 90 ? 'text-red-400' : 'text-green-400'}`}>
                  {metrics.cpuLoad.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>RAM Usage:</span>
                <span className="font-bold">{metrics.ramUsage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Active Processes:</span>
                <span className="font-bold">{metrics.activeProcesses}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-bold">{processHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Throughput:</span>
                <span className="font-bold">{metrics.throughput}/min</span>
              </div>
            </div>
          </div>

          {/* Upgrade Resources */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-xl font-bold mb-4">⬆️ Upgrades</h3>
            <div className="space-y-2">
              <button
                onClick={addCPU}
                disabled={money < 500 * resources.cpuCores}
                className="w-full px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
              >
                +1 CPU Core
                <div className="text-xs mt-1">${500 * resources.cpuCores}</div>
              </button>
              <button
                onClick={addRAM}
                disabled={money < 300}
                className="w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
              >
                +2GB RAM
                <div className="text-xs mt-1">$300</div>
              </button>
              <button
                onClick={addStorage}
                disabled={money < 200}
                className="w-full px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
              >
                +50GB Storage
                <div className="text-xs mt-1">$200</div>
              </button>
            </div>
          </div>

          {/* Start Processes */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-xl font-bold mb-4">▶️ Start Process</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {PROCESS_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => startProcess(template)}
                  disabled={resources.ramUsed + template.ramUsage > resources.ramTotal}
                  className="w-full px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-left text-sm"
                >
                  <div className="font-bold">{template.name}</div>
                  <div className="text-xs text-gray-400">
                    CPU: {template.cpuUsage}% | RAM: {template.ramUsage}MB | ${template.revenue}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Power-ups */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ Power-ups</h3>
            <div className="space-y-3">
              <button
                onClick={useTurboMode}
                disabled={powerUps.turboMode.count <= 0 || powerUps.turboMode.cooldown > 0 || money < 100}
                className="w-full px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                🚀 Turbo Mode
                <div className="text-xs mt-1">
                  {powerUps.turboMode.count} uses | $100
                  {powerUps.turboMode.cooldown > 0 && ` (${powerUps.turboMode.cooldown}s)`}
                </div>
              </button>
              <button
                onClick={useGarbageCollector}
                disabled={powerUps.garbageCollector.count <= 0 || powerUps.garbageCollector.cooldown > 0 || money < 50}
                className="w-full px-4 py-3 bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                🗑️ Garbage Collector
                <div className="text-xs mt-1">
                  {powerUps.garbageCollector.count} uses | $50
                  {powerUps.garbageCollector.cooldown > 0 && ` (${powerUps.garbageCollector.cooldown}s)`}
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
