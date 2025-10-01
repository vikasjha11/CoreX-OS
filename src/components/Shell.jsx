import React, { useState, useRef, useEffect } from 'react'

// Simple mock store for the shell - no external dependencies
function useSimpleStore() {
  const [state, setState] = useState({
    processes: [],
    algorithm: 'FCFS',
    quantum: 4
  })

  const actions = {
    addProcess: (proc) => {
      const newProc = {
        id: Date.now().toString(),
        name: proc.name,
        burst: proc.burst,
        memory: proc.memory,
        state: 'ready'
      }
      setState(prev => ({
        ...prev,
        processes: [...prev.processes, newProc]
      }))
    },
    removeProcess: (pid) => {
      setState(prev => ({
        ...prev,
        processes: prev.processes.filter(p => p.id !== pid)
      }))
    },
    setAlgorithm: (algo) => {
      setState(prev => ({ ...prev, algorithm: algo }))
    },
    setQuantum: (q) => {
      setState(prev => ({ ...prev, quantum: q }))
    }
  }

  return { state, actions }
}

export default function Shell() {
  const { state, actions } = useSimpleStore()
  const [lines, setLines] = useState([
    { t: 'system', out: 'CoreXOS Shell v1.0 - Type "help" for commands' }
  ])
  const [cmd, setCmd] = useState('')
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef()

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  function addOutput(input, output, type = 'out') {
    setLines(prev => [
      ...prev,
      { t: 'in', out: `$ ${input}` },
      { t: type, out: output }
    ])
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCmd(history[history.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCmd(history[history.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCmd('')
      }
    }
  }

  function run(line) {
    const parts = line.trim().split(/\s+/)
    const c = parts[0].toLowerCase()
    
    if (!line.trim()) return
    
    // Add to history
    setHistory(prev => [...prev, line])
    setHistoryIndex(-1)

    try {
      switch(c) {
        case 'help':
          addOutput(line, `Available commands:
  add <name> <burst> <memory>  - Add process
  algo <fcfs|sjf|rr|priority> - Set algorithm
  quantum <n>                  - Set time quantum
  ps                          - List processes
  kill <pid>                  - Kill process
  status                      - Show system status
  clear                       - Clear screen`)
          break

        case 'add':
          if (parts.length < 4) {
            addOutput(line, 'Usage: add <name> <burst> <memory>', 'error')
            break
          }
          const name = parts[1]
          const burst = parseInt(parts[2])
          const memory = parseInt(parts[3])
          
          if (isNaN(burst) || isNaN(memory)) {
            addOutput(line, 'Error: burst and memory must be numbers', 'error')
            break
          }
          
          actions.addProcess({ name, burst, memory })
          addOutput(line, `Process '${name}' added (burst: ${burst}ms, memory: ${memory}KB)`)
          break

        case 'ps':
          if (state.processes.length === 0) {
            addOutput(line, 'No processes')
          } else {
            const header = 'PID      NAME       BURST   MEMORY  STATE'
            const separator = '-'.repeat(45)
            const rows = state.processes.map(p => 
              `${String(p.id).padEnd(8)} ${String(p.name).padEnd(10)} ${String(p.burst).padEnd(7)} ${String(p.memory).padEnd(7)} ${p.state}`
            )
            addOutput(line, [header, separator, ...rows].join('\n'))
          }
          break

        case 'kill':
          if (!parts[1]) {
            addOutput(line, 'Usage: kill <pid>', 'error')
            break
          }
          const killPid = parts[1]
          const process = state.processes.find(p => p.id === killPid)
          if (!process) {
            addOutput(line, `Process ${killPid} not found`, 'error')
            break
          }
          actions.removeProcess(killPid)
          addOutput(line, `Process ${killPid} terminated`)
          break

        case 'algo':
          if (!parts[1]) {
            addOutput(line, `Current algorithm: ${state.algorithm}`, 'info')
            break
          }
          const validAlgos = ['fcfs', 'sjf', 'rr', 'priority']
          const newAlgo = parts[1].toLowerCase()
          if (!validAlgos.includes(newAlgo)) {
            addOutput(line, `Invalid algorithm. Valid: ${validAlgos.join(', ')}`, 'error')
            break
          }
          actions.setAlgorithm(newAlgo.toUpperCase())
          addOutput(line, `Algorithm set to: ${newAlgo.toUpperCase()}`)
          break

        case 'quantum':
          if (!parts[1]) {
            addOutput(line, `Current quantum: ${state.quantum}ms`, 'info')
            break
          }
          const q = parseInt(parts[1])
          if (isNaN(q) || q <= 0) {
            addOutput(line, 'Quantum must be a positive number', 'error')
            break
          }
          actions.setQuantum(q)
          addOutput(line, `Time quantum set to: ${q}ms`)
          break

        case 'status':
          addOutput(line, `Algorithm: ${state.algorithm} | Quantum: ${state.quantum}ms | Processes: ${state.processes.length}`)
          break

        case 'clear':
          setLines([{ t: 'system', out: 'CoreXOS Shell v1.0 - Type "help" for commands' }])
          return

        default:
          addOutput(line, `Command not found: ${c}. Type 'help' for available commands.`, 'error')
      }
    } catch (error) {
      addOutput(line, `Error: ${error.message}`, 'error')
    }
  }

  function getLineColor(type) {
    switch(type) {
      case 'in': return 'text-green-300'
      case 'out': return 'text-green-400'
      case 'error': return 'text-red-400'
      case 'info': return 'text-blue-400'
      case 'system': return 'text-yellow-400'
      default: return 'text-green-400'
    }
  }

  return (
    <div className="card-surface bg-gray-900/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-sm text-gray-400 font-medium">CoreXOS Terminal</span>
        </div>
        <div className="text-xs text-gray-500">
          {state.processes.length} processes | {state.algorithm} | Q:{state.quantum}ms
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-4 h-96 flex flex-col bg-black/90">
        <div className="flex-1 overflow-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent" ref={scrollRef}>
          {lines.map((l, i) => (
            <div key={i} className={`${getLineColor(l.t)} leading-relaxed`}>
              <pre className="whitespace-pre-wrap font-mono text-sm">{l.out}</pre>
            </div>
          ))}
        </div>
        
        {/* Input Line */}
        <form 
          onSubmit={e => { 
            e.preventDefault() 
            if (cmd.trim()) { 
              run(cmd) 
              setCmd('') 
            } 
          }} 
          className="flex items-center gap-3 pt-3 border-t border-gray-700/50 mt-2"
        >
          <span className="text-green-300 font-mono font-bold">$</span>
          <input 
            value={cmd} 
            onChange={e => setCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-green-400 font-mono text-sm placeholder-gray-500 focus:placeholder-gray-400 transition-colors" 
            placeholder="Type a command... (try 'help')"
            autoFocus
          />
          <div className="w-2 h-5 bg-green-400 animate-pulse"></div>
        </form>
      </div>

      {/* Terminal Footer */}
      <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Use ↑/↓ for command history</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Shell Ready
          </span>
        </div>
      </div>
    </div>
  )
}