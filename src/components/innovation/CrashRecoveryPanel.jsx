import React, { useState } from 'react'
import { cloneProcesses, generateWorkload, simulateFCFS, simulateSJF, simulateRR, simulatePriority } from './MetricsEngine'

export default function CrashRecoveryPanel(){
  const [pattern, setPattern] = useState('mixed')
  const [workload, setWorkload] = useState(generateWorkload('mixed',6))
  const [scenario, setScenario] = useState(null)

  const onGenerate = ()=> setWorkload(generateWorkload(pattern,6))

  const runScenario = (sc) =>{
    setScenario(sc)
  }

  // compute baseline and scenario metrics for display
  const baselineProcs = cloneProcesses(workload)
  const baseline = {
    FCFS: simulateFCFS(baselineProcs),
    SJF: simulateSJF(baselineProcs),
    RR: simulateRR(baselineProcs,4),
    PRIORITY: simulatePriority(baselineProcs)
  }

  const applyScenario = (sc) =>{
    let procs = cloneProcesses(workload)
    if(sc==='cpu-crash'){
      // simulate CPU downtime by inserting long idle between arrivals (increase arrival gaps)
      procs = procs.map((p,i)=>({ ...p, arrival: p.arrival + (i===0?0:2) }))
    }
    if(sc==='proc-fail'){
      // drop one random process
      procs = procs.slice(0, Math.max(1, procs.length-1))
    }
    if(sc==='load-spike'){
      // double bursts
      procs = procs.map(p=>({ ...p, burst: Math.max(1, Math.round(p.burst * 1.8)) }))
    }
    return {
      FCFS: simulateFCFS(procs),
      SJF: simulateSJF(procs),
      RR: simulateRR(procs,4),
      PRIORITY: simulatePriority(procs)
    }
  }

  const scenarioResult = scenario ? applyScenario(scenario) : null

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Crash & Recovery</h3>
      <div className="grid grid-cols-2 gap-2">
        <select value={pattern} onChange={e=>setPattern(e.target.value)} className="p-2 bg-slate-800 rounded text-sm">
          <option value="mixed">Mixed</option>
          <option value="cpu">CPU-bound</option>
          <option value="io">I/O-bound</option>
          <option value="light">Light</option>
          <option value="heavy">Heavy</option>
        </select>
        <button className="px-3 py-2 bg-slate-700 rounded" onClick={onGenerate}>Generate</button>
      </div>

      <div className="flex items-center gap-2">
        <button className="px-3 py-2 bg-red-600 rounded text-white" onClick={()=>runScenario('cpu-crash')}>Simulate CPU Crash</button>
        <button className="px-3 py-2 bg-red-500 rounded text-white" onClick={()=>runScenario('proc-fail')}>Simulate Process Failure</button>
        <button className="px-3 py-2 bg-amber-600 rounded text-white" onClick={()=>runScenario('load-spike')}>Simulate Load Spike</button>
      </div>

      <div className="text-xs">
        <strong>Baseline (sample):</strong>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {Object.entries(baseline).map(([k,v])=> (
            <div key={k} className="p-2 bg-white/5 rounded">
              <div className="font-semibold">{k}</div>
              <div className="text-[12px]">W:{v.avgWaiting} T:{v.avgTurnaround} R:{v.avgResponse}</div>
            </div>
          ))}
        </div>
      </div>

      {scenarioResult && (
        <div className="mt-3 bg-slate-800/60 p-3 rounded text-xs">
          <div className="font-semibold mb-2">Scenario: {scenario}</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(scenarioResult).map(([k,v])=> (
              <div key={k} className="p-2 bg-white/5 rounded">
                <div className="font-semibold">{k}</div>
                <div className="text-[12px]">W:{v.avgWaiting} T:{v.avgTurnaround} R:{v.avgResponse}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[12px] text-gray-300">Note: values are estimates from a lightweight simulator to demonstrate relative impact.</div>
        </div>
      )}
    </div>
  )
}
