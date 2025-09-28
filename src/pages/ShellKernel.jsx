import React from 'react'
import Shell from '../components/Shell'

export default function ShellKernel(){
  return (
    <PageLayout
      title="Shell & Kernel Modes"
      subtitle="Simulated system calls (fork, wait, exit), user vs kernel privileges (extend with role checks).">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="font-semibold text-sm mb-4">Shell</h3>
          <Shell />
        </div>
        <div className="card-surface p-5 text-xs space-y-4">
          <h3 className="font-semibold text-sm">Planned Extensions</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>sudo elevation simulation</li>
            <li>fork() producing child process with shared arrival</li>
            <li>wait() blocking parent until child completes</li>
            <li>exit() cleanup & resource release</li>
          </ul>
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