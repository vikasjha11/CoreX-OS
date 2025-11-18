import { useState, useEffect } from 'react';

export default function CPUSchedulerSimulator({ onBack }) {
  const [gameStatus, setGameStatus] = useState('instructions');
  const [processes, setProcesses] = useState([]);
  const [score, setScore] = useState(0);
  const [cpuLoad, setCpuLoad] = useState(0);
  const [time, setTime] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState('FCFS');
  const [ganttChart, setGanttChart] = useState([]);
  const [powerUps, setPowerUps] = useState({ quantumBoost: 0, priorityShield: 0 });
  const [alerts, setAlerts] = useState([]);
  const [waitingTime, setWaitingTime] = useState(0);
  const [quantum, setQuantum] = useState(4);
  const [achievements, setAchievements] = useState([]);

  const tracks = [
    { name: 'FCFS', color: 'blue', description: 'First Come First Serve' },
    { name: 'SJF', color: 'green', description: 'Shortest Job First' },
    { name: 'RR', color: 'purple', description: 'Round Robin' },
    { name: 'PRIORITY', color: 'orange', description: 'Priority Scheduling' }
  ];

  const startGame = () => {
    setGameStatus('playing');
    setProcesses([]);
    setScore(0);
    setCpuLoad(0);
    setTime(0);
    setGanttChart([]);
    setAlerts([]);
    setWaitingTime(0);
    setAchievements([]);
    spawnProcess();
  };

  const spawnProcess = () => {
    const newProc = {
      id: `P${Date.now() % 10000}`,
      burst: Math.floor(Math.random() * 8) + 2,
      priority: Math.floor(Math.random() * 5) + 1,
      arrivalTime: time,
      track: null,
      position: 0,
      remainingBurst: 0,
      waitTime: 0,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };
    newProc.remainingBurst = newProc.burst;
    setProcesses(prev => [...prev, newProc]);
  };

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    
    const interval = setInterval(() => {
      setTime(t => t + 1);
      
      // Spawn new process randomly
      if (Math.random() > 0.5) {
        spawnProcess();
      }
      
      // Calculate CPU load based on unassigned processes
      const unassigned = processes.filter(p => !p.track).length;
      const newLoad = Math.min(100, unassigned * 12);
      setCpuLoad(newLoad);
      
      // Game over condition
      if (newLoad >= 100) {
        setGameStatus('gameover');
        return;
      }
      
      // Calculate waiting time
      const assigned = processes.filter(p => p.track);
      const totalWait = assigned.reduce((sum, p) => sum + p.waitTime, 0);
      const avgWait = assigned.length > 0 ? totalWait / assigned.length : 0;
      setWaitingTime(avgWait);
      
      // Score based on low CPU load and low waiting time
      if (newLoad < 70) {
        setScore(s => s + Math.floor((100 - newLoad) / 10));
      }
      if (avgWait < 5) {
        setScore(s => s + 5);
      }
      
      // Check for starvation
      const hasStarvation = assigned.some(p => p.waitTime > 15);
      if (hasStarvation && powerUps.priorityShield === 0) {
        addAlert('⚠️ Starvation detected!', 'warning');
      }
      
      // Check RR quantum
      if (selectedTrack === 'RR' && quantum > 8) {
        addAlert('⚠️ RR Quantum too high!', 'warning');
      }
      
      // Update power-up timers
      if (powerUps.quantumBoost > 0) {
        setPowerUps(p => ({ ...p, quantumBoost: p.quantumBoost - 1 }));
      }
      if (powerUps.priorityShield > 0) {
        setPowerUps(p => ({ ...p, priorityShield: p.priorityShield - 1 }));
      }
      
      // Update process wait times
      setProcesses(prev => prev.map(p => 
        p.track ? { ...p, waitTime: p.waitTime + 1 } : p
      ));
      
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameStatus, processes, cpuLoad, selectedTrack, quantum, powerUps]);

  const addAlert = (message, type = 'success') => {
    setAlerts(prev => [...prev, { message, type, id: Date.now() }]);
    setTimeout(() => {
      setAlerts(prev => prev.slice(1));
    }, 3000);
  };

  const dragProcess = (processId, trackName) => {
    const process = processes.find(p => p.id === processId);
    if (!process || process.track) return;
    
    setProcesses(prev => prev.map(p => 
      p.id === processId ? { ...p, track: trackName } : p
    ));
    
    // Add to Gantt chart
    setGanttChart(prev => [...prev, {
      id: processId,
      track: trackName,
      start: time,
      duration: process.burst
    }]);
    
    // Calculate bonus for optimal algorithm choice
    let bonus = 50;
    if (trackName === 'SJF' && process.burst < 5) {
      bonus += 50;
      addAlert('🎯 Optimal SJF choice! +50 bonus');
    }
    if (trackName === 'PRIORITY' && process.priority >= 4) {
      bonus += 30;
      addAlert('⭐ High priority match! +30 bonus');
    }
    
    setScore(s => s + bonus);
    
    // Check for zero starvation achievement
    const allAssigned = processes.filter(p => p.track);
    if (allAssigned.length >= 10 && allAssigned.every(p => p.waitTime < 10)) {
      if (!achievements.includes('zero-starvation')) {
        setAchievements(prev => [...prev, 'zero-starvation']);
        setScore(s => s + 500);
        addAlert('🏆 Achievement: Zero Starvation! +500');
      }
    }
  };

  const usePowerUp = (type) => {
    if (type === 'quantumBoost' && score >= 100) {
      setPowerUps(p => ({ ...p, quantumBoost: 20 }));
      setQuantum(q => q + 4);
      setScore(s => s - 100);
      addAlert('⚡ Quantum Boost activated! +4 quantum for 20s');
    } else if (type === 'priorityShield' && score >= 150) {
      setPowerUps(p => ({ ...p, priorityShield: 10 }));
      setScore(s => s - 150);
      addAlert('🛡️ Priority Shield activated! No starvation for 10s');
    }
  };

  if (gameStatus === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-black p-8">
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
          ← Back to Arcade
        </button>
        
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-2xl p-10 border-2 border-blue-500">
          <h2 className="text-5xl font-bold text-blue-400 mb-3 text-center">🚂 CPU Scheduler Simulator</h2>
          <p className="text-gray-400 text-center mb-8 text-lg">Mini Metro Style Process Scheduling</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-blue-900/30 rounded-xl p-6 border border-blue-500/30">
                <h3 className="text-xl font-bold text-blue-300 mb-4">🧠 OS Concepts Learned</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• FCFS, SJF, RR, Priority algorithms</li>
                  <li>• Waiting time & turnaround time</li>
                  <li>• CPU utilization optimization</li>
                  <li>• Starvation prevention</li>
                  <li>• Preemptive vs Non-preemptive</li>
                </ul>
              </div>

              <div className="bg-blue-900/30 rounded-xl p-6 border border-blue-500/30">
                <h3 className="text-xl font-bold text-blue-300 mb-4">⚡ Power-ups</h3>
                <div className="space-y-3">
                  <div className="bg-purple-800/30 p-3 rounded">
                    <div className="font-bold text-purple-300">Quantum Boost (100pts)</div>
                    <div className="text-sm text-gray-400">Increase RR quantum for 20 sec</div>
                  </div>
                  <div className="bg-yellow-800/30 p-3 rounded">
                    <div className="font-bold text-yellow-300">Priority Shield (150pts)</div>
                    <div className="text-sm text-gray-400">Prevent starvation for 10 sec</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">🎮 Gameplay</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">1.</span>
                    <span>Processes appear as moving trains with burst time</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">2.</span>
                    <span>Drag processes onto scheduling tracks (FCFS, SJF, RR, PRIORITY)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">3.</span>
                    <span>The chosen algorithm decides process movement</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">4.</span>
                    <span>Keep CPU load below 100% to avoid crash</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4">🏆 Scoring</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <span>Lower waiting time → More points</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <span>Optimal algorithm match → Bonus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <span>Zero starvation → +500 achievement</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full mt-10 px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 rounded-xl font-bold text-2xl transition-all shadow-2xl"
          >
            🎮 Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-black p-8">
      <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
        ← Back
      </button>
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-4xl font-bold text-blue-400">🚂 CPU Scheduler Simulator</h2>
            <p className="text-gray-400 mt-1">Drag processes to optimal tracks</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{Math.floor(score)} pts</div>
            <div className="text-gray-400">Time: {time}s | Avg Wait: {waitingTime.toFixed(1)}s</div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map(alert => (
              <div 
                key={alert.id} 
                className={`px-4 py-2 rounded-lg animate-pulse ${
                  alert.type === 'warning' ? 'bg-red-900/30 border border-red-500/50 text-red-300' : 
                  'bg-green-900/30 border border-green-500/50 text-green-300'
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* CPU Load Meter */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex justify-between mb-2">
            <span className="text-white font-bold">CPU Load</span>
            <span className={`font-bold ${cpuLoad > 80 ? 'text-red-400' : cpuLoad > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
              {Math.floor(cpuLoad)}%
            </span>
          </div>
          <div className="h-8 bg-gray-800 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-500 ${cpuLoad > 80 ? 'bg-red-500' : cpuLoad > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${cpuLoad}%` }}
            />
          </div>
          {cpuLoad > 80 && (
            <div className="mt-3 text-red-400 font-semibold animate-pulse">⚠️ CPU OVERLOAD WARNING - Assign processes quickly!</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Incoming Processes */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 sticky top-8">
              <h3 className="text-white font-bold mb-4">Incoming Trains 🚂</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {processes.filter(p => !p.track).map(proc => (
                  <div
                    key={proc.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('processId', proc.id)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 p-4 rounded-xl cursor-move transition-all hover:scale-105 shadow-lg"
                    style={{ borderLeft: `4px solid ${proc.color}` }}
                  >
                    <div className="text-white font-bold">{proc.id}</div>
                    <div className="text-blue-200 text-sm">Burst: {proc.burst}ms</div>
                    <div className="text-blue-200 text-sm">Priority: {proc.priority}</div>
                  </div>
                ))}
                {processes.filter(p => !p.track).length === 0 && (
                  <div className="text-center text-gray-500 py-8 text-sm">Waiting for trains...</div>
                )}
              </div>

              {/* Power-ups */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-white font-bold mb-3">⚡ Power-ups</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => usePowerUp('quantumBoost')}
                    disabled={score < 100 || powerUps.quantumBoost > 0}
                    className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold text-sm transition"
                  >
                    {powerUps.quantumBoost > 0 ? `⚡ Active (${powerUps.quantumBoost}s)` : '⚡ Quantum (100pts)'}
                  </button>
                  <button
                    onClick={() => usePowerUp('priorityShield')}
                    disabled={score < 150 || powerUps.priorityShield > 0}
                    className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold text-sm transition"
                  >
                    {powerUps.priorityShield > 0 ? `🛡️ Active (${powerUps.priorityShield}s)` : '🛡️ Shield (150pts)'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Scheduling Tracks */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {tracks.map(track => (
                <div
                  key={track.name}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const processId = e.dataTransfer.getData('processId');
                    dragProcess(processId, track.name);
                  }}
                  className={`bg-gray-900 rounded-xl p-6 border-2 border-dashed border-${track.color}-500/30 hover:border-${track.color}-500/60 transition-all min-h-[120px]`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className={`text-${track.color}-400 font-bold text-xl`}>{track.name} Track</h3>
                      <p className="text-gray-500 text-sm">{track.description}</p>
                    </div>
                    {track.name === selectedTrack && (
                      <div className="bg-blue-600 px-3 py-1 rounded-full text-white text-sm font-semibold">
                        Selected
                      </div>
                    )}
                  </div>

                  {/* Processes on this track */}
                  <div className="flex flex-wrap gap-2">
                    {processes.filter(p => p.track === track.name).map(proc => (
                      <div
                        key={proc.id}
                        className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 animate-pulse"
                        style={{ borderLeft: `4px solid ${proc.color}` }}
                      >
                        <div className="text-white font-semibold text-sm">{proc.id}</div>
                        <div className="text-gray-400 text-xs">Wait: {proc.waitTime}s</div>
                      </div>
                    ))}
                    {processes.filter(p => p.track === track.name).length === 0 && (
                      <div className="text-gray-600 text-sm">Drop processes here...</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Gantt Chart Visualization */}
            {ganttChart.length > 0 && (
              <div className="mt-6 bg-gray-900 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-bold mb-4">📊 Gantt Chart (Last 10)</h3>
                <div className="space-y-2">
                  {ganttChart.slice(-10).map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="text-gray-400 text-sm w-16">{entry.id}</div>
                      <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${
                            entry.track === 'FCFS' ? 'from-blue-500 to-blue-600' :
                            entry.track === 'SJF' ? 'from-green-500 to-green-600' :
                            entry.track === 'RR' ? 'from-purple-500 to-purple-600' :
                            'from-orange-500 to-orange-600'
                          }`}
                          style={{ width: `${Math.min(100, entry.duration * 10)}%` }}
                        />
                      </div>
                      <div className="text-gray-400 text-sm">{entry.track}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Over Modal */}
        {gameStatus === 'gameover' && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl p-10 border-4 border-red-500 text-center max-w-md">
              <div className="text-7xl mb-4">💥</div>
              <div className="text-4xl text-red-400 font-bold mb-3">CPU OVERLOAD!</div>
              <div className="text-gray-300 mb-6">Too many unscheduled processes</div>
              <div className="text-3xl text-white font-bold mb-2">Final Score: {Math.floor(score)}</div>
              <div className="text-gray-400 mb-2">Time Survived: {time}s</div>
              <div className="text-gray-400 mb-6">Avg Waiting Time: {waitingTime.toFixed(1)}s</div>
              {achievements.length > 0 && (
                <div className="mb-6">
                  <div className="text-yellow-400 font-bold mb-2">🏆 Achievements</div>
                  {achievements.map(ach => (
                    <div key={ach} className="text-green-400">Zero Starvation Master</div>
                  ))}
                </div>
              )}
              <button 
                onClick={startGame}
                className="px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 rounded-xl font-bold text-lg transition-all hover:scale-105"
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
