import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSimulation } from '../../state/simulationStore.js'

const STATES = {
  NEW: { color: '#60a5fa', label: 'New', icon: '○', x: 15, y: 50 },
  READY: { color: '#fbbf24', label: 'Ready', icon: '◐', x: 35, y: 25 },
  RUNNING: { color: '#34d399', label: 'Running', icon: '●', x: 65, y: 25 },
  WAITING: { color: '#fb923c', label: 'Waiting', icon: '◓', x: 65, y: 75 },
  TERMINATED: { color: '#f87171', label: 'Terminated', icon: '✓', x: 85, y: 50 }
}

const TRANSITIONS = [
  { from: 'NEW', to: 'READY', path: 'M 20 48 Q 25 30 32 28', label: 'Admit' },
  { from: 'READY', to: 'RUNNING', path: 'M 38 27 L 60 27', label: 'Dispatch' },
  { from: 'RUNNING', to: 'WAITING', path: 'M 67 30 L 67 70', label: 'I/O Wait' },
  { from: 'WAITING', to: 'READY', path: 'M 62 73 Q 48 60 37 30', label: 'I/O Done' },
  { from: 'RUNNING', to: 'READY', path: 'M 60 24 Q 48 20 38 24', label: 'Preempt' },
  { from: 'RUNNING', to: 'TERMINATED', path: 'M 70 25 Q 77 35 82 48', label: 'Exit' }
]

export default function ProcessCycleSimulation() {
  const processes = useSimulation(s => s.processes) || []
  const scheduling = useSimulation(s => s.scheduling) || { timeline: [], algorithm: 'FCFS', quantum: 4 }
  const timeline = scheduling.timeline || []
  
  const [processStates, setProcessStates] = useState({}) // { pid: 'NEW' | 'READY' | 'RUNNING' | 'WAITING' | 'TERMINATED' }
  const [stateHistory, setStateHistory] = useState({}) // { pid: ['NEW', 'READY', 'RUNNING', ...] }
  const [activeTransition, setActiveTransition] = useState(null)
  const [activeProcesses, setActiveProcesses] = useState({}) // { state: [pids] }
  const [simulationStep, setSimulationStep] = useState(0)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTransitionInfo, setCurrentTransitionInfo] = useState(null) // { pid, processName, from, to }
  const [simulationSpeed, setSimulationSpeed] = useState(1) // 0.5x, 0.75x, 1x, 1.5x, 2x
  const [timelineProgress, setTimelineProgress] = useState(0) // 0-100%
  const [animationFrame, setAnimationFrame] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  
  const pausedRef = useRef(false)
  const speedRef = useRef(1)
  const animationRef = useRef(null)
  // Multiplier to slow down timings so transitions are easier to follow.
  // Increase this to make animations slower (e.g., 3 => three times slower).
  // Updated to 3.0 to make transitions more human-readable.
  const BASE_DELAY_MULTIPLIER = 3.0
  
  // Keep refs in sync with state
  useEffect(() => {
    pausedRef.current = isPaused
  }, [isPaused])
  
  useEffect(() => {
    speedRef.current = simulationSpeed
  }, [simulationSpeed])

  // (Removed) earlier attempt to call runSimulation from outer scope.
  // The main simulation effect below is gated by `hasStarted` so
  // starting is controlled from `handleStart`.

  // Initialize process states when processes are added
  useEffect(() => {
    const newStates = { ...processStates }
    const newHistory = { ...stateHistory }
    let hasChanges = false

    processes.forEach(p => {
      if (!newStates[p.id]) {
        newStates[p.id] = 'NEW'
        newHistory[p.id] = ['NEW']
        hasChanges = true
      }
    })

    // Remove states for deleted processes
    Object.keys(newStates).forEach(pid => {
      if (!processes.find(p => p.id === pid)) {
        delete newStates[pid]
        delete newHistory[pid]
        hasChanges = true
      }
    })

    if (hasChanges) {
      setProcessStates(newStates)
      setStateHistory(newHistory)
    }
  }, [processes.length])

  // Simulate state transitions based on timeline (only when started)
  useEffect(() => {
    if (!timeline.length || isSimulating || !hasStarted) return

    const runSimulation = async () => {
      setIsSimulating(true)
      setIsPlaying(true)
      const newStates = {}
      const newHistory = {}
      const processStartTimes = {}
      const processIOEvents = {} // Track I/O events

      // Initialize all processes to NEW
      processes.forEach(p => {
        newStates[p.id] = 'NEW'
        newHistory[p.id] = ['NEW']
      })

      // Move all to READY first (scheduling preparation)
      await sleep(300 * BASE_DELAY_MULTIPLIER / speedRef.current)
      processes.forEach(p => {
        transitionProcess(p.id, 'NEW', 'READY', newStates, newHistory)
      })
      setProcessStates({ ...newStates })
      setStateHistory({ ...newHistory })

      // Simulate timeline
      for (let i = 0; i < timeline.length; i++) {
        // Update progress
        setTimelineProgress(Math.round((i / timeline.length) * 100))
        setAnimationFrame(i)
        
        // Check for pause
        while (pausedRef.current) {
          await sleep(100)
        }
        const seg = timeline[i]
        const pid = seg.pid || seg.name

        if (!pid || !processes.find(p => p.id === pid || p.name === pid)) continue

        const actualPid = processes.find(p => p.id === pid || p.name === pid)?.id
        if (!actualPid) continue

        // READY -> RUNNING
        if (newStates[actualPid] !== 'RUNNING') {
          transitionProcess(actualPid, newStates[actualPid], 'RUNNING', newStates, newHistory)
          setProcessStates({ ...newStates })
          setStateHistory({ ...newHistory })
          await sleep(400 * BASE_DELAY_MULTIPLIER / speedRef.current)
        }

        processStartTimes[actualPid] = (processStartTimes[actualPid] || 0) + seg.duration

        // Simulate I/O event (30% chance during execution)
        const shouldSimulateIO = Math.random() > 0.7 && seg.duration > 5 && !processIOEvents[actualPid]
        if (shouldSimulateIO) {
          processIOEvents[actualPid] = true
          // RUNNING -> WAITING
          transitionProcess(actualPid, 'RUNNING', 'WAITING', newStates, newHistory)
          setProcessStates({ ...newStates })
          setStateHistory({ ...newHistory })
          await sleep(500 * BASE_DELAY_MULTIPLIER / speedRef.current)

          // WAITING -> READY
          transitionProcess(actualPid, 'WAITING', 'READY', newStates, newHistory)
          setProcessStates({ ...newStates })
          setStateHistory({ ...newHistory })
          await sleep(400 * BASE_DELAY_MULTIPLIER / speedRef.current)

          // READY -> RUNNING
          transitionProcess(actualPid, 'READY', 'RUNNING', newStates, newHistory)
          setProcessStates({ ...newStates })
          setStateHistory({ ...newHistory })
          await sleep(300 * BASE_DELAY_MULTIPLIER / speedRef.current)
        }

        // For Round Robin, simulate quantum preemption
        if (scheduling.algorithm === 'RR' && i < timeline.length - 1) {
          const nextSeg = timeline[i + 1]
          const nextPid = processes.find(p => p.id === nextSeg.pid || p.name === nextSeg.name)?.id
          
          if (nextPid && nextPid !== actualPid && newStates[actualPid] === 'RUNNING') {
            // RUNNING -> READY (preemption)
            transitionProcess(actualPid, 'RUNNING', 'READY', newStates, newHistory)
            setProcessStates({ ...newStates })
            setStateHistory({ ...newHistory })
            await sleep(300 * BASE_DELAY_MULTIPLIER / speedRef.current)
          }
        }

        // Check if process completed (last occurrence in timeline)
        const remainingSegments = timeline.slice(i + 1)
        const appearsAgain = remainingSegments.some(s => {
          const sPid = processes.find(p => p.id === s.pid || p.name === s.name)?.id
          return sPid === actualPid
        })

        if (!appearsAgain && newStates[actualPid] === 'RUNNING') {
          // RUNNING -> TERMINATED
          transitionProcess(actualPid, 'RUNNING', 'TERMINATED', newStates, newHistory)
          setProcessStates({ ...newStates })
          setStateHistory({ ...newHistory })
          await sleep(500 * BASE_DELAY_MULTIPLIER / speedRef.current)
        }
      }

      setIsSimulating(false)
      setIsPlaying(false)
      setTimelineProgress(100)
    }

    runSimulation()
  }, [timeline.length, scheduling.algorithm, hasStarted])

  const transitionProcess = (pid, fromState, toState, states, history) => {
    const proc = processes.find(p => p.id === pid)
    states[pid] = toState
    if (!history[pid].includes(toState)) {
      history[pid] = [...history[pid], toState]
    }
    setActiveTransition({ from: fromState, to: toState, pid })
    setCurrentTransitionInfo({
      pid,
      processName: proc?.name || `P${pid}`,
      from: fromState,
      to: toState
    })
    setTimeout(() => {
      setActiveTransition(null)
      setCurrentTransitionInfo(null)
    }, 800 * BASE_DELAY_MULTIPLIER / speedRef.current)
  }

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const handleRestart = () => {
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    // Reset all states
    const newStates = {}
    const newHistory = {}
    processes.forEach(p => {
      newStates[p.id] = 'NEW'
      newHistory[p.id] = ['NEW']
    })
    
    setProcessStates(newStates)
    setStateHistory(newHistory)
    setActiveTransition(null)
    setCurrentTransitionInfo(null)
    setIsSimulating(false)
    setIsPlaying(false)
    setIsPaused(false)
    setHasStarted(false)
    setTimelineProgress(0)
    setAnimationFrame(0)
    pausedRef.current = false
  }

  const handleStart = () => {
    // Reset to initial state and begin simulation from start
    if (!processes.length) return

    // Reset states/history
    const newStates = {}
    const newHistory = {}
    processes.forEach(p => {
      newStates[p.id] = 'NEW'
      newHistory[p.id] = ['NEW']
    })
    setProcessStates(newStates)
    setStateHistory(newHistory)
    setActiveTransition(null)
    setCurrentTransitionInfo(null)
    setTimelineProgress(0)
    setAnimationFrame(0)
    pausedRef.current = false
    setIsPaused(false)
    setIsPlaying(true)
    setHasStarted(true)
  }

  // Group processes by current state
  const processesByState = useMemo(() => {
    const grouped = {
      NEW: [],
      READY: [],
      RUNNING: [],
      WAITING: [],
      TERMINATED: []
    }

    Object.entries(processStates).forEach(([pid, state]) => {
      const proc = processes.find(p => p.id === pid)
      if (proc) {
        grouped[state].push(proc)
      }
    })

    return grouped
  }, [processStates, processes])

  if (!processes.length) {
    return (
      <div className="border border-white/15 rounded-xl p-5 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🔄</span>
          <h3 className="font-semibold text-sm">Process State Cycle</h3>
        </div>
        <p className="text-xs text-gray-400 text-center py-8">
          Add processes to visualize the state cycle
        </p>
      </div>
    )
  }

  return (
    <div className="border border-white/15 rounded-xl p-3 bg-gradient-to-br from-slate-900/40 to-slate-800/20 backdrop-blur-sm shadow-xl space-y-3">
      <style>{`
        @keyframes stateGlow {
          0%, 100% { 
            box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
            opacity: 0.9;
          }
          50% { 
            box-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
            opacity: 1;
          }
        }
        @keyframes arrowFlow {
          0% { stroke-dashoffset: 10; opacity: 0.6; }
          50% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.6; }
        }
        @keyframes processBadge {
          from { 
            transform: scale(0.8) translateY(5px); 
            opacity: 0; 
          }
          to { 
            transform: scale(1) translateY(0); 
            opacity: 1; 
          }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nodeHighlight {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes badgeSlide {
          from { 
            transform: translateX(-10px) scale(0.9); 
            opacity: 0; 
          }
          to { 
            transform: translateX(0) scale(1); 
            opacity: 1; 
          }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
          }
          50% { 
            box-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor;
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <span className="text-base">🔄</span>
          </div>
          <div>
            <h3 className="font-semibold text-xs tracking-tight">Process State Cycle</h3>
            <p className="text-[8px] text-gray-400">Interactive lifecycle visualization</p>
          </div>
        </div>
      </div>

      {/* Interactive Animation Control Panel */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-md rounded-lg p-2 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Main Controls */}
          <div className="flex items-center gap-1">
            {!hasStarted ? (
              <button
                onClick={handleStart}
                disabled={!processes.length}
                className="group relative px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:hover:scale-100"
                title="Start animation from beginning">
                <span className="flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3 2l10 6-10 6V2z"/>
                  </svg>
                  <span>Start</span>
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!isSimulating && !isPlaying) {
                    return
                  }
                  setIsPaused(!isPaused)
                }}
                disabled={!processes.length || (!isSimulating && !isPlaying)}
                className={`group relative px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPaused
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm shadow-green-500/30'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm shadow-blue-500/30'
                } hover:scale-105 active:scale-95 disabled:hover:scale-100`}
                title={isPaused ? 'Resume animation' : 'Pause animation'}>
                <span className="flex items-center gap-1">
                  {isPaused ? (
                    <>
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3 2l10 6-10 6V2z"/>
                      </svg>
                      <span>Play</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2 2h4v12H2V2zm8 0h4v12h-4V2z"/>
                      </svg>
                      <span>Pause</span>
                    </>
                  )}
                </span>
              </button>
            )}

            <button
              onClick={handleRestart}
              disabled={!processes.length}
              className="group relative px-2 py-1 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-[10px] font-semibold shadow-sm shadow-purple-500/30 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Restart animation">
              <span className="flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Restart</span>
              </span>
            </button>
          </div>

          {/* Center: Timeline Progress */}
          <div className="flex-1 max-w-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-medium text-gray-400 whitespace-nowrap">Timeline</span>
              <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                  style={{ width: `${timelineProgress}%` }}
                >
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-blue-400 min-w-[3ch]">{timelineProgress}%</span>
            </div>
          </div>

          {/* Right: Speed Controls */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">Speed</span>
            <div className="flex items-center gap-0.5 bg-black/30 backdrop-blur-sm border border-white/10 rounded-md p-0.5">
              {[0.5, 0.75, 1, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setSimulationSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all duration-200 ${
                    simulationSpeed === speed
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm shadow-cyan-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={`${speed}x speed`}>
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {(isPlaying || isPaused) && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {isPlaying && !isPaused && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50"></div>
                    <span className="text-[9px] font-medium text-green-400">Running</span>
                  </>
                )}
                {isPaused && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></div>
                    <span className="text-[9px] font-medium text-amber-400">Paused</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-[9px] text-gray-400">
                <span>Frame:</span>
                <span className="font-mono font-bold text-purple-400">{animationFrame}/{timeline.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transition Info Banner - Only show when active */}
      {currentTransitionInfo && (
        <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-400/30 rounded-lg p-2 shadow-md backdrop-blur-sm animate-pulse">
          <div className="flex items-center justify-center gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                <span className="text-[8px] font-mono font-bold text-purple-300">{currentTransitionInfo.processName}</span>
              </div>
              <span className="text-[9px] text-gray-300 font-medium">→</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-1.5 py-0.5 rounded text-[9px] font-semibold shadow-sm flex items-center gap-1"
                style={{ 
                  backgroundColor: STATES[currentTransitionInfo.from].color + '20',
                  borderLeft: `2px solid ${STATES[currentTransitionInfo.from].color}`,
                  color: STATES[currentTransitionInfo.from].color 
                }}>
                <span className="text-xs">{STATES[currentTransitionInfo.from].icon}</span>
                <span>{STATES[currentTransitionInfo.from].label}</span>
              </div>
              <span className="text-gray-400">→</span>
              <div className="px-1.5 py-0.5 rounded text-[9px] font-semibold shadow-sm flex items-center gap-1"
                style={{ 
                  backgroundColor: STATES[currentTransitionInfo.to].color + '20',
                  borderLeft: `2px solid ${STATES[currentTransitionInfo.to].color}`,
                  color: STATES[currentTransitionInfo.to].color 
                }}>
                <span className="text-xs">{STATES[currentTransitionInfo.to].icon}</span>
                <span>{STATES[currentTransitionInfo.to].label}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Vertical Layout */}
      <div className="grid grid-cols-3 gap-3 items-start">
        {/* State Diagram */}
        <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-lg p-3 border border-white/10 shadow-lg backdrop-blur-sm min-h-[220px]">
          <svg viewBox="0 0 100 100" className="w-full" style={{ minHeight: '180px' }}>
          {/* Arrows */}
          {TRANSITIONS.map((trans, i) => {
            const isActive = activeTransition?.from === trans.from && activeTransition?.to === trans.to
            return (
              <g key={i}>
                {/* Background arrow */}
                <path
                  d={trans.path}
                  fill="none"
                  stroke="#ffffff15"
                  strokeWidth="0.4"
                  markerEnd={`url(#arrow-${trans.to})`}
                  strokeLinecap="round"
                />
                {/* Active animated arrow overlay */}
                {isActive && (
                  <>
                    <path
                      d={trans.path}
                      fill="none"
                      stroke={STATES[trans.to].color}
                      strokeWidth="1.2"
                      strokeDasharray="3,2"
                      markerEnd={`url(#arrow-${trans.to}-active)`}
                      strokeLinecap="round"
                      style={{
                        animation: `arrowFlow ${1.5 * BASE_DELAY_MULTIPLIER / (simulationSpeed || 1)}s cubic-bezier(.22,1,.36,1) infinite`,
                        filter: `drop-shadow(0 0 6px ${STATES[trans.to].color})`
                      }}
                    />
                  </>
                )}
              </g>
            )
          })}

          {/* Arrow markers */}
          <defs>
            {Object.entries(STATES).map(([key, state]) => (
              <React.Fragment key={key}>
                <marker
                  id={`arrow-${key}`}
                  markerWidth="6"
                  markerHeight="6"
                  refX="4"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 6 3, 0 6" fill="#ffffff15" />
                </marker>
                <marker
                  id={`arrow-${key}-active`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="5"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" fill={state.color} />
                </marker>
              </React.Fragment>
            ))}
          </defs>

          {/* State Nodes */}
          {Object.entries(STATES).map(([key, state]) => {
            const hasProcesses = processesByState[key]?.length > 0
            const isActiveState = activeTransition?.to === key || activeTransition?.from === key
            const isTransitionTarget = activeTransition?.to === key
            return (
              <g key={key}>
                {/* Outer glow ring for active transitions */}
                {isActiveState && (
                  <circle
                    cx={state.x}
                    cy={state.y}
                    r="10"
                    fill="none"
                    stroke={state.color}
                    strokeWidth="0.5"
                    opacity="0.4"
                    style={{
                        animation: `stateGlow ${1.2 * BASE_DELAY_MULTIPLIER / (simulationSpeed || 1)}s cubic-bezier(.22,1,.36,1) infinite`
                      }}
                  />
                )}
                
                {/* Node background circle */}
                <circle
                  cx={state.x}
                  cy={state.y}
                  r="7"
                  fill={hasProcesses || isActiveState ? state.color + '30' : '#ffffff08'}
                  stroke={state.color}
                  strokeWidth={isActiveState ? '0.8' : '0.4'}
                  opacity={hasProcesses || isActiveState ? 1 : 0.4}
                    style={{
                    transition: `transform ${0.4 * BASE_DELAY_MULTIPLIER}s cubic-bezier(0.4, 0, 0.2, 1), filter ${0.4 * BASE_DELAY_MULTIPLIER}s`,
                    filter: isTransitionTarget ? `drop-shadow(0 0 8px ${state.color})` : 'none',
                    animation: isActiveState ? `nodeHighlight ${1.0 * BASE_DELAY_MULTIPLIER / (simulationSpeed || 1)}s cubic-bezier(.22,1,.36,1) infinite` : 'none'
                  }}
                />
                
                {/* Icon */}
                <text
                  x={state.x}
                  y={state.y + 1.5}
                  textAnchor="middle"
                  fontSize="5"
                  fill={hasProcesses || isActiveState ? state.color : '#ffffff40'}
                  fontWeight="bold"
                  style={{
                    transition: 'all 0.3s ease'
                  }}
                >
                  {state.icon}
                </text>
                
                {/* Label */}
                <text
                  x={state.x}
                  y={state.y - 10}
                  textAnchor="middle"
                  fontSize="3.5"
                  fill="#ffffff"
                  fontWeight="600"
                  letterSpacing="0.05"
                >
                  {state.label}
                </text>
                
                {/* Process count badge */}
                {hasProcesses && (
                  <>
                    <circle
                      cx={state.x + 5}
                      cy={state.y - 5}
                      r="2.5"
                      fill={state.color}
                      stroke="#0f172a"
                      strokeWidth="0.3"
                    />
                    <text
                      x={state.x + 5}
                      y={state.y - 4}
                      textAnchor="middle"
                      fontSize="2.5"
                      fill="#ffffff"
                      fontWeight="bold"
                    >
                      {processesByState[key].length}
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>
        </div>

        {/* State Transition Timeline */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-lg p-3 border border-white/10 shadow-lg backdrop-blur-sm min-h-[220px]">
          <h4 className="text-[10px] font-semibold text-gray-200 flex items-center gap-1.5 mb-2">
            <span>📊</span> State Transition Timeline
          </h4>
          <div className="h-full overflow-auto bg-black/30 rounded-md p-2 space-y-1 custom-scrollbar">
          {Object.entries(stateHistory)
            .filter(([pid]) => processes.find(p => p.id === pid))
            .map(([pid, history]) => {
              const proc = processes.find(p => p.id === pid)
              return (
                <div key={pid} className="flex items-center gap-2 text-[10px]" style={{ animation: `fadeInUp ${0.3 * BASE_DELAY_MULTIPLIER / (simulationSpeed || 1)}s ease-out` }}>
                  <span className="font-bold text-indigo-300 min-w-[40px]">{proc?.name}:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {history.map((state, i) => (
                      <React.Fragment key={i}>
                        <span
                          className="px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: STATES[state].color + '30',
                            color: STATES[state].color,
                            border: `1px solid ${STATES[state].color}60`
                          }}
                        >
                          {STATES[state].label}
                        </span>
                        {i < history.length - 1 && (
                          <span className="text-gray-500">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Process State Summary */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-lg p-3 border border-white/10 shadow-lg backdrop-blur-sm space-y-2 min-h-[220px] overflow-auto">
          <h4 className="text-[10px] font-semibold text-gray-200 flex items-center gap-1.5">
            <span>📦</span> Process States
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {['NEW', 'READY', 'RUNNING'].map((key) => {
              const state = STATES[key]
              const procs = processesByState[key] || []
              const isActive = procs.length > 0
              return (
                <div
                  key={key}
                  className={`relative rounded-md p-1.5 border transition-all duration-300 hover:scale-105 ${
                    isActive 
                      ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 shadow-sm' 
                      : 'bg-white/5 border-white/10'
                  }`}
                  style={{ 
                    borderLeftWidth: '2px',
                    borderLeftColor: isActive ? state.color : 'transparent'
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{ 
                          backgroundColor: state.color + '20',
                          color: state.color
                        }}>
                        {state.icon}
                      </div>
                      <span className="text-[8px] font-semibold text-gray-200">{state.label}</span>
                    </div>
                    <span 
                      className="text-[10px] font-bold px-1 rounded"
                      style={{
                        backgroundColor: state.color + '20',
                        color: state.color
                      }}>
                      {procs.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {procs.slice(0, 3).map((p, idx) => {
                      const isTransitioning = currentTransitionInfo?.pid === p.id
                      return (
                        <span
                          key={p.id}
                          className={`text-[8px] px-1 py-0.5 rounded font-semibold text-white transition-all ${
                            isTransitioning ? 'ring-1 ring-white scale-105' : ''
                          }`}
                          style={{
                            backgroundColor: state.color + '30',
                            border: `1px solid ${state.color}`
                          }}>
                          {p.name}
                        </span>
                      )
                    })}
                    {procs.length > 3 && (
                      <span className="text-[8px] text-gray-400">+{procs.length - 3}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {['WAITING', 'TERMINATED'].map((key) => {
              const state = STATES[key]
              const procs = processesByState[key] || []
              const isActive = procs.length > 0
              return (
                <div
                  key={key}
                  className={`relative rounded-md p-1.5 border transition-all duration-300 hover:scale-105 ${
                    isActive 
                      ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 shadow-sm' 
                      : 'bg-white/5 border-white/10'
                  }`}
                  style={{ 
                    borderLeftWidth: '2px',
                    borderLeftColor: isActive ? state.color : 'transparent'
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{ 
                          backgroundColor: state.color + '20',
                          color: state.color
                        }}>
                        {state.icon}
                      </div>
                      <span className="text-[8px] font-semibold text-gray-200">{state.label}</span>
                    </div>
                    <span 
                      className="text-[10px] font-bold px-1 rounded"
                      style={{
                        backgroundColor: state.color + '20',
                        color: state.color
                      }}>
                      {procs.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {procs.slice(0, 3).map((p, idx) => {
                      const isTransitioning = currentTransitionInfo?.pid === p.id
                      return (
                        <span
                          key={p.id}
                          className={`text-[8px] px-1 py-0.5 rounded font-semibold text-white transition-all ${
                            isTransitioning ? 'ring-1 ring-white scale-105' : ''
                          }`}
                          style={{
                            backgroundColor: state.color + '30',
                            border: `1px solid ${state.color}`
                          }}>
                          {p.name}
                        </span>
                      )
                    })}
                    {procs.length > 3 && (
                      <span className="text-[8px] text-gray-400">+{procs.length - 3}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 pt-1.5 text-[8px] text-gray-400 border-t border-white/10">
        <span className="flex items-center gap-0.5">
          <span>💡</span>
          <span>Auto-updates with scheduler</span>
        </span>
        <span className="text-white/20">•</span>
        <span className="flex items-center gap-0.5">
          <span>🔄</span>
          <span>Shows algorithm behavior</span>
        </span>
      </div>
    </div>
  )
}
