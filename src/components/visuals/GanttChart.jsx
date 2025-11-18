import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useSimulation } from '../../state/simulationStore.js'

const palette = [
  '#6366f1','#ec4899','#10b981','#f59e0b',
  '#06b6d4','#a855f7','#ef4444','#0ea5e9'
]

export default function GanttChart(){
  const scheduling = useSimulation(s=>s.scheduling) ?? { timeline: [], algorithm:'FCFS', quantum:4 }
  const processes = useSimulation(s=>s.processes) || []
  const rawTimeline = Array.isArray(scheduling.timeline) ? scheduling.timeline : []
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentStep, setCurrentStep] = useState(rawTimeline.length)
  const intervalRef = useRef(null)

  const procMap = useMemo(()=>{
    const m = {}
    processes.forEach(p=>{ m[p.id] = p.name || p.id })
    return m
  },[processes])

  const timeline = useMemo(()=>{
    return rawTimeline.map((seg,i)=>{
      const start = typeof seg.start==='number' ? seg.start : 0
      const end = typeof seg.end==='number'
        ? seg.end
        : (typeof seg.duration==='number' ? start + seg.duration
           : (typeof seg.burst==='number' ? start + seg.burst : start+1))
      const duration = Math.max(0, end - start)
      const label = seg.name || procMap[seg.pid] || procMap[seg.id] || seg.pid || seg.id || `P${i+1}`
      return { start, end, duration, label }
    }).sort((a,b)=>a.start-b.start)
  },[rawTimeline, procMap])

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
      }, 800 / playbackSpeed)
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
    setCurrentStep(timeline.length)
    setIsPlaying(false)
  }, [timeline.length])

  const visibleTimeline = timeline.slice(0, currentStep)

  const totalTime = timeline.length ? Math.max(...timeline.map(s=>s.end)) : 0

  const ticks = useMemo(()=>{
    if(totalTime<=0) return [0]
    const points = new Set()
    visibleTimeline.forEach(s=>{ points.add(s.start); points.add(s.end) })
    return Array.from(points).sort((a,b)=>a-b)
  },[visibleTimeline, totalTime])

  if(!timeline.length){
    return <div className="text-[11px] text-gray-500">Run scheduler to generate timeline.</div>
  }

  const colorMap = {}
  let ci = 0
  timeline.forEach(s=>{
    if(!colorMap[s.label]){
      colorMap[s.label] = palette[ci % palette.length]
      ci++
    }
  })

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes slideIn {
          from {
            transform: scaleX(0) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scaleX(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
      
      {/* Info Bar with Playback Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] text-gray-400 bg-white/5 px-4 py-2.5 rounded-lg border border-white/10" style={{animation: 'fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)'}}>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <span>🔄</span> {scheduling.algorithm}
            </span>
            {scheduling.algorithm==='RR' && <span className="px-2 py-1 bg-indigo-600/30 text-indigo-300 rounded-md text-[10px] font-medium">Quantum: {scheduling.quantum}</span>}
          </div>
          <span className="font-semibold text-indigo-400">⏰ Total: {totalTime}ms</span>
        </div>
        
        {/* Playback Controls */}
        {timeline.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
              title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button
              onClick={() => setCurrentStep(0)}
              className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95"
              title="Reset">
              ⏮️
            </button>
            <button
              onClick={() => setCurrentStep(timeline.length)}
              className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95"
              title="Show All">
              ⏭️
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-200 hover:scale-105 ${
                    playbackSpeed === speed
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}>
                  {speed}x
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Progress:</span>
              <span className="text-xs font-bold text-green-300">{currentStep}/{timeline.length}</span>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 -top-6 h-5 pointer-events-none">
          {ticks.map(t=>(
            <div
              key={t}
              className="absolute -translate-x-1/2 top-0 flex flex-col items-center"
              style={{ left: `${totalTime? (t/totalTime)*100 : 0}%` }}
            >
              <span className="text-[10px] text-gray-400">{t}</span>
              <span className="w-px flex-1 bg-gray-600/30 mt-0.5" />
            </div>
          ))}
        </div>

        <div className="h-16 w-full rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden relative flex shadow-lg">
          {visibleTimeline.map((seg,i)=>{
            const widthPct = totalTime ? (seg.duration/totalTime)*100 : 0
            return (
              <div
                key={i}
                className="h-full relative flex flex-col items-center justify-center transition-all duration-500 cubic-bezier(0.22, 1, 0.36, 1) hover:scale-y-[1.15] hover:z-10 group cursor-pointer"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(135deg, ${colorMap[seg.label]}, ${colorMap[seg.label]}dd)`,
                  animation: `slideIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.12}s both`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <span className="text-xs font-bold text-white truncate drop-shadow-lg group-hover:scale-125 transition-transform duration-200 z-10">
                  {seg.label}
                </span>
                <span className="text-[9px] text-white/80 mt-0.5 font-medium group-hover:text-white transition-colors duration-200">
                  ⏱️ {seg.duration}ms
                </span>
                <div className="absolute right-0 top-0 h-full w-[2px] bg-white/30 group-hover:bg-white/50 transition-colors" />
                <span className="absolute -bottom-5 right-0 translate-x-1/2 text-[10px] text-gray-400 font-semibold group-hover:text-indigo-400 transition-all duration-200">
                  {seg.end}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 rounded-sm" />
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 pt-2">
        {Object.entries(colorMap).map(([label,col],i)=>(
          <div key={label} className="flex items-center gap-2 text-[11px] text-gray-300 hover:text-white transition-all duration-200 hover:scale-110 cursor-pointer px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20" style={{animation: `fadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${0.7 + i * 0.06}s both`}}>
            <span className="w-3.5 h-3.5 rounded transition-transform duration-200 hover:rotate-45 shadow-md" style={{ background: `linear-gradient(135deg, ${col}, ${col}dd)` }} />
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
