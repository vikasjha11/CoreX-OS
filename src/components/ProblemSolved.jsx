import React, { useState } from 'react'
import { IconBolt, IconShield, IconCloud, IconArrowRight } from './ui-icons'

const problems = [
  {
    title: 'Scheduling Was Opaque',
    impact: 'Hard to see latency, turnaround and fairness across algorithms.',
    icon: <IconBolt className="w-5 h-5" />,
    solutions: [
      'Live Gantt timeline updates immediately after each run.',
      'Auto‑computed metrics: avg waiting, turnaround, total time, CPU util.',
      'Instant algorithm switching (FCFS, SJF, Priority, RR, MLQ) for side‑by‑side comparison.',
      'Round Robin quantum tweak without resetting state.'
    ]
  },
  {
    title: 'Memory Was Invisible',
    impact: 'Fragmentation + fit strategy effects were guesswork.',
    icon: <IconCloud className="w-5 h-5" />,
    solutions: [
      'Interactive memory map blocks with allocation colouring.',
      'First / Best / Worst Fit strategy toggles.',
      'Quick release buttons to simulate churn & fragmentation.',
      'Process metadata includes memory footprint for allocation realism.'
    ]
  },
  {
    title: 'Deadlock Felt Abstract',
    impact: 'Determining safe vs unsafe state slowed experimentation.',
    icon: <IconShield className="w-5 h-5" />,
    solutions: [
      'Banker safety check action for immediate status.',
      'Planned wait‑for graph visualization (placeholder).',
      'Structured resource model ready for allocation vectors.',
      'Clear SAFE / UNSAFE feedback loop.'
    ]
  },
  {
    title: 'Kernel vs User Blur',
    impact: 'Privilege boundaries & syscall context unclear.',
    icon: <IconBolt className="w-5 h-5" />,
    solutions: [
      'Shell component to stage user‑level commands.',
      'Planned simulated system calls (fork, wait, exit).',
      'Future elevation flag (sudo) to demonstrate restricted ops.'
    ]
  },
  {
    title: 'Security Too Theoretical',
    impact: 'RBAC & elevation effects not observable.',
    icon: <IconShield className="w-5 h-5" />,
    solutions: [
      'Planned role model (viewer/user/admin) in state store.',
      'Elevation timeout concept (sudo window).',
      'Audit log scaffold for future event capture.',
      'Guard pattern planned around mutating actions.'
    ]
  },
  {
    title: 'Concepts Were Siloed',
    impact: 'Hard to correlate scheduling, memory and sync outcomes.',
    icon: <IconCloud className="w-5 h-5" />,
    solutions: [
      'Unified state store bridging processes + memory blocks.',
      'Shared metrics surface after each scheduling run.',
      'Memory allocation tied directly to process entries.'
    ]
  },
  {
    title: 'Passive Learning',
    impact: 'Low retention with static reading.',
    icon: <IconBolt className="w-5 h-5" />,
    solutions: [
      'Immediate feedback loops (run → visualize → adjust).',
      'Forthcoming challenge loops & scoring hooks.',
      'Interactive parameter tweaking (quantum, priorities, sizes).'
    ]
  },
  {
    title: 'Hard to Compare Algorithms',
    impact: 'Manual recalculation slowed experimentation.',
    icon: <IconCloud className="w-5 h-5" />,
    solutions: [
      'One‑click algorithm switch retains process set.',
      'Metrics recomputed automatically after each run.',
      'Consistent Gantt color & segment layout for visual parity.'
    ]
  }
]

export default function ProblemSolved() {
  const [open, setOpen] = useState(null)

  function toggle(idx) {
    setOpen(o => (o === idx ? null : idx))
  }

  return (
    <section id="problems" className="py-28 bg-black relative overflow-hidden">
      {/* Ambient gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] bg-indigo-600/15 blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] bg-blue-600/10 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <header className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Problem<span className="text-indigo-500">Solved</span>
            </h2>
            <p className="mt-5 text-sm md:text-base text-gray-400 leading-relaxed">
              Real friction points in understanding OS internals—each expanded item reveals how the platform resolves it.
            </p>
        </header>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {problems.map((p, idx) => {
            const isOpen = open === idx
            return (
              <div
                key={p.title}
                className={`group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition
                            ${isOpen ? 'bg-white/10 border-indigo-500/40' : 'hover:bg-white/[0.08]'}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 mt-0.5 shrink-0 rounded-xl bg-gradient-to-br from-indigo-600/30 to-blue-600/20 flex items-center justify-center text-indigo-300">
                      {p.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[13px] font-semibold text-white leading-snug flex items-center justify-between">
                        <span>{p.title}</span>
                        <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[11px] text-indigo-300">
                          {isOpen ? '−' : '+'}
                        </span>
                      </h3>
                      <p className="mt-2 text-[11px] text-gray-400">
                        {p.impact}
                      </p>
                    </div>
                  </div>
                </button>

                <div
                  className="px-6 pb-6 overflow-hidden transition-[grid-template-rows] grid"
                  style={{
                    gridTemplateRows: isOpen ? '1fr' : '0fr'
                  }}
                >
                  <div className="min-h-0">
                    <ul className="mt-1 pl-1 space-y-2 text-[11px] text-gray-300 border-t border-white/10 pt-4">
                      {p.solutions.map((s,i)=>(
                        <li key={i} className="flex gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                    <span className="mt-4 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-indigo-400/80">
                      Impact <IconArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-14 flex flex-wrap gap-4 text-xs text-gray-400">
          <Badge>Live Gantt</Badge>
          <Badge>Fragmentation Map</Badge>
          <Badge>Multi‑Algorithm</Badge>
          <Badge>Unified State</Badge>
          <Badge>AI Advisor (Planned)</Badge>
        </div>
      </div>
    </section>
  )
}

function Badge({ children }) {
  return (
    <span className="px-3 h-8 inline-flex items-center rounded-full bg-white/5 border border-white/10 text-[11px] tracking-wide">
      {children}
    </span>
  )
}