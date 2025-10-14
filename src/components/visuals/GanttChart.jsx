import React, { useMemo } from 'react'
import { useSimulation } from '../../state/simulationStore.js'

const palette = [
  '#6366f1','#ec4899','#10b981','#f59e0b',
  '#06b6d4','#a855f7','#ef4444','#84cc16',
  '#0ea5e9','#d946ef','#f97316','#14b8a6'
]

export default function GanttChart(){
  const scheduling = useSimulation(s=>s.scheduling) ?? { timeline: [], algorithm:'FCFS', quantum:4 }
  const processes = useSimulation(s=>s.processes) || []
  const rawTimeline = Array.isArray(scheduling.timeline) ? scheduling.timeline : []

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

  const totalTime = timeline.length ? Math.max(...timeline.map(s=>s.end)) : 0

  const ticks = useMemo(()=>{
    if(totalTime<=0) return [0]
    const points = new Set()
    timeline.forEach(s=>{ points.add(s.start); points.add(s.end) })
    return Array.from(points).sort((a,b)=>a-b)
  },[timeline, totalTime])

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
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        <span>{scheduling.algorithm}</span>
        {scheduling.algorithm==='RR' && <span>Q:{scheduling.quantum}</span>}
        <span className="ml-auto">Total: {totalTime}</span>
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

        <div className="h-14 w-full rounded-md bg-white/5 border border-white/10 overflow-hidden relative flex">
          {timeline.map((seg,i)=>{
            const widthPct = totalTime ? (seg.duration/totalTime)*100 : 0
            return (
              <div
                key={i}
                className="h-full relative flex items-center justify-center"
                style={{
                  width: `${widthPct}%`,
                  background: colorMap[seg.label]
                }}
              >
                <span className="text-[11px] font-semibold text-white px-2 truncate drop-shadow">
                  {seg.label}
                </span>
                <div className="absolute right-0 top-0 h-full w-px bg-white/20" />
                <span className="absolute -bottom-4 right-0 translate-x-1/2 text-[10px] text-gray-400">
                  {seg.end}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(colorMap).map(([label,col])=>(
          <div key={label} className="flex items-center gap-1 text-[10px] text-gray-300">
            <span className="w-3 h-3 rounded-sm" style={{ background:col }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
