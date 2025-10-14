import React, { useEffect, useRef, useState } from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'
import GanttChart from '../components/visuals/GanttChart'
import MemoryMap from '../components/visuals/MemoryMap'

export default function ProcessMemoryCore(){
  const processesRaw = useSimulation(s=>s.processes)
  const schedulingRaw = useSimulation(s=>s.scheduling)
  const memoryRaw = useSimulation(s=>s.memory)
  const processes = Array.isArray(processesRaw) ? processesRaw : []
  const actions = useSimActions()
  const algos = ['FCFS','SJF','PRIORITY','RR','MLQ']
  const scheduling = schedulingRaw ?? { algorithm: 'FCFS', quantum: 4, metrics: null, timeline: [] }
  const memory = memoryRaw ?? { strategy: 'FIRST_FIT', total: 256, blocks: [{ id: 'b0', size: 256, allocatedTo: null }] }
  const currentAlgo = scheduling?.algorithm ?? 'FCFS'
  const currentStrategy = memory?.strategy ?? 'FIRST_FIT'

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
    const pid = allocPid
    const size = Number(sizeRef.current?.value || 0)
    if (!pid || size <= 0) return
    actions.allocateMemory(pid, size)
    if (sizeRef.current) sizeRef.current.value = ''
  }

  const [allocPid, setAllocPid] = useState('')
  const sizeRef = useRef(null)
  const [chartKey, setChartKey] = useState(0)
  const [maskMetrics, setMaskMetrics] = useState(false)
  const [memoryKey, setMemoryKey] = useState(0)

  useEffect(()=>{
    if(!allocPid && processes.length) setAllocPid(processes[0].id)
    if(allocPid && !processes.find(p=>p.id===allocPid)){
      setAllocPid(processes[0]?.id || '')
    }
  },[processes, allocPid])

  useEffect(()=>{
    const p = processes.find(x=>x.id===allocPid)
    if(p && sizeRef.current){
      sizeRef.current.value = p.memory
    }
  },[allocPid, processes])

  function fillSizeWithProcMemory(){
    const p = processes.find(x=>x.id===allocPid)
    if(p && sizeRef.current) sizeRef.current.value = p.memory
  }

  function quickAlloc(pid){
    const p = processes.find(x=>x.id===pid)
    if(p) actions.allocateMemory(pid, p.memory)
  }

  function releaseAll(){
    processes.forEach(p=>actions.releaseMemory(p.id))
  }

  function loadDemo(){
    const demos = [
      { name: 'P1', burst: 5, priority: 2, memory: 32 },
      { name: 'P2', burst: 3, priority: 1, memory: 24 },
      { name: 'P3', burst: 8, priority: 3, memory: 40 },
      { name: 'P4', burst: 6, priority: 2, memory: 16 },
    ]
    demos.forEach(d => actions.addProcess(d))
  }

  function handleSetAlgo(a){
    if(a !== currentAlgo){
      actions.setAlgorithm(a)
      setChartKey(k=>k+1)
      setMaskMetrics(true)
    }
  }

  function handleSetStrategy(s){
    if(s !== currentStrategy){
      actions.setMemoryStrategy(s)
      setMemoryKey(k=>k+1)
    }
  }

  function handleRunScheduler(){
    actions.runScheduler()
    setMaskMetrics(false)
  }

  function resetAll(){
    actions.resetAll()
    setChartKey(k=>k+1)
    setMemoryKey(k=>k+1)
    setMaskMetrics(true)
    setAllocPid('')
    if(sizeRef.current) sizeRef.current.value = ''
  }

  return (
    <section className="py-20 max-w-7xl mx-auto px-6 space-y-14">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Process & Memory Core</h1>
            <p className="text-sm text-gray-400 max-w-3xl">
              Unified workspace for CPU scheduling (FCFS, SJF, Priority, RR, MLQ) and memory allocation (First / Best / Worst Fit) with live Gantt and memory block visualization.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="px-4 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
            Reset All
          </button>
        </div>
      </header>

      <div className="grid xl:grid-cols-2 gap-10">
        <div className="card-surface p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-3">Scheduling</h2>
            <form onSubmit={addProcess} className="text-xs grid gap-3">
              <div className="grid grid-cols-4 gap-3">
                <label className="text-[11px] text-gray-400 flex flex-col gap-1">
                  <span>Name</span>
                  <input name="name" placeholder="e.g., P1" className="input" aria-label="Process name" />
                </label>
                <label className="text-[11px] text-gray-400 flex flex-col gap-1">
                  <span>Burst (time)</span>
                  <input name="burst" type="number" min="1" defaultValue="5" placeholder="e.g., 5" className="input" aria-label="CPU burst time" />
                </label>
                <label className="text-[11px] text-gray-400 flex flex-col gap-1">
                  <span>Priority</span>
                  <input name="priority" type="number" min="1" defaultValue="1" placeholder="e.g., 1" className="input" aria-label="Process priority" />
                </label>
                <label className="text-[11px] text-gray-400 flex flex-col gap-1">
                  <span>Memory (KB)</span>
                  <input name="memory" type="number" min="4" defaultValue="32" placeholder="e.g., 32" className="input" aria-label="Requested memory in KB" />
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white w-fit">Add Process</button>
                <button type="button" onClick={loadDemo} className="px-4 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white w-fit">Load Demo</button>
              </div>
            </form>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Algorithm</h3>
            <div className="flex flex-wrap gap-2">
              {/* Algorithm buttons */}
              {algos.map(a=>(
                <button
                  type="button"
                  key={a}
                  onClick={()=>handleSetAlgo(a)}
                  className={`px-4 h-9 rounded-full border text-xs ${currentAlgo===a?'bg-indigo-600 text-white border-indigo-500':'border-white/15 text-gray-300 hover:border-indigo-500 hover:text-white'}`}>
                  {a}
                </button>
              ))}
              {currentAlgo==='RR' && (
                <label className="flex items-center gap-2 text-xs ml-2">
                  Q:
                  <input
                    type="number"
                    min="1"
                    value={scheduling?.quantum ?? 4}
                    onChange={e=>actions.setQuantum(+e.target.value)}
                    className="w-16 h-8 rounded-md bg-black/40 border border-white/10 px-2 outline-none"
                  />
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={handleRunScheduler}
              className="mt-4 px-6 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
              Run Scheduler
            </button>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Processes</h3>
            <ul className="text-xs space-y-1 max-h-40 overflow-auto pr-1">
              {processes.map(p=>(
                <li key={p.id} className="flex justify-between items-center border-b border-white/10 pb-1 gap-3">
                  <span className="truncate">{p.name||p.id}</span>
                  <span className="text-gray-300">b:{p.burst} pr:{p.priority} m:{p.memory}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={()=>quickAlloc(p.id)}
                      className="text-[11px] px-3 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">
                      Alloc m
                    </button>
                    <button
                      type="button"
                      onClick={()=>actions.releaseMemory(p.id)}
                      className="text-[11px] px-3 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
                      Release
                    </button>
                    <button
                      type="button"
                      onClick={()=>actions.removeProcess(p.id)}
                      className="text-[11px] px-3 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {!processes.length && <li className="text-gray-500">None</li>}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Gantt Chart</h3>
            <GanttChart
              key={chartKey}
              scheduling={scheduling}
            />
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Metrics</h3>
            {!maskMetrics && scheduling.metrics ? (
              <ul className="flex flex-wrap gap-3 text-[11px]">
                <Metric label="Avg Wait" value={scheduling.metrics.avgWaiting}/>
                <Metric label="Avg Turn" value={scheduling.metrics.avgTurnaround}/>
                <Metric label="CPU Util" value={scheduling.metrics.cpuUtilization+'%'}/>
                <Metric label="Total Time" value={scheduling.metrics.totalTime}/>
              </ul>
            ) : <div className="text-gray-500 text-xs">Run scheduler.</div>}
          </div>
        </div>

        <div className="card-surface p-6 space-y-8">
          <h2 className="text-lg font-semibold">Memory</h2>

          <div>
            <h3 className="font-medium mb-2 text-sm">Strategy</h3>
            <div className="flex flex-wrap gap-2">
              {/* Memory strategy buttons */}
              {['FIRST_FIT','BEST_FIT','WORST_FIT'].map(s=>(
                <button
                  type="button"
                  key={s}
                  onClick={()=>handleSetStrategy(s)}
                  className={`px-4 h-9 rounded-full border text-xs ${currentStrategy===s?'bg-indigo-600 text-white border-indigo-500':'border-white/15 text-gray-300 hover:border-indigo-500 hover:text-white'}`}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Allocate</h3>
            {/* Allocate form */}
            <form onSubmit={alloc} className="flex flex-wrap gap-3 text-xs items-end">
              <label className="text-[11px] text-gray-400 flex flex-col gap-1">
                <span>Process</span>
                <select
                  name="pid"
                  className="input w-40"
                  required
                  value={allocPid}
                  onChange={e=>setAllocPid(e.target.value)}
                  aria-label="Select process"
                >
                  {processes.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-gray-400 flex flex-col gap-1">
                <span>Size (KB)</span>
                <input
                  ref={sizeRef}
                  name="size"
                  type="number"
                  min="1"
                  placeholder="e.g., 32"
                  className="input w-28"
                  required
                  aria-label="Allocation size in KB"
                />
              </label>
              <button
                type="button"
                onClick={fillSizeWithProcMemory}
                className="px-3 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
                Use p.memory
              </button>
              <button type="submit" className="px-5 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">Alloc</button>
            </form>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Release</h3>
            <div className="flex flex-wrap gap-2">
              {processes.map(p=>(
                <button
                  type="button"
                  key={p.id}
                  onClick={()=>actions.releaseMemory(p.id)}
                  className="text-[11px] px-3 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
                  {p.name||p.id}
                </button>
              ))}
              {!processes.length && <span className="text-gray-500 text-xs">No processes.</span>}
              {processes.length>0 && (
                <button
                  type="button"
                  onClick={releaseAll}
                  className="text-[11px] px-3 h-8 rounded-full bg-red-600/80 hover:bg-red-600 text-white">
                  Release All
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-sm">Blocks</h3>
            <MemoryMap key={memoryKey} />
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

if(typeof document!=='undefined' && !document.getElementById('pmc-input-style')){
  const style=document.createElement('style')
  style.id='pmc-input-style'
  style.innerHTML=`.input{background:#0f1623;border:1px solid rgba(255,255,255,.08);padding:0 10px;border-radius:10px;height:40px;outline:none;color:#fff;font-size:12px}.input:focus{border-color:#6366f1}`
  document.head.appendChild(style)
}