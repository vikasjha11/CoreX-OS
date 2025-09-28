import React from 'react'
import { useSimulation } from '../../state/simulationStore.js'
export default function MemoryMap(){
  const blocks = useSimulation(s=>s.memory.blocks)
  const total = useSimulation(s=>s.memory.total)
  return (
    <div className="border rounded-xl p-4 bg-white dark:bg-white/5">
      <h3 className="font-semibold mb-3 text-sm">Memory ({total} KB)</h3>
      <div className="flex flex-col gap-1 max-h-64 overflow-auto text-xs">
        {blocks.map(b=>(
          <div key={b.id} className={`flex justify-between px-2 py-1 rounded-md ${b.allocatedTo ? 'bg-indigo-600/70 text-white':'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
            <span>{b.id}</span>
            <span>{b.size} KB {b.allocatedTo && `→ ${b.allocatedTo}`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}