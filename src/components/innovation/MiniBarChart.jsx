import React from 'react'

export default function MiniBarChart({ data = [], label = 'Metric' }){
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <svg width="220" height="80" viewBox="0 0 220 80">
      {data.map((d, i)=>{
        const w = 36
        const gap = 8
        const x = 10 + i*(w+gap)
        const h = Math.max(4, Math.round((d.value/max)*50))
        const y = 60 - h
        return (
          <g key={d.key}>
            <rect x={x} y={y} width={w} height={h} rx="4" fill={d.color || '#60a5fa'} opacity="0.9" />
            <text x={x + w/2} y={74} fontSize="9" fill="#cbd5e1" textAnchor="middle">{d.key}</text>
            <text x={x + w/2} y={y-4} fontSize="9" fill="#fff" textAnchor="middle">{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}
