import { Link } from 'react-router-dom'
import { IconBolt, IconCloud, IconShield } from './ui-icons'

const modules = [
  {
    title: 'Process & Memory Core',
    to: '/process-memory',
    desc: 'Scheduling (FCFS, SJF, Priority, RR, MLQ) + allocation (First / Best / Worst Fit) with Gantt Chart & memory map.',
    icon: <IconBolt className="w-6 h-6" />
  },
  {
    title: 'Shell & Kernel Modes',
    to: '/shell-kernel',
    desc: 'User commands,system call & privilege simulation.',
    icon: <IconBolt className="w-6 h-6" />
  }
  ,
  {
    title: 'Deadlock & Synchronization',
    to: '/deadlock',
    desc: 'Banker safety, detection graph, recovery, classic concurrency patterns.',
    icon: <IconShield className="w-6 h-6" />
  },
  {
    title: 'Gamification Layer',
    to: '/gamification',
    desc: 'Challenges (Scheduler Sprint, Deadlock Slayer, Memory Tetris) & badges.',
    icon: <IconBolt className="w-6 h-6" />,
    badge: 'IN THIRD EVALUATION'
  },
  {
    title: 'Innovation Suite',
    to: '/innovation',
    desc: 'AI scheduler advisor, what‑if predictions & evolution roadmap.',
    icon: <IconCloud className="w-6 h-6" />,    
    badge: 'IN THIRD EVALUATION'
  }
]

const Services = () => (
  <section id="modules" className="py-28 bg-white dark:bg-black">
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-black dark:text-white">Core Modules</h2>
      <p className="mt-4 max-w-xl text-gray-600 dark:text-gray-400 text-sm md:text-base">
        Interactive OS layers—explore each subsystem in depth.
      </p>
      <div className="mt-14 grid gap-8 md:grid-cols-3 xl:grid-cols-4">
        {modules.map(m => (
          <Link
            to={m.to}
            key={m.title}
            className="group relative p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          >
            {m.badge && (
              <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200/70 dark:border-amber-400/20">
                {m.badge}
              </span>
            )}
            <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/10 flex items-center justify-center mb-5">
              {m.icon}
            </div>
            <h3 className="font-semibold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">{m.title}</h3>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{m.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400">
              Open &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  </section>
)

export default Services