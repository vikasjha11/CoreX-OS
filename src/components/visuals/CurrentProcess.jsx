import React from 'react'
import { useSimulation } from '../../state/simulationStore.js'

export default function CurrentProcess(){
  const scheduling = useSimulation(s=>s.scheduling) || { timeline: [], algorithm: 'FCFS', quantum: 4 }
  const processes = useSimulation(s=>s.processes) || []
  
  // Get the currently running process from timeline (last entry if exists)
  const timeline = scheduling.timeline || []
  const currentSegment = timeline.length > 0 ? timeline[timeline.length - 1] : null
  
  const runningProcess = currentSegment 
    ? processes.find(p => p.id === currentSegment.pid || p.name === currentSegment.name)
    : null

  if(!runningProcess){
    return (
      <div className="border border-white/15 rounded-xl p-5 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-lg">
        <style>{`
          @keyframes cpuIdle {
            0%, 100% { opacity: 0.6; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🖥️</span>
          <h3 className="font-semibold text-sm">CPU Status</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <div 
            className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700/50 to-gray-600/30 flex items-center justify-center text-3xl border-2 border-gray-500/30"
            style={{animation: 'cpuIdle 2s ease-in-out infinite'}}
          >
            💤
          </div>
          <p className="text-xs text-gray-400 font-medium">CPU Idle</p>
        </div>
      </div>
    )
  }

  const progress = currentSegment.duration || runningProcess.burst
  const remaining = currentSegment.duration 
    ? runningProcess.burst - currentSegment.duration 
    : runningProcess.burst

  return (
    <div className="border border-white/15 rounded-xl p-5 bg-gradient-to-br from-indigo-600/10 to-purple-600/5 backdrop-blur-sm shadow-lg border-indigo-400/20">
      <style>{`
        @keyframes cpuActive {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes progressGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.6); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl" style={{animation: 'cpuActive 1.5s ease-in-out infinite'}}>🖥️</span>
        <h3 className="font-semibold text-sm">Running on CPU</h3>
        <div className="ml-auto">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg" style={{animation: 'progressGlow 1.5s ease-in-out infinite'}} />
        </div>
      </div>

      <div className="space-y-4">
        {/* Process Info Card */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg p-4 border border-indigo-400/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                {runningProcess.name || 'P'}
              </div>
              <div>
                <h4 className="font-bold text-base text-indigo-300">{runningProcess.name}</h4>
                <p className="text-[10px] text-gray-400">Process ID: {runningProcess.id}</p>
              </div>
            </div>
            <div className="text-2xl" style={{animation: 'rotate 3s linear infinite'}}>⚙️</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <div className="text-gray-400 text-[10px] mb-1">Burst Time</div>
              <div className="font-bold text-white flex items-center gap-1">
                <span>⏱️</span> {runningProcess.burst}ms
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <div className="text-gray-400 text-[10px] mb-1">Priority</div>
              <div className="font-bold text-white flex items-center gap-1">
                <span>⭐</span> P{runningProcess.priority}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <div className="text-gray-400 text-[10px] mb-1">Memory</div>
              <div className="font-bold text-white flex items-center gap-1">
                <span>💾</span> {runningProcess.memory}KB
              </div>
            </div>
            {scheduling.algorithm === 'RR' && (
              <div className="bg-indigo-600/20 rounded-lg p-2.5 border border-indigo-400/20">
                <div className="text-indigo-300 text-[10px] mb-1">Quantum</div>
                <div className="font-bold text-indigo-200 flex items-center gap-1">
                  <span>🔄</span> {scheduling.quantum}ms
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Execution Progress</span>
            <span className="font-medium text-indigo-300">{Math.round((progress / runningProcess.burst) * 100)}%</span>
          </div>
          <div className="h-2.5 bg-gray-800/50 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 shadow-lg"
              style={{
                width: `${(progress / runningProcess.burst) * 100}%`,
                animation: 'progressGlow 2s ease-in-out infinite'
              }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-green-400 font-medium">✓ Completed: {progress}ms</span>
            <span className="text-yellow-400 font-medium">⏳ Remaining: {remaining}ms</span>
          </div>
        </div>
      </div>
    </div>
  )
}
