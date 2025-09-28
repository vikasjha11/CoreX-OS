import React from 'react'

export default function InnovationPage(){
  return (
    <PageLayout
      title="Innovation Suite"
      subtitle="AI scheduler advisor, what‑if predictions, crash & recovery, evolution timeline.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-surface p-6 text-xs">
          <h3 className="font-semibold text-sm mb-2">AI Scheduler (stub)</h3>
          <p>Analyze current workload and recommend algorithm/quantum.</p>
          <button className="mt-4 px-5 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
            Predict Best Algorithm
          </button>
        </div>
        <div className="card-surface p-6 text-xs">
          <h3 className="font-semibold text-sm mb-2">What‑If Mode (stub)</h3>
          <p>Select algorithm & quantum to preview metrics without committing.</p>
        </div>
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