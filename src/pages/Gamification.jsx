import React from 'react'

export default function Gamification(){
  return (
    <PageLayout
      title="Gamification Layer"
      subtitle="Challenge configs, scoring, badges, leaderboard (scaffold).">
      <div className="card-surface p-6 text-xs space-y-4">
        <h3 className="font-semibold text-sm">Challenge Ideas</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>Scheduler Sprint: achieve target avg waiting</li>
          <li>Deadlock Slayer: detect & recover minimal kills</li>
          <li>Memory Tetris: minimize external fragmentation</li>
        </ul>
      </div>
    </PageLayout>
  )
}

function PageLayout({ title, subtitle, children }){
  return (
    <section className="py-20 max-w-5xl mx-auto px-6 space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-3">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}