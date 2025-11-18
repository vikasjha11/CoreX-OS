import React, { useEffect, useRef, useState } from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'
import GanttChart from '../components/visuals/GanttChart'
import MemoryMap from '../components/visuals/MemoryMap'
import ReadyQueue from '../components/visuals/ReadyQueue'
import CurrentProcess from '../components/visuals/CurrentProcess'
import ComparisonView from '../components/visuals/ComparisonView'
import ProcessCycleSimulation from '../components/visuals/ProcessCycleSimulation'

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
  const ganttRef = useRef(null)

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
    setMemoryKey(k=>k+1)
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
    // Smooth scroll to Gantt chart
    setTimeout(() => {
      ganttRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  function resetAll(){
    actions.resetAll()
    setChartKey(k=>k+1)
    setMemoryKey(k=>k+1)
    setMaskMetrics(true)
    setAllocPid('')
    if(sizeRef.current) sizeRef.current.value = ''
  }

  function copyMetricsToClipboard(){
    if(!scheduling.metrics) return
    const text = `Process & Memory Core - Metrics\n` +
      `Algorithm: ${scheduling.algorithm}\n` +
      `Average Wait Time: ${scheduling.metrics.avgWaiting}\n` +
      `Average Turnaround Time: ${scheduling.metrics.avgTurnaround}\n` +
      `CPU Utilization: ${scheduling.metrics.cpuUtilization}%\n` +
      `Total Time: ${scheduling.metrics.totalTime}`
    navigator.clipboard.writeText(text).then(()=>{
      alert('✅ Metrics copied to clipboard!')
    })
  }

  return (
    <section className="py-20 max-w-7xl mx-auto px-6 space-y-16">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Process & Memory Core</h1>
            <p className="text-sm text-gray-400 max-w-3xl mt-2">
              Unified workspace for CPU scheduling (FCFS, SJF, Priority, RR, MLQ) and memory allocation (First / Best / Worst Fit) with live Gantt and memory block visualization.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="px-5 h-10 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 shadow-lg">
            ↻ Reset All
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-12">
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-8 space-y-10 shadow-xl border border-white/10 hover:border-white/20 transition-colors duration-300">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">⚙️</span> Scheduling
            </h2>
            <form onSubmit={addProcess} className="text-xs grid gap-4">
              <div className="grid grid-cols-4 gap-3">
                <label className="text-[11px] text-gray-400 flex flex-col gap-1.5 group">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="text-sm">📝</span> Name
                  </span>
                  <input name="name" placeholder="e.g., P1" className="input" aria-label="Process name" title="Process identifier" />
                </label>
                <label className="text-[11px] text-gray-400 flex flex-col gap-1.5 group">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="text-sm">⏱️</span> Burst
                  </span>
                  <input name="burst" type="number" min="1" defaultValue="5" placeholder="e.g., 5" className="input" aria-label="CPU burst time" title="CPU execution time units" />
                </label>
                <label className="text-[11px] text-gray-400 flex flex-col gap-1.5 group">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="text-sm">⭐</span> Priority
                  </span>
                  <input name="priority" type="number" min="1" defaultValue="1" placeholder="e.g., 1" className="input" aria-label="Process priority" title="Lower number = higher priority" />
                </label>
                <label className="text-[11px] text-gray-400 flex flex-col gap-1.5 group">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="text-sm">💾</span> Memory
                  </span>
                  <input name="memory" type="number" min="4" defaultValue="32" placeholder="e.g., 32" className="input" aria-label="Requested memory in KB" title="Memory required in KB" />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="px-5 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium w-fit transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 shadow-md">➕ Add Process</button>
                <button type="button" onClick={loadDemo} className="px-5 h-10 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium w-fit transition-all duration-200 hover:scale-105 border border-white/20 hover:border-white/30 active:scale-95">🎮 Load Demo</button>
              </div>
            </form>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <span>🔄</span> Algorithm
            </h3>
            <div className="flex flex-wrap gap-2">
              {algos.map(a=>(
                <button
                  type="button"
                  key={a}
                  onClick={()=>handleSetAlgo(a)}
                  title={`${a === 'FCFS' ? 'First Come First Serve - processes execute in arrival order' : a === 'SJF' ? 'Shortest Job First - shortest burst time first' : a === 'PRIORITY' ? 'Priority Scheduling - higher priority processes first' : a === 'RR' ? 'Round Robin - time-sliced execution' : a === 'MLQ' ? 'Multi-Level Queue - multiple priority queues' : ''}`}
                  className={`px-4 h-10 rounded-full border text-xs font-medium transition-all duration-200 hover:scale-110 active:scale-95 ${
                    currentAlgo===a
                      ?'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-transparent shadow-lg shadow-indigo-500/30'
                      :'border-white/20 bg-white/5 text-gray-300 hover:border-indigo-400 hover:text-white hover:bg-white/10 hover:shadow-md'
                  }`}>
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
              className="mt-5 px-8 h-11 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-green-500/30 active:scale-95 shadow-lg">
              ▶️ Run Scheduler
            </button>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <span>📋</span> Processes
            </h3>
            <ul className="text-xs space-y-2 max-h-40 overflow-auto pr-1 custom-scrollbar">
              {processes.map((p,i)=>(
                <li key={p.id} className="flex justify-between items-center border border-white/10 bg-white/5 hover:bg-white/10 rounded-lg p-3 gap-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" style={{animation: `slideInRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.08}s both`}}>
                  <span className="truncate font-semibold text-white">{p.name||p.id}</span>
                  <span className="text-gray-400 text-[11px]">⏱️{p.burst} ⭐{p.priority} 💾{p.memory}KB</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={()=>quickAlloc(p.id)}
                      title="Allocate memory for this process"
                      className="text-[11px] px-3 h-7 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95">
                      Alloc
                    </button>
                    <button
                      type="button"
                      onClick={()=>actions.releaseMemory(p.id)}
                      title="Release allocated memory"
                      className="text-[11px] px-3 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500 transition-all duration-200 hover:scale-110 active:scale-95">
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={()=>actions.removeProcess(p.id)}
                      title="Delete this process"
                      className="text-[11px] px-3 h-7 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95">
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {!processes.length && <li className="text-gray-500 text-center py-4">No processes yet</li>}
            </ul>
          </div>

          <div ref={ganttRef} className="scroll-mt-24 transition-all duration-500">
            <div className={`transition-all duration-700 ${scheduling.timeline?.length ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <span>📊</span> Gantt Chart
              </h3>
              <GanttChart
                key={chartKey}
                scheduling={scheduling}
              />
            </div>
          </div>

          {/* New: Ready Queue Component */}
          <div>
            <ReadyQueue />
          </div>

          {/* New: Current Process Component */}
          <div>
            <CurrentProcess />
          </div>

          {/* Process State Cycle Simulation */}
          <div>
            <ProcessCycleSimulation />
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <span>📈</span> Metrics
              </span>
              {!maskMetrics && scheduling.metrics && (
                <button
                  type="button"
                  onClick={copyMetricsToClipboard}
                  className="text-[10px] px-3 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Copy metrics to clipboard">
                  📋 Copy
                </button>
              )}
            </h3>
            {!maskMetrics && scheduling.metrics ? (
              <ul className="flex flex-wrap gap-3 text-[11px]">
                <Metric label="Avg Wait" value={scheduling.metrics.avgWaiting} delay={0} icon="⏳"/>
                <Metric label="Avg Turn" value={scheduling.metrics.avgTurnaround} delay={0.1} icon="🔄"/>
                <Metric label="CPU Util" value={scheduling.metrics.cpuUtilization+'%'} delay={0.2} icon="⚡"/>
                <Metric label="Total Time" value={scheduling.metrics.totalTime} delay={0.3} icon="⏰"/>
              </ul>
            ) : <div className="text-gray-500 text-xs text-center py-4">Run scheduler to see metrics</div>}
          </div>

          {/* Algorithm Comparison Section */}
          <div>
            <ComparisonView processes={processes} quantum={scheduling?.quantum ?? 4} />
          </div>
        </div>

        {/* Memory Management Section - Below Scheduling */}
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-8 space-y-10 shadow-xl border border-white/10 hover:border-white/20 transition-colors duration-300">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-2xl">💾</span> Memory Management
          </h2>

          <div>
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <span>🎯</span> Allocation Strategy
            </h3>
            <div className="flex flex-wrap gap-2">
              {['FIRST_FIT','BEST_FIT','WORST_FIT'].map(s=>(
                <button
                  type="button"
                  key={s}
                  onClick={()=>handleSetStrategy(s)}
                  title={`${s === 'FIRST_FIT' ? 'Allocate in first available block' : s === 'BEST_FIT' ? 'Allocate in smallest sufficient block' : 'Allocate in largest available block'}`}
                  className={`px-4 h-10 rounded-full border text-xs font-medium transition-all duration-200 hover:scale-110 active:scale-95 ${
                    currentStrategy===s
                      ?'bg-gradient-to-r from-purple-600 to-purple-500 text-white border-transparent shadow-lg shadow-purple-500/30'
                      :'border-white/20 bg-white/5 text-gray-300 hover:border-purple-400 hover:text-white hover:bg-white/10 hover:shadow-md'
                  }`}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <span>➕</span> Allocate Memory
            </h3>
            <form onSubmit={alloc} className="flex flex-wrap gap-3 text-xs items-end bg-white/5 p-4 rounded-xl border border-white/10">
              <label className="text-[11px] text-gray-400 flex flex-col gap-1.5">
                <span className="font-medium flex items-center gap-1.5">
                  <span>📝</span> Process
                </span>
                <select
                  name="pid"
                  className="input w-40"
                  required
                  value={allocPid}
                  onChange={e=>setAllocPid(e.target.value)}
                  aria-label="Select process"
                  title="Select process to allocate memory"
                >
                  {processes.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-gray-400 flex flex-col gap-1.5">
                <span className="font-medium flex items-center gap-1.5">
                  <span>💾</span> Size (KB)
                </span>
                <input
                  ref={sizeRef}
                  name="size"
                  type="number"
                  min="1"
                  placeholder="e.g., 32"
                  className="input w-28"
                  required
                  aria-label="Allocation size in KB"
                  title="Memory size to allocate"
                />
              </label>
              <button
                type="button"
                onClick={fillSizeWithProcMemory}
                className="px-4 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs border border-gray-600 hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95"
                title="Auto-fill with process memory requirement">
                Auto-fill
              </button>
              <button type="submit" className="px-6 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 shadow-md">✓ Allocate</button>
            </form>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <span>♻️</span> Release Memory
            </h3>
            <div className="flex flex-wrap gap-2">
              {processes.map(p=>(
                <button
                  type="button"
                  key={p.id}
                  onClick={()=>actions.releaseMemory(p.id)}
                  className="text-[11px] px-4 h-9 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95"
                  title={`Release memory for ${p.name || p.id}`}>
                  {p.name||p.id}
                </button>
              ))}
              {!processes.length && <span className="text-gray-500 text-xs">No processes</span>}
              {processes.length>0 && (
                <button
                  type="button"
                  onClick={releaseAll}
                  className="text-[11px] px-4 h-9 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                  title="Release all allocated memory">
                  ♻️ Release All
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
              <span>🧩</span> Memory Blocks
            </h3>
            <MemoryMap key={memoryKey} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Metric({label,value,delay=0,icon=''}){  return (
    <li className="px-5 py-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 flex flex-col transition-all duration-300 hover:scale-110 hover:from-white/15 hover:to-white/10 hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/20 cursor-default backdrop-blur-sm" style={{animation: `fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`}}>
      <span className="text-[10px] uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
        {icon && <span>{icon}</span>}
        {label}
      </span>
      <span className="text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mt-1">{value}</span>
    </li>
  )
}

if(typeof document!=='undefined' && !document.getElementById('pmc-metric-style')){
  const style=document.createElement('style')
  style.id='pmc-metric-style'
  style.innerHTML=`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(style)
}

if(typeof document!=='undefined' && !document.getElementById('pmc-input-style')){
  const style=document.createElement('style')
  style.id='pmc-input-style'
  style.innerHTML=`
    .input{
      background: linear-gradient(135deg, rgba(15, 22, 35, 0.9), rgba(20, 30, 48, 0.9));
      border: 1px solid rgba(255,255,255,.12);
      padding: 0 12px;
      border-radius: 12px;
      height: 40px;
      outline: none;
      color: #fff;
      font-size: 12px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
    }
    .input:focus{
      border-color: #6366f1;
      box-shadow: 0 0 0 4px rgba(99,102,241,0.15), inset 0 1px 3px rgba(0,0,0,0.1);
      transform: scale(1.02);
      background: rgba(15, 22, 35, 1);
    }
    .input:hover{
      border-color: rgba(255,255,255,.22);
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(-30px) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 10px;
      transition: background 0.3s;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #8b5cf6, #a855f7);
    }
  `
  document.head.appendChild(style)
}