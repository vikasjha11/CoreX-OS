import React from 'react'
import GanttChart from './visuals/GanttChart'
import MemoryMap from './visuals/MemoryMap'
import Shell from './Shell'
import { useSimulation } from '../state/simulationStore.js'

export default function Dashboard(){
  const metrics = useSimulation(s=>s.scheduling.metrics)
  return (
    <section className="py-20 max-w-7xl mx-auto px-6 space-y-10">
      <h2 className="text-3xl font-semibold tracking-tight">Simulation Dashboard</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <GanttChart />
        <MemoryMap />
        <Shell />
        <div className="border rounded-xl p-4 bg-white dark:bg-white/5 text-sm">
          <h3 className="font-semibold mb-2">Metrics</h3>
          {metrics ? (
            <ul className="space-y-1 text-xs">
              <li>Avg Waiting: {metrics.avgWaiting}</li>
              <li>Avg Turnaround: {metrics.avgTurnaround}</li>
              <li>CPU Util: {metrics.cpuUtilization}%</li>
              <li>Total Time: {metrics.totalTime}</li>
            </ul>
          ) : <div className="text-gray-500">Run a scheduler.</div>}
        </div>
      </div>
    </section>
  )
}