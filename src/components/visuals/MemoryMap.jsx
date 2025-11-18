import React from 'react'
import { useSimulation } from '../../state/simulationStore.js'

export default function MemoryMap(){
  const blocks = useSimulation(s=>s.memory.blocks)
  const total = useSimulation(s=>s.memory.total)
  const strategy = useSimulation(s=>s.memory.strategy)
  
  // Calculate fragmentation metrics
  const allocatedBlocks = blocks.filter(b => b.allocatedTo)
  const freeBlocks = blocks.filter(b => !b.allocatedTo)
  const totalAllocated = allocatedBlocks.reduce((sum, b) => sum + b.size, 0)
  const totalFree = freeBlocks.reduce((sum, b) => sum + b.size, 0)
  const fragmentationCount = freeBlocks.length
  const fragmentation = freeBlocks.length > 1 
    ? Math.min(100, (fragmentationCount - 1) * 20) 
    : 0
  
  return (
    <div className="border border-white/15 rounded-xl p-5 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-lg">
      <style>{`
        @keyframes fadeInBlock {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fragmentPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span>🧩</span> Memory ({total} KB)
        </h3>
        <span className="text-[10px] px-2 py-1 bg-purple-600/30 text-purple-300 rounded-md font-medium">{strategy.replace('_', ' ')}</span>
      </div>
      
      {/* Memory Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <div className="text-[9px] text-gray-400 mb-0.5">Allocated</div>
          <div className="text-xs font-bold text-indigo-300">{totalAllocated} KB</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <div className="text-[9px] text-gray-400 mb-0.5">Free</div>
          <div className="text-xs font-bold text-green-300">{totalFree} KB</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-white/10">
          <div className="text-[9px] text-gray-400 mb-0.5">Blocks</div>
          <div className="text-xs font-bold text-purple-300">{blocks.length}</div>
        </div>
      </div>
      
      {/* Fragmentation Meter */}
      {fragmentation > 0 && (
        <div className="mb-4 p-3 bg-yellow-600/10 border border-yellow-600/20 rounded-lg" style={{animation: 'fragmentPulse 2s ease-in-out infinite'}}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-yellow-300 font-medium flex items-center gap-1">
              ⚠️ Fragmentation
            </span>
            <span className="text-[10px] text-yellow-400 font-bold">{fragmentation.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
              style={{width: `${fragmentation}%`}}
            />
          </div>
          <p className="text-[9px] text-yellow-400/80 mt-1.5">{fragmentationCount} free fragments detected</p>
        </div>
      )}
      <div className="flex flex-col gap-2 max-h-64 overflow-auto text-xs pr-1 custom-scrollbar">
        {blocks.map((b,i)=>{
          const isAllocated = b.allocatedTo
          const blockClasses = `flex justify-between items-center px-3 py-2.5 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer border ${
            isAllocated
              ? 'bg-gradient-to-r from-indigo-600/80 to-indigo-500/70 text-white hover:from-indigo-500/90 hover:to-indigo-400/80 border-indigo-400/30 shadow-lg shadow-indigo-500/20' 
              : 'bg-gradient-to-r from-gray-700/60 to-gray-600/50 text-gray-200 hover:from-gray-600/70 hover:to-gray-500/60 border-gray-500/20'
          }`
          return (
            <div 
              key={b.id} 
              className={blockClasses}
              style={{animation: `fadeInBlock 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.06}s both`}}
            >
              <span className="font-bold flex items-center gap-1.5">
                {isAllocated ? <span>🔒</span> : <span>🔓</span>}
                {b.id}
              </span>
              <span className="transition-transform duration-200 font-medium">
                {b.size} KB {isAllocated && <span className="text-indigo-200">→ {b.allocatedTo}</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}