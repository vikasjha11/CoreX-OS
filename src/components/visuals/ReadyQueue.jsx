import React, { useState, useEffect, useRef } from 'react'
import { useSimulation } from '../../state/simulationStore.js'

const palette = [
  '#6366f1','#ec4899','#10b981','#f59e0b',
  '#06b6d4','#a855f7','#ef4444','#84cc16'
]

export default function ReadyQueue(){
  const processes = useSimulation(s=>s.processes) || []
  const readyQueue = useSimulation(s=>s.readyQueue) || []
  const scheduling = useSimulation(s=>s.scheduling) || { algorithm: 'FCFS', timeline: [] }
  const timeline = scheduling.timeline || []
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentStep, setCurrentStep] = useState(0)
  const intervalRef = useRef(null)

  // Sort processes by execution order based on algorithm
  const getExecutionOrder = () => {
    if (!processes.length) return []
    const sorted = [...processes]
    
    switch(scheduling.algorithm) {
      case 'SJF':
        return sorted.sort((a, b) => a.burst - b.burst)
      case 'PRIORITY':
        return sorted.sort((a, b) => a.priority - b.priority)
      case 'FCFS':
      case 'RR':
      case 'MLQ':
      default:
        return sorted
    }
  }

  const orderedProcesses = getExecutionOrder()
  
  const readyProcesses = readyQueue
    .map(id => {
      const proc = processes.find(p => p.id === id)
      if (!proc) return null
      const executionOrder = orderedProcesses.findIndex(p => p.id === id) + 1
      return { ...proc, executionOrder }
    })
    .filter(Boolean)

  // Playback effect
  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= timeline.length) {
            setIsPlaying(false)
            return timeline.length
          }
          return prev + 1
        })
      }, 1000 / playbackSpeed)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, playbackSpeed, timeline.length])

  // Reset when timeline changes
  useEffect(() => {
    setCurrentStep(0)
    setIsPlaying(false)
  }, [timeline.length])

  if(!readyProcesses.length){
    return (
      <div className="border border-white/15 rounded-xl p-5 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-lg">
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⏳</span>
          <h3 className="font-semibold text-sm">Ready Queue</h3>
        </div>
        <p className="text-xs text-gray-400 text-center py-8" style={{animation: 'pulse 2s ease-in-out infinite'}}>
          No processes in ready queue
        </p>
      </div>
    )
  }

  return (
    <div className="border border-white/15 rounded-xl p-5 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-lg">
      <style>{`
        @keyframes slideInQueue {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes chipHover {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes queuePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }
      `}</style>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            <h3 className="font-semibold text-sm">Ready Queue</h3>
            <span className="text-[10px] px-2 py-1 bg-indigo-600/30 text-indigo-300 rounded-md font-medium">
              {scheduling.algorithm}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {readyProcesses.length} {readyProcesses.length === 1 ? 'process' : 'processes'}
          </span>
        </div>
        
        {/* Playback Controls */}
        {timeline.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
              title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button
              onClick={() => setCurrentStep(0)}
              className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95"
              title="Reset">
              ⏮️
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-200 hover:scale-105 ${
                    playbackSpeed === speed
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}>
                  {speed}x
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Step:</span>
              <span className="text-xs font-bold text-indigo-300">{currentStep}/{timeline.length}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {readyProcesses.map((proc, i) => {
          const color = palette[i % palette.length]
          return (
            <div
              key={proc.id}
              className="group relative flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer border border-white/10 hover:border-white/20"
              style={{
                background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                animation: `slideInQueue 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.08}s both`
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                      animation: 'queuePulse 2s ease-in-out infinite'
                    }}
                  >
                    {i + 1}
                  </div>
                  {proc.executionOrder && (
                    <div 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-[8px] font-bold text-white shadow-md border border-white/30"
                      title={`Will execute ${proc.executionOrder}${proc.executionOrder === 1 ? 'st' : proc.executionOrder === 2 ? 'nd' : proc.executionOrder === 3 ? 'rd' : 'th'}`}
                    >
                      {proc.executionOrder}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm" style={{color}}>{proc.name}</span>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      ⏱️ <span className="font-medium">{proc.burst}ms</span>
                    </span>
                    <span className="flex items-center gap-1">
                      ⭐ <span className="font-medium">P{proc.priority}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      💾 <span className="font-medium">{proc.memory}KB</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-gray-300 font-medium border border-white/10">
                  {proc.state}
                </div>
                {scheduling.algorithm === 'RR' && (
                  <div className="px-2 py-1 rounded-md bg-indigo-600/20 text-[10px] text-indigo-300 font-medium border border-indigo-400/20">
                    Q: {scheduling.quantum}
                  </div>
                )}
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
