import React from 'react'

const list = [
  { k: 'AI Scheduler', v: 'Heuristic / ML selection guidance with predicted metrics.' },
  { k: 'What‑If Mode', v: 'Preview waiting & turnaround before execution.' },
  { k: 'Crash & Recovery', v: 'Inject failure, view kernel dump & restart path.' },
  { k: 'Evolution Timeline', v: 'Compare legacy vs modern OS strategies interactively.' }
]

const Innovation = () => (
  <section id="innovation" className="py-24 bg-gradient-to-b from-black to-black/80">
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">Innovation Layer</h2>
      <p className="mt-4 max-w-xl text-sm md:text-base text-gray-400">
        Forward‑looking capabilities extending classic OS education.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {list.map(i=>(
          <div key={i.k} className="p-6 rounded-2xl border border-white/10 bg-white/[0.05]">
            <h3 className="text-sm font-medium text-white">{i.k}</h3>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">{i.v}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default Innovation