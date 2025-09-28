import React from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'
import GanttChart from '../components/visuals/GanttChart'

export default function ProcessManagement(){
  const processes = useSimulation(s=>s.processes)
  const scheduling = useSimulation(s=>s.scheduling)
  const actions = useSimActions()

  return (
    <PageLayout
      title="Process Management"
      subtitle="FCFS · SJF · Priority · Round Robin (quantum) · (Extend: Multi‑Level Queue)">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="font-semibold text-sm mb-4">Add Process</h3>
            <ProcessForm onAdd={actions.addProcess} />
          <h3 className="font-semibold text-sm mt-8 mb-2">Current Processes</h3>
          <ul className="text-xs space-y-1 max-h-44 overflow-auto pr-1">
            {processes.map(p=>(
              <li key={p.id} className="flex justify-between border-b border-white/10 pb-1">
                <span>{p.name || p.id}</span>
                <span>burst:{p.burst} prio:{p.priority}</span>
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
          <GanttChart />
        </div>

        <div className="md:col-span-2 card-surface p-5">
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
      </div>
    </PageLayout>
  )
}

function ProcessForm({ onAdd }){
  function submit(e){
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    onAdd({
      name: f.get('name')||'',
      burst: +f.get('burst')||5,
      priority:+f.get('priority')||1,
      memory:+f.get('memory')||32
    })
    e.currentTarget.reset()
  }
  return (
    <form onSubmit={submit} className="grid gap-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <input name="name" placeholder="Name" className="input" />
        <input name="burst" type="number" min="1" defaultValue="5" className="input" />
        <input name="priority" type="number" min="1" defaultValue="1" className="input" />
        <input name="memory" type="number" min="4" defaultValue="32" className="input" />
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

// small shared input style
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