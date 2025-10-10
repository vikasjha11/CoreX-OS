import React, { useEffect, useState } from 'react'
import { useSimulation } from '../../state/simulationStore.js'

const colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#06b6d4']

export default function GanttChart(){
  const scheduling = useSimulation(s=>s.scheduling)
  const t = scheduling.timeline || []
  const [tick, setTick] = useState(0)

  useEffect(()=>{ setTick(k=>k+1) }, [t.length, scheduling.algorithm, scheduling.metrics])

  if(!t.length) return <div className="text-sm text-gray-500">No schedule yet.</div>

  const total = Math.max(1, t[t.length-1].end || 0)

  return (
    <div className="w-full border rounded-xl p-4 bg-white dark:bg-white/5">
      <div className="gantt-bar-area" aria-hidden>
        {t.map((s,i)=>{
          const dur = Math.max(0, (s.end - s.start))
          const pct = (dur / total) * 100
          return (
            <div
              key={`${i}-${tick}`}
              className="gantt-segment"
              style={{
                '--w': pct + '%',
                background: colors[i % colors.length]
              }}
              title={`${s.pid} — ${dur} unit(s)`}
            >
              <div className="gantt-seg-label">{s.pid} <span className="gantt-duration">({dur})</span></div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Total: {total} time units</div>

      <style>{`
        .gantt-bar-area{ display:flex; height:44px; overflow:hidden; border-radius:10px; background:linear-gradient(90deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01)); }
        .gantt-segment{ width:0; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:12px;
          transition: width 700ms cubic-bezier(.2,.9,.2,1), transform 300ms;
          box-shadow: 0 6px 22px rgba(2,6,23,0.45); min-width:6px; height:100%;
          border-right: 1px solid rgba(255,255,255,0.06); position:relative;
        }
        .gantt-segment[style]{ width: var(--w); }
        .gantt-seg-label{ padding:0 12px; text-shadow:0 1px 0 rgba(0,0,0,0.15); display:flex; gap:6px; align-items:center;}
        .gantt-duration{ font-weight:600; opacity:0.9; font-size:11px; color:rgba(255,255,255,0.95) }
      `}</style>
    </div>
  )
}