import React, { useEffect, useRef, useState } from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'
import MemoryMap from '../components/visuals/MemoryMap'

export default function MemoryManagement(){
  const memory = useSimulation(s=>s.memory)
  const processes = useSimulation(s=>s.processes)
  const scheduling = useSimulation(s=>s.scheduling)
  const actions = useSimActions()

  const prevIdsRef = useRef(new Set(processes.map(p=>p.id)))
  const pendingAllocRef = useRef(null)
  useEffect(()=>{
    const prev = prevIdsRef.current
    const now = new Set(processes.map(p=>p.id))
    const added = processes.filter(p=> !prev.has(p.id))
    if(pendingAllocRef.current && added.length){
      actions.allocateMemory(added[0].id, +pendingAllocRef.current)
      pendingAllocRef.current = null
    }
    prevIdsRef.current = now
  }, [processes, actions])

  function alloc(e){
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    actions.allocateMemory(f.get('pid'), +f.get('size'))
    e.currentTarget.reset()
  }

  function addProcessAndMaybeAlloc(p){
    if(p.memory) pendingAllocRef.current = +p.memory
    actions.addProcess(p)
  }

  return (
    <PageLayout
      title="Process & Memory"
      subtitle="Process scheduling + Memory management — First/Best/Worst fit sync. Animated Gantt + Memory map.">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="card-surface p-5 space-y-8">
          <div>
            <h3 className="font-semibold text-sm mb-3">Allocation Strategy</h3>
            <div className="flex gap-3 flex-wrap text-xs">
              {['FIRST_FIT','BEST_FIT','WORST_FIT'].map(s=>(
                <button
                  key={s}
                  onClick={()=> actions.setAlgorithm?.(s)}
                  className={`px-4 h-9 rounded-full border ${memory.strategy===s?'bg-indigo-600 text-white border-indigo-500':'border-white/15 text-gray-300 hover:border-indigo-500 hover:text-white'}`}
                  title="Click to switch memory allocation strategy"
                >{s.replace('_',' ')}</button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Switch memory strategy to see different allocation outcomes.
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
                  onClick={()=>{ actions.releaseMemory(p.id); }}
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

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="card-surface p-5">
          <h3 className="font-semibold text-sm mb-4">Add Process</h3>
          <ProcessForm onAdd={addProcessAndMaybeAlloc} />
          <h3 className="font-semibold text-sm mt-8 mb-2">Current Processes</h3>
          <ul className="text-xs space-y-1 max-h-44 overflow-auto pr-1">
            {processes.map(p=>(
              <li key={p.id} className="flex justify-between border-b border-white/10 pb-1">
                <span>{p.name || p.id}</span>
                <span>burst:{p.burst} prio:{p.priority} mem:{p.memory||'-'}</span>
              </li>
            ))}
            {!processes.length && <li className="text-gray-500">None</li>}
          </ul>
        </div>

        <div className="card-surface p-5">
          <h3 className="font-semibold text-sm mb-4">Scheduler Control</h3>
          <div className="flex flex-wrap gap-3 text-xs mb-5">
            {['FCFS','SJF','PRIORITY','RR'].map(a=>(
              <button
                key={a}
                onClick={()=>actions.setAlgorithm(a)}
                className={`px-4 h-9 rounded-full border ${scheduling.algorithm===a?'bg-indigo-600 text-white border-indigo-500':'border-white/15 text-gray-300 hover:border-indigo-500 hover:text-white'}`}>
                {a}
              </button>
            ))}
            {scheduling.algorithm==='RR' && (
              <div className="flex items-center gap-2">
                <span>Q:</span>
                <input
                  type="number"
                  min={1}
                  value={scheduling.quantum}
                  onChange={e=>actions.setQuantum(+e.target.value)}
                  className="w-16 h-8 rounded-md bg-black/40 border border-white/10 px-2 outline-none"
                />
              </div>
            )}
            <button
              onClick={actions.runScheduler}
              className="px-5 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">
              Run
            </button>
          </div>

          <AnimatedGantt processes={processes} scheduling={scheduling} />
        </div>
      </div>

      <div className="md:col-span-2 card-surface p-5 mt-8">
        <h3 className="font-semibold text-sm mb-3">Metrics</h3>
        {scheduling.metrics ? (
          <ul className="flex flex-wrap gap-4 text-xs">
            <Metric label="Avg Waiting" value={scheduling.metrics.avgWaiting}/>
            <Metric label="Avg Turnaround" value={scheduling.metrics.avgTurnaround}/>
            <Metric label="CPU Util (%)" value={scheduling.metrics.cpuUtilization}/>
            <Metric label="Total Time" value={scheduling.metrics.totalTime}/>
          </ul>
        ) : <div className="text-gray-500 text-xs">Run the scheduler to see metrics.</div>}
      </div>
    </PageLayout>
  )
}

/* Animated Gantt - improved visuals + animated growth */
function AnimatedGantt({ processes, scheduling }){
  const [tick, setTick] = useState(0)
  useEffect(()=>{ setTick(k=>k+1) }, [scheduling.metrics, processes.length, scheduling.algorithm])

  const maxBurst = Math.max(1, ...(processes.map(p=>p.burst||0)))
  return (
    <div>
      <div className="text-xs text-gray-300 mb-3">Gantt Chart — {scheduling.algorithm || 'N/A'}</div>
      <div className="gantt-track">
        {processes.map((p, idx)=> {
          const pct = Math.round(((p.burst||0)/maxBurst) * 100)
          return (
            <div key={`${p.id}-${tick}`} className="gantt-row">
              <div className="gantt-label">{p.name||p.id}</div>
              <div className="gantt-bar-wrap">
                <div
                  className="gantt-bar"
                  style={{
                    '--w': pct + '%',
                    background: colorForIndex(idx)
                  }}
                >
                  <span className="gantt-bar-text">{p.burst}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <style>{ganttCss}</style>
    </div>
  )
}

function colorForIndex(i){
  const palette = ['#6366f1','#ef4444','#f59e0b','#10b981','#06b6d4','#8b5cf6','#f97316']
  return palette[i % palette.length]
}

function ProcessForm({ onAdd }){
  function submit(e){
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const payload = {
      name: f.get('name')||'',
      burst: +f.get('burst')||5,
      priority:+f.get('priority')||1,
      memory:+f.get('memory')||0
    }
    onAdd(payload)
    e.currentTarget.reset()
  }
  return (
    <form onSubmit={submit} className="grid gap-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <input name="name" placeholder="Name" className="input" />
        <input name="burst" type="number" min="1" defaultValue="5" className="input" />
        <input name="priority" type="number" min="1" defaultValue="1" className="input" />
        <input name="memory" type="number" min="0" defaultValue="0" className="input" />
      </div>
      <button className="px-4 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">Add</button>
    </form>
  )
}

function Metric({ label, value }){
  return (
    <li className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </li>
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

/* input styles preserved from original process page */
const css = `
.input{
  background:#0f1623;
  border:1px solid rgba(255,255,255,.08);
  padding:0 10px;
  border-radius:10px;
  height:40px;
  outline:none;
  color:#fff;
  font-size:12px;
}
.input:focus{border-color:#6366f1}
`
if(typeof document!=='undefined' && !document.getElementById('proc-style')){
  const tag=document.createElement('style'); tag.id='proc-style'; tag.innerHTML=css; document.head.appendChild(tag)
}

/* Gantt CSS + animation */
const ganttCss = `
.gantt-track{ display:flex; flex-direction:column; gap:10px; }
.gantt-row{ display:flex; align-items:center; gap:12px; }
.gantt-label{ width:90px; font-size:12px; color:#cbd5e1; text-align:right; }
.gantt-bar-wrap{ flex:1; background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); padding:8px; border-radius:10px; min-height:44px; display:flex; align-items:center; }
.gantt-bar{ width:0; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#041026; font-weight:700; font-size:13px; transition: width 700ms cubic-bezier(.2,.9,.2,1), box-shadow 300ms; box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
/* Apply target width via --w variable. React remount ensures animation from 0 -> var(--w) */
.gantt-bar[style]{ width: var(--w); }
.gantt-bar-text{ padding:0 10px; color:rgba(255,255,255,0.95); text-shadow:0 1px 0 rgba(255,255,255,0.06); }
`

// end of file