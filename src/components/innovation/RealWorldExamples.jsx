import React from 'react'

export default function RealWorldExamples(){
  const list = [
    { os: 'Linux', algo: 'CFS (Fair scheduler)', note: 'Proportional fairness, uses vruntime; akin to priority+RR' },
    { os: 'Windows', algo: 'Round Robin + Priorities', note: 'Preemptive, priority-based timeslices' },
    { os: 'macOS', algo: 'Multilevel feedback / CFS-like', note: 'Hybrid strategies for responsiveness' },
    { os: 'Unix (classic)', algo: 'FCFS / SJF hybrids', note: 'Older systems favored simplicity' }
  ]
  return (
    <div>
      <h3 className="font-semibold">Real-world OS Examples</h3>
      <ul className="mt-2 text-sm text-gray-300">
        {list.map(l=> (
          <li key={l.os} className="mb-2">
            <div className="font-semibold">{l.os}: <span className="text-[13px] text-indigo-200">{l.algo}</span></div>
            <div className="text-[12px] text-gray-400">{l.note}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
