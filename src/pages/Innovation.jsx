import React from 'react'
import RecommendationPanel from '../components/innovation/AIRecommendationPanel'
import WhatIfPanel from '../components/innovation/WhatIfPanel'
import CrashRecoveryPanel from '../components/innovation/CrashRecoveryPanel'
import RealWorldExamples from '../components/innovation/RealWorldExamples'
import EvolutionTimeline from '../components/innovation/EvolutionTimeline'

export default function InnovationPage(){
  return (
    <PageLayout
      title="Innovation Suite"
      subtitle="Scheduler advisor, what‑if predictions, crash & recovery, evolution timeline.">
      <div className="grid gap-6 md:grid-cols-2">
          <div className="card-surface p-6 text-sm">
          <RecommendationPanel />
        </div>
        <div className="card-surface p-6 text-sm">
          <WhatIfPanel />
        </div>

        <div className="card-surface p-6 text-sm">
          <CrashRecoveryPanel />
        </div>
        <div className="card-surface p-6 text-sm">
          <RealWorldExamples />
          <div className="mt-4">
            <h4 className="font-semibold">Evolution Preview</h4>
            <EvolutionTimeline />
          </div>
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