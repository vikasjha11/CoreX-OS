import React, { useState } from 'react'
import { cloneProcesses, simulateFCFS, simulateSJF, simulateRR, simulatePriority, predictQuantum, generateWorkload } from './MetricsEngine'
import MiniBarChart from './MiniBarChart'

export default function WhatIfPanel(){
  const [pattern, setPattern] = useState('mixed')
  const [algo, setAlgo] = useState('FCFS')
  const [quantum, setQuantum] = useState(4)
  const [workload, setWorkload] = useState(generateWorkload('mixed',6))
  const [result, setResult] = useState(null)

  const runPreview = ()=>{
    const procs = cloneProcesses(workload)
    let out
    if(algo==='FCFS') out = simulateFCFS(procs)
    if(algo==='SJF') out = simulateSJF(procs)
    if(algo==='RR') out = simulateRR(procs, quantum)
    if(algo==='PRIORITY') out = simulatePriority(procs)
    setResult(out)
  }

  const onGenerate = ()=> setWorkload(generateWorkload(pattern,6))
  const recommended = predictQuantum(workload)

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">What‑If Metrics</h3>
      <div className="grid grid-cols-2 gap-2">
        <select value={pattern} onChange={e=>setPattern(e.target.value)} className="p-2 bg-slate-800 rounded text-sm">
          <option value="mixed">Mixed</option>
          <option value="cpu">CPU-bound</option>
          <option value="io">I/O-bound</option>
          <option value="light">Light</option>
          <option value="heavy">Heavy</option>
        </select>
        <button className="px-3 py-2 bg-slate-700 rounded" onClick={onGenerate}>Generate Workload</button>
      </div>

      <div className="flex items-center gap-2">
        <select value={algo} onChange={e=>setAlgo(e.target.value)} className="p-2 bg-slate-800 rounded text-sm">
          <option>FCFS</option>
          <option>SJF</option>
          <option>RR</option>
          <option>PRIORITY</option>
        </select>
        <input type="number" value={quantum} onChange={e=>setQuantum(Number(e.target.value)||1)} className="w-20 p-2 bg-slate-800 rounded" />
        <button className="px-3 py-2 bg-blue-600 rounded text-white" onClick={runPreview}>Run Preview</button>
        <button className="px-3 py-2 bg-amber-600 rounded text-white" onClick={()=>setQuantum(recommended)}>Predict Quantum ({recommended})</button>
      </div>

      {result && (
        <div className="bg-slate-800/60 rounded p-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div><strong>Avg Waiting:</strong> {result.avgWaiting} ms</div>
              <div><strong>Avg Turnaround:</strong> {result.avgTurnaround} ms</div>
              <div><strong>Avg Response:</strong> {result.avgResponse} ms</div>
            </div>
            <div>
              <div><strong>Context Switches:</strong> {result.contextSwitches}</div>
              <div><strong>CPU Utilization:</strong> {result.cpuUtilization}%</div>
              <div><strong>Throughput:</strong> {Math.round(result.throughput*100)/100} jobs/unit</div>
            </div>
          </div>
          <div className="mt-3">
            <MiniBarChart data={[{key:algo, value: result.avgWaiting, color:'#60a5fa'}]} />
          </div>
        </div>
      )}

      <div className="text-[12px] text-gray-400">
        <strong>Workload Preview:</strong>
        <div className="mt-2 flex flex-wrap gap-2">
          {workload.map(w=> (
            <div key={w.id} className="px-2 py-1 bg-white/5 rounded text-[11px]">
              {w.name} b:{w.burst} p:{w.priority}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
