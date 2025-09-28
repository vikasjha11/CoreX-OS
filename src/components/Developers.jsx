import React from 'react'
import { IconBolt, IconCloud, IconShield } from './ui-icons'

const team = [
  {
    name: 'Vikas Kumar Jha',
    role: 'Scheduling & Core Logic',
    focus: 'CPU algorithms, MLQ extension, metrics engine',
    icon: <IconBolt className="w-5 h-5" />
  },
  {
    name: 'Srishti Rautela',
    role: 'Memory & Visualization',
    focus: 'Allocation strategies, fragmentation map, Gantt UX',
    icon: <IconCloud className="w-5 h-5" />
  },
  {
    name: 'Vishwajeet Kumar Nikhil',
    role: 'Deadlock & Concurrency',
    focus: 'Banker safety, sync primitives, future graph model',
    icon: <IconShield className="w-5 h-5" />
  },
  {
    name: 'Stuti Tyagi',
    role: 'Security & Innovation',
    focus: 'RBAC design, shell syscall layer, AI advisor stubs',
    icon: <IconBolt className="w-5 h-5" />
  }
]

export default function Developers() {
  return (
    <section id="developers" className="py-28 bg-black relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-3xl rounded-full" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6">
        <header className="max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
            The <span className="text-indigo-500">Developers</span>
          </h2>
          <p className="mt-5 text-sm md:text-base text-gray-400 leading-relaxed">
            Focused contributors driving each subsystem—clear ownership, rapid iteration.
          </p>
        </header>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {team.map(m => (
            <div
              key={m.name}
              className="group relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/[0.08] transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/40 to-blue-600/30 flex items-center justify-center text-indigo-200">
                  {m.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-snug">{m.name}</h3>
                  <p className="text-[11px] text-indigo-300 mt-0.5">{m.role}</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">{m.focus}</p>
              <div className="mt-5 flex gap-2">
                <span className="px-2.5 h-7 rounded-full bg-white/5 border border-white/10 text-[10px] tracking-wide text-gray-300 flex items-center">
                  Core
                </span>
                <span className="px-2.5 h-7 rounded-full bg-white/5 border border-white/10 text-[10px] tracking-wide text-gray-300 flex items-center">
                  OSSim
                </span>
              </div>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none border border-indigo-500/30" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}