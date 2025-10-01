import React from 'react'
import Shell from '../components/Shell.jsx'

export default function ShellKernel() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white pt-20">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
            Shell & Kernel Interface
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Interactive command-line interface for process management, scheduling, and system operations
          </p>
        </div>

        {/* Shell Terminal */}
        <div className="max-w-5xl mx-auto mb-12">
          <Shell />
        </div>

        {/* Quick Guide */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-4 text-blue-400">Quick Start Commands</h3>
            <div className="space-y-2 text-sm font-mono">
              <div><span className="text-green-400">$</span> <span className="text-gray-300">help</span></div>
              <div><span className="text-green-400">$</span> <span className="text-gray-300">add chrome 100 512</span></div>
              <div><span className="text-green-400">$</span> <span className="text-gray-300">add firefox 80 256</span></div>
              <div><span className="text-green-400">$</span> <span className="text-gray-300">ps</span></div>
              <div><span className="text-green-400">$</span> <span className="text-gray-300">status</span></div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-4 text-purple-400">Key Features</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Process management (add, kill, list)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Scheduler configuration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Real-time system monitoring
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Command history (↑/↓ arrows)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Multiple scheduling algorithms
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Interactive terminal experience
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}