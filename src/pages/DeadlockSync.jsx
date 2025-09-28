import React from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'

export default function DeadlockSync(){
  const processes = useSimulation(s=>s.processes)
  const resources = useSimulation(s=>s.resources)
  const actions = useSimActions()

  function check(){
    const safe = actions.checkDeadlock()
    alert('System is '+(safe?'SAFE':'UNSAFE (deadlock or unsafe state)'))
  }

  return (
    <PageLayout
      title="Deadlock & Synchronization"
      subtitle="Banker’s safety check, detection (extend with wait-for graph), recovery strategies plus classic concurrency problems.">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="card-surface p-5">
          <h3 className="font-semibold text-sm mb-4">Resources (sample)</h3>
          <ul className="text-xs space-y-2">
            {Object.entries(resources).map(([r,info])=>(
              <li key={r} className="flex justify-between border-b border-white/5 pb-1">
                <span>{r}</span>
                <span>total:{info.total}</span>
              </li>
            ))}
          </ul>
          <button onClick={check} className="mt-5 px-5 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
            Run Banker Safety
          </button>
          <p className="text-[11px] text-gray-500 mt-3">
            Extend processes with max / alloc vectors to vary results.
          </p>
        </div>
        <div className="card-surface p-5">
          <h3 className="font-semibold text-sm mb-3">Processes Allocation (mock)</h3>
          <ul className="text-xs space-y-1">
            {processes.map(p=>(
              <li key={p.id} className="flex justify-between border-b border-white/5 pb-1">
                <span>{p.name||p.id}</span>
                <span>alloc: {{}} max: {{}}</span>
              </li>
            ))}
            {!processes.length && <li className="text-gray-500">No processes.</li>}
          </ul>
          <p className="text-[11px] text-gray-500 mt-4">
            Add UI to assign alloc/max per resource, then re-run safety.
          </p>
        </div>
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