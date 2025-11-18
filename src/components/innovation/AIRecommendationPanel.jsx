import React, { useState, useMemo } from 'react'
import { useSimulation } from '../../state/simulationStore.js'
import { generateWorkload, cloneProcesses, simulateFCFS, simulateSJF, simulateRR, simulatePriority } from './MetricsEngine'
import MiniBarChart from './MiniBarChart'

const algos = ['FCFS','SJF','RR','PRIORITY']

export default function SchedulerRecommendationPanel(){
  const simProcs = useSimulation(s=>s.processes) || []
  const [pattern, setPattern] = useState('mixed')
  const [useLive, setUseLive] = useState(!!simProcs.length)
  const [quantum, setQuantum] = useState(4)
  const [result, setResult] = useState(null)
  const [workload, setWorkload] = useState(generateWorkload('mixed',6))

  const processes = useMemo(()=>{
    return useLive && simProcs.length ? simProcs.map(p=>({ id:p.id, name:p.name, arrival:p.arrival ?? 0, burst: p.burst ?? p.duration ?? 5, priority: p.priority ?? 1 })) : workload
  },[useLive, simProcs, workload])

  const runAll = () =>{
    const procs = cloneProcesses(processes)
    const out = {
      FCFS: simulateFCFS(procs),
      SJF: simulateSJF(procs),
      RR: simulateRR(procs, quantum),
      PRIORITY: simulatePriority(procs)
    }
    // choose best by avgWaiting then turnaround
    const best = Object.entries(out).sort((a,b)=>a[1].avgWaiting - b[1].avgWaiting)[0]
    const explanation = makeExplanation(best, out)
    setResult({ best: best[0], metrics: out, explanation })
  }

  const makeExplanation = (best, all) =>{
    const alg = best[0];
    const m = best[1]
    let why = []
    why.push(`Recommended: ${alg}${alg==='RR' ? ` (quantum: ${quantum})` : ''}`)
    if(m.avgWaiting <= 5) why.push('- Low average waiting time under current workload')
    if(m.cpuUtilization >= 80) why.push('- Keeps CPU utilization high')
    if(m.contextSwitches > 5 && alg==='RR') why.push('- High context-switch overhead noted for RR')
    why.push('\nBased on:')
    why.push(`- Processes: ${processes.length}`)
    why.push(`- Avg burst (approx): ${Math.round(processes.reduce((a,b)=>a+b.burst,0)/processes.length)}`)
    return why.join('\n')
  }

  const onPredict = ()=>{
    if(!useLive) setWorkload(generateWorkload(pattern,6))
    setTimeout(runAll, 80)
  }

  const chartData = result ? Object.entries(result.metrics).map(([k,v])=>({ key:k, value: v.avgWaiting, color: k==='RR'? '#f97316': k==='SJF'? '#f59e0b': k==='PRIORITY'? '#ef4444':'#60a5fa' })) : []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Scheduler Recommendation</h3>
        <div className="flex items-center gap-2 text-[12px]">
          <label className="flex items-center gap-1 text-gray-400"><input type="checkbox" checked={useLive} onChange={e=>setUseLive(e.target.checked)} /> Use live processes</label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">System Load Pattern</label>
          <select value={pattern} onChange={e=>setPattern(e.target.value)} className="w-full mt-1 p-2 bg-slate-800 rounded text-sm">
            <option value="mixed">Mixed</option>
            <option value="cpu">CPU-bound</option>
            <option value="io">I/O-bound</option>
            <option value="light">Light load</option>
            <option value="heavy">Heavy load</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">RR Quantum</label>
          <input type="number" value={quantum} onChange={e=>setQuantum(Number(e.target.value)||1)} className="w-full mt-1 p-2 bg-slate-800 rounded text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-blue-600 rounded text-white text-sm" onClick={onPredict}>Predict Best Algorithm</button>
        <button className="px-3 py-2 bg-slate-700 rounded text-white text-sm" onClick={()=>setResult(null)}>Clear</button>
      </div>

      {result && (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded p-3 text-xs">
          <div className="mb-2">
            <strong>Recommended:</strong> <span className="font-semibold">{result.best}{result.best==='RR'?` (q=${quantum})`:''}</span>
          </div>
          <pre className="text-xs whitespace-pre-line text-gray-300">{result.explanation}</pre>
          <div className="mt-3">
            <MiniBarChart data={chartData} label="Avg Wait" />
          </div>
        </div>
      )}

      <div className="text-[11px] text-gray-400">
        <strong>Algorithm strengths</strong>
        <ul className="mt-2 list-disc ml-4">
          <li><strong>FCFS</strong>: Simple; may cause long waiting times</li>
          <li><strong>SJF</strong>: Minimizes turnaround; may starve long jobs</li>
          <li><strong>RR</strong>: Fair; quantum-sensitive and may cause context-switch overhead</li>
          <li><strong>PRIORITY</strong>: Respects priority; may starve low-priority processes</li>
        </ul>
      </div>
    </div>
  )
}
