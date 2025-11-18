import React, { useState, useMemo } from 'react'
import { scheduleFCFS, scheduleSJF, schedulePriority, scheduleRR } from '../../core/scheduling/algorithms.js'

const algMap = { FCFS: scheduleFCFS, SJF: scheduleSJF, PRIORITY: schedulePriority, RR: scheduleRR }
const palette = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#a855f7','#ef4444','#0ea5e9']

export default function ComparisonView({ processes, quantum = 4 }){
  const [algo1, setAlgo1] = useState('FCFS')
  const [algo2, setAlgo2] = useState('SJF')
  const algos = ['FCFS', 'SJF', 'PRIORITY', 'RR']

  const result1 = useMemo(() => {
    if (!processes.length) return null
    try {
      const fn = algMap[algo1]
      return fn ? fn(processes, quantum) : null
    } catch (e) {
      return null
    }
  }, [processes, algo1, quantum])

  const result2 = useMemo(() => {
    if (!processes.length) return null
    try {
      const fn = algMap[algo2]
      return fn ? fn(processes, quantum) : null
    } catch (e) {
      return null
    }
  }, [processes, algo2, quantum])

  const renderGantt = (timeline, algorithm) => {
    if (!timeline || !timeline.length) {
      return <div className="text-xs text-gray-500 text-center py-8">No data</div>
    }

    const totalTime = Math.max(...timeline.map(s => s.end || s.start + s.duration))
    const colorMap = {}
    let ci = 0

    return (
      <div className="space-y-3">
        <div className="h-12 w-full rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden relative flex shadow-md">
          {timeline.map((seg, i) => {
            const label = seg.name || seg.pid || seg.id || `P${i+1}`
            if (!colorMap[label]) {
              colorMap[label] = palette[ci % palette.length]
              ci++
            }
            const color = colorMap[label]
            const start = seg.start || 0
            const end = seg.end || start + seg.duration
            const duration = end - start
            const widthPct = totalTime ? (duration / totalTime) * 100 : 0

            return (
              <div
                key={i}
                className="h-full relative flex flex-col items-center justify-center group cursor-pointer transition-all duration-200 hover:scale-y-105"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                }}
                title={`${label}: ${duration}ms (${start}-${end})`}>
                <span className="text-[10px] font-bold text-white truncate drop-shadow">
                  {label}
                </span>
                <span className="text-[8px] text-white/80">{duration}ms</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between text-[9px] text-gray-400">
          <span>0ms</span>
          <span className="font-semibold text-indigo-300">Total: {totalTime}ms</span>
        </div>
      </div>
    )
  }

  const renderMetrics = (metrics) => {
    if (!metrics) return null
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <div className="text-[9px] text-gray-400 mb-0.5">Avg Wait</div>
          <div className="font-bold text-white">{metrics.avgWaiting}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <div className="text-[9px] text-gray-400 mb-0.5">Avg Turn</div>
          <div className="font-bold text-white">{metrics.avgTurnaround}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <div className="text-[9px] text-gray-400 mb-0.5">CPU Util</div>
          <div className="font-bold text-white">{metrics.cpuUtilization}%</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <div className="text-[9px] text-gray-400 mb-0.5">Total Time</div>
          <div className="font-bold text-white">{metrics.totalTime}</div>
        </div>
      </div>
    )
  }

  const getWinner = () => {
    if (!result1?.metrics || !result2?.metrics) return null
    const m1 = result1.metrics
    const m2 = result2.metrics
    
    let score1 = 0
    let score2 = 0
    
    if (m1.avgWaiting < m2.avgWaiting) score1++
    else if (m2.avgWaiting < m1.avgWaiting) score2++
    
    if (m1.avgTurnaround < m2.avgTurnaround) score1++
    else if (m2.avgTurnaround < m1.avgTurnaround) score2++
    
    if (m1.cpuUtilization > m2.cpuUtilization) score1++
    else if (m2.cpuUtilization > m1.cpuUtilization) score2++
    
    if (score1 > score2) return algo1
    if (score2 > score1) return algo2
    return 'TIE'
  }

  const winner = getWinner()

  if (!processes || !processes.length) {
    return (
      <div className="border border-white/15 rounded-xl p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⚖️</span>
          <h3 className="font-semibold text-sm">Algorithm Comparison</h3>
        </div>
        <p className="text-xs text-gray-400 text-center py-8">
          Add processes to compare scheduling algorithms
        </p>
      </div>
    )
  }

  return (
    <div className="border border-white/15 rounded-xl p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-lg space-y-5">
      <style>{`
        @keyframes compareSlide {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes winnerGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.6); }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚖️</span>
          <h3 className="font-semibold text-sm">Algorithm Comparison</h3>
        </div>
        {winner && (
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 text-xs font-semibold text-green-300" style={{animation: 'winnerGlow 2s ease-in-out infinite'}}>
            {winner === 'TIE' ? '🤝 Tie' : `🏆 ${winner} Wins`}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Algorithm 1 */}
        <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${winner === algo1 ? 'border-green-500/50 bg-green-600/5' : 'border-white/10 bg-white/5'}`} style={{animation: 'compareSlide 0.4s cubic-bezier(0.22, 1, 0.36, 1)'}}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-indigo-300">Algorithm 1</h4>
            {winner === algo1 && <span className="text-lg">👑</span>}
          </div>
          
          <select
            value={algo1}
            onChange={(e) => setAlgo1(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-xs font-medium focus:border-indigo-400 focus:outline-none transition-colors">
            {algos.map(a => (
              <option key={a} value={a} disabled={a === algo2}>{a}</option>
            ))}
          </select>

          <div>
            <h5 className="text-[10px] text-gray-400 mb-2 font-medium">Gantt Chart</h5>
            {renderGantt(result1?.timeline, algo1)}
          </div>

          <div>
            <h5 className="text-[10px] text-gray-400 mb-2 font-medium">Metrics</h5>
            {renderMetrics(result1?.metrics)}
          </div>
        </div>

        {/* Algorithm 2 */}
        <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${winner === algo2 ? 'border-green-500/50 bg-green-600/5' : 'border-white/10 bg-white/5'}`} style={{animation: 'compareSlide 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both'}}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-purple-300">Algorithm 2</h4>
            {winner === algo2 && <span className="text-lg">👑</span>}
          </div>
          
          <select
            value={algo2}
            onChange={(e) => setAlgo2(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-xs font-medium focus:border-purple-400 focus:outline-none transition-colors">
            {algos.map(a => (
              <option key={a} value={a} disabled={a === algo1}>{a}</option>
            ))}
          </select>

          <div>
            <h5 className="text-[10px] text-gray-400 mb-2 font-medium">Gantt Chart</h5>
            {renderGantt(result2?.timeline, algo2)}
          </div>

          <div>
            <h5 className="text-[10px] text-gray-400 mb-2 font-medium">Metrics</h5>
            {renderMetrics(result2?.metrics)}
          </div>
        </div>
      </div>

      {/* Comparison Summary */}
      {result1?.metrics && result2?.metrics && (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h5 className="text-xs font-semibold text-gray-300 mb-3">Detailed Comparison</h5>
          <div className="grid grid-cols-3 gap-3 text-[10px]">
            <div className="text-gray-400 font-medium">Metric</div>
            <div className="text-indigo-300 font-semibold text-center">{algo1}</div>
            <div className="text-purple-300 font-semibold text-center">{algo2}</div>
            
            <div className="text-gray-400">Avg Wait Time</div>
            <div className={`text-center font-bold ${result1.metrics.avgWaiting < result2.metrics.avgWaiting ? 'text-green-400' : 'text-white'}`}>
              {result1.metrics.avgWaiting} {result1.metrics.avgWaiting < result2.metrics.avgWaiting && '✓'}
            </div>
            <div className={`text-center font-bold ${result2.metrics.avgWaiting < result1.metrics.avgWaiting ? 'text-green-400' : 'text-white'}`}>
              {result2.metrics.avgWaiting} {result2.metrics.avgWaiting < result1.metrics.avgWaiting && '✓'}
            </div>
            
            <div className="text-gray-400">Avg Turnaround</div>
            <div className={`text-center font-bold ${result1.metrics.avgTurnaround < result2.metrics.avgTurnaround ? 'text-green-400' : 'text-white'}`}>
              {result1.metrics.avgTurnaround} {result1.metrics.avgTurnaround < result2.metrics.avgTurnaround && '✓'}
            </div>
            <div className={`text-center font-bold ${result2.metrics.avgTurnaround < result1.metrics.avgTurnaround ? 'text-green-400' : 'text-white'}`}>
              {result2.metrics.avgTurnaround} {result2.metrics.avgTurnaround < result1.metrics.avgTurnaround && '✓'}
            </div>
            
            <div className="text-gray-400">CPU Utilization</div>
            <div className={`text-center font-bold ${result1.metrics.cpuUtilization > result2.metrics.cpuUtilization ? 'text-green-400' : 'text-white'}`}>
              {result1.metrics.cpuUtilization}% {result1.metrics.cpuUtilization > result2.metrics.cpuUtilization && '✓'}
            </div>
            <div className={`text-center font-bold ${result2.metrics.cpuUtilization > result1.metrics.cpuUtilization ? 'text-green-400' : 'text-white'}`}>
              {result2.metrics.cpuUtilization}% {result2.metrics.cpuUtilization > result1.metrics.cpuUtilization && '✓'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
