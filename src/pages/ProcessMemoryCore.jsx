import React from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'
import GanttChart from '../components/visuals/GanttChart'
import MemoryMap from '../components/visuals/MemoryMap'

export default function ProcessMemoryCore(){
  const processes = useSimulation(s=>s.processes)
  const scheduling = useSimulation(s=>s.scheduling)
  const memory = useSimulation(s=>s.memory)
  const actions = useSimActions()
  const algos = ['FCFS','SJF','PRIORITY','RR','MLQ']

  function addProcess(e){
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    actions.addProcess({
      name: f.get('name'),
      burst: +f.get('burst')||5,
      priority:+f.get('priority')||1,
      memory:+f.get('memory')||32
    })
    e.currentTarget.reset()
  }

  function alloc(e){
    e.preventDefault()
    const f=new FormData(e.currentTarget)
    actions.allocateMemory(f.get('pid'), +f.get('size'))
    e.currentTarget.reset()
  }

  return (
    <section className="py-20 max-w-7xl mx-auto px-6 space-y-14">
      <header className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Process & Memory Core</h1>
        <p className="text-sm text-gray-400 max-w-3xl">
          Unified workspace for CPU scheduling (FCFS, SJF, Priority, RR, MLQ) and memory allocation (First / Best / Worst Fit) with live Gantt and memory block visualization.
        </p>
      </header>

      <div className="grid xl:grid-cols-2 gap-10">
        {/* Scheduling */}
        <div className="card-surface p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-3">Scheduling</h2>
            <form onSubmit={addProcess} className="text-xs grid gap-3">
              <div className="grid grid-cols-4 gap-3">
                <input name="name" placeholder="Name" className="input" />
                <input name="burst" type="number" min="1" defaultValue="5" className="input" />
                <input name="priority" type="number" min="1" defaultValue="1" className="input" />
                <input name="memory" type="number" min="4" defaultValue="32" className="input" />
              </div>
              <button className="px-4 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white w-fit">Add Process</button>
            </form>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Algorithm</h3>
            <div className="flex flex-wrap gap-2">
              {algos.map(a=>(
                <button
                  key={a}
                  onClick={()=>actions.setAlgorithm(a)}
                  className={`px-4 h-9 rounded-full border text-xs ${scheduling.algorithm===a?'bg-indigo-600 text-white border-indigo-500':'border-white/15 text-gray-300 hover:border-indigo-500 hover:text-white'}`}>
                  {a}
                </button>
              ))}
              {scheduling.algorithm==='RR' && (
                <label className="flex items-center gap-2 text-xs ml-2">
                  Q:
                  <input
                    type="number"
                    min="1"
                    value={scheduling.quantum}
                    onChange={e=>actions.setQuantum(+e.target.value)}
                    className="w-16 h-8 rounded-md bg-black/40 border border-white/10 px-2 outline-none"
                  />
                </label>
              )}
            </div>
            <button
              onClick={actions.runScheduler}
              className="mt-4 px-6 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
              Run Scheduler
            </button>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Processes</h3>
            <ul className="text-xs space-y-1 max-h-40 overflow-auto pr-1">
              {processes.map(p=>(
                <li key={p.id} className="flex justify-between border-b border-white/10 pb-1">
                  <span>{p.name||p.id}</span>
                  <span>b:{p.burst} pr:{p.priority} m:{p.memory}</span>
                </li>
              ))}
              {!processes.length && <li className="text-gray-500">None</li>}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Gantt Chart</h3>
            <GanttChart />
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Metrics</h3>
            {scheduling.metrics ? (
              <ul className="flex flex-wrap gap-3 text-[11px]">
                <Metric label="Avg Wait" value={scheduling.metrics.avgWaiting}/>
                <Metric label="Avg Turn" value={scheduling.metrics.avgTurnaround}/>
                <Metric label="CPU Util" value={scheduling.metrics.cpuUtilization+'%'}/>
                <Metric label="Total Time" value={scheduling.metrics.totalTime}/>
              </ul>
            ) : <div className="text-gray-500 text-xs">Run scheduler.</div>}
          </div>
        </div>

        {/* Memory */}
        <div className="card-surface p-6 space-y-8">
          <h2 className="text-lg font-semibold">Memory</h2>

          <div>
            <h3 className="font-medium mb-2 text-sm">Strategy</h3>
            <div className="flex flex-wrap gap-2">
              {['FIRST_FIT','BEST_FIT','WORST_FIT'].map(s=>(
                <button
                  key={s}
                  onClick={()=>actions.setMemoryStrategy(s)}
                  className={`px-4 h-9 rounded-full border text-xs ${memory.strategy===s?'bg-indigo-600 text-white border-indigo-500':'border-white/15 text-gray-300 hover:border-indigo-500 hover:text-white'}`}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>

            <div>
              <h3 className="font-medium mb-2 text-sm">Allocate</h3>
              <form onSubmit={alloc} className="flex flex-wrap gap-3 text-xs items-end">
                <select name="pid" className="input w-40" required>
                  {processes.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
                </select>
                <input name="size" type="number" min="1" placeholder="Size" className="input w-28" required />
                <button className="px-5 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">Alloc</button>
              </form>
            </div>

            <div>
              <h3 className="font-medium mb-2 text-sm">Release</h3>
              <div className="flex flex-wrap gap-2">
                {processes.map(p=>(
                  <button
                    key={p.id}
                    onClick={()=>actions.releaseMemory(p.id)}
                    className="text-[11px] px-3 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
                    {p.name||p.id}
                  </button>
                ))}
                {!processes.length && <span className="text-gray-500 text-xs">No processes.</span>}
              </div>
            </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Blocks</h3>
            <MemoryMap />
          </div>
        </div>
      </div>
    </section>
  )
}

function Metric({label,value}){
  return (
    <li className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </li>
  )
}

// inject shared input style once
if(typeof document!=='undefined' && !document.getElementById('pmc-input-style')){
  const style=document.createElement('style'); style.id='pmc-input-style'; style.innerHTML=`.input{background:#0f1623;border:1px solid rgba(255,255,255,.08);padding:0 10px;border-radius:10px;height:40px;outline:none;color:#fff;font-size:12px}.input:focus{border-color:#6366f1}`; document.head.appendChild(style)
}