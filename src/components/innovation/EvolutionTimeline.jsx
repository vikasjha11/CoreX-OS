import React from 'react'
import { cloneProcesses, simulateRR, generateWorkload } from './MetricsEngine'

export default function EvolutionTimeline({ pattern='mixed' }){
  const procs = cloneProcesses(generateWorkload(pattern,6))
  const points = []
  for(let q=1;q<=8;q++){
    const res = simulateRR(procs, q)
    points.push({ q, value: res.avgWaiting })
  }

  const max = Math.max(...points.map(p=>p.value),1)
  return (
    <svg width="320" height="80" viewBox="0 0 320 80">
      {/* axis */}
      <line x1={20} y1={60} x2={300} y2={60} stroke="#334155" />
      {points.map((p,i)=>{
        const x = 20 + (i*(260/(points.length-1)))
        const h = Math.round((p.value/max)*40)
        const y = 60 - h
        return (
          <g key={p.q}>
            <circle cx={x} cy={y} r={3} fill="#60a5fa" />
            <text x={x} y={75} fontSize="9" fill="#cbd5e1" textAnchor="middle">q{p.q}</text>
          </g>
        )
      })}
      {/* line path */}
      <path d={points.map((p,i)=>{
        const x = 20 + (i*(260/(points.length-1)))
        const h = Math.round((p.value/max)*40)
        const y = 60 - h
        return `${i===0?'M':'L'} ${x} ${y}`
      }).join(' ')} fill="none" stroke="#7c3aed" strokeWidth={1.5} />
    </svg>
  )
}
