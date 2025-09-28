import React from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'
import MemoryMap from '../components/visuals/MemoryMap'

export default function MemoryManagement(){
  const memory = useSimulation(s=>s.memory)
  const processes = useSimulation(s=>s.processes)
  const actions = useSimActions()

  function alloc(e){
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    actions.allocateMemory(f.get('pid'), +f.get('size'))
    e.currentTarget.reset()
  }

  return (
    <PageLayout
      title="Memory Management"
      subtitle="First Fit · Best Fit · Worst Fit (extend with paging / segmentation).">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="card-surface p-5 space-y-8">
          <div>
            <h3 className="font-semibold text-sm mb-3">Allocation Strategy</h3>
            <div className="flex gap-3 flex-wrap text-xs">
              {['FIRST_FIT','BEST_FIT','WORST_FIT'].map(s=>(
                <button
                  key={s}
                  onClick={()=> actions.allocateMemory('_noop_',0) || actions.setAlgorithm}
                  className={`px-4 h-9 rounded-full border ${memory.strategy===s?'bg-indigo-600 text-white border-indigo-500':'border-white/15 text-gray-300 hover:border-indigo-500 hover:text-white'}`}
                  disabled
                  title="(Switch logic not wired yet—extend store to change memory.strategy)"
                >{s.replace('_',' ')}</button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Add strategy switch by creating an action to update memory.strategy.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Allocate Memory</h3>
            <form onSubmit={alloc} className="flex flex-wrap gap-3 text-xs items-end">
              <select name="pid" className="input w-40">
                {processes.map(p=><option key={p.id} value={p.id}>{p.name || p.id}</option>)}
              </select>
              <input name="size" type="number" min="1" placeholder="Size" className="input w-32" required />
              <button className="px-5 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">Allocate</button>
            </form>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Release</h3>
            <div className="flex flex-wrap gap-2">
              {processes.map(p=>(
                <button
                  key={p.id}
                  onClick={()=>actions.releaseMemory(p.id)}
                  className="text-[11px] px-3 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
                  Release {p.name||p.id}
                </button>
              ))}
              {!processes.length && <span className="text-gray-500 text-xs">No processes.</span>}
            </div>
          </div>
        </div>
        <MemoryMap />
      </div>
    </PageLayout>
  )
}

function PageLayout({ title, subtitle, children }){
  return (
    <section className="py-20 max-w-7xl mx-auto px-6 space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-3 max-w-2xl">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}