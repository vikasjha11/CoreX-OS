import React from 'react'
import GanttChart from '../components/visuals/GanttChart'
import MemoryMap from '../components/visuals/MemoryMap'

export default function VisualizationReporting(){
  return (
    <PageLayout
      title="Visualization & Reporting"
      subtitle="Unified dashboard components, export metrics (CSV/PDF extension point).">
      <div className="grid md:grid-cols-2 gap-8">
        <GanttChart />
        <MemoryMap />
      </div>
      <div className="card-surface p-6 text-xs">
        <h3 className="font-semibold text-sm mb-2">Export (stub)</h3>
        <button className="px-5 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
          Export Metrics (CSV)
        </button>
      </div>
    </PageLayout>
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