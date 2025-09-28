import React from 'react'
import { useSimulation } from '../../state/simulationStore.js'
const colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6']
export default function GanttChart(){
  const scheduling = useSimulation(s=>s.scheduling)
  const t = scheduling.timeline
  if(!t.length) return <div className="text-sm text-gray-500">No schedule yet.</div>
  const total = t[t.length-1].end
  return (
    <div className="w-full border rounded-xl p-4 bg-white dark:bg-white/5">
      <div className="flex h-14 w-full overflow-hidden rounded-lg">
        {t.map((s,i)=>{
          const width = ((s.end - s.start)/ total)*100
          return (
            <div key={i} style={{ width: width+'%', background: colors[i % colors.length] }} className="relative text-[10px] flex items-center justify-center text-white font-medium">
              {s.pid} ({s.end - s.start})
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Total: {total} time units</div>
    </div>
  )
}