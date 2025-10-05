import React, { useState, useRef, useEffect } from 'react';


function useSimpleStore() {
  const [state, setState] = useState({
    processes: [],
    algorithm: 'FCFS',
    quantum: 4,
    memory: { total: 2048, used: 0 }, // KB
    files: { '/': [] },
    cwd: '/'
  });

  const actions = {
    addProcess: (proc) => {
      const newProc = {
        id: Date.now().toString(),
        name: proc.name,
        priority: proc.priority,
        memory: proc.memory,
        state: 'ready'
      };
      setState(prev => ({
        ...prev,
        processes: [...prev.processes, newProc],
        memory: { ...prev.memory, used: prev.memory.used + proc.memory }
      }));
    },
    removeProcess: (pid) => {
      const proc = state.processes.find(p => p.id === pid);
      if (proc) {
        setState(prev => ({
          ...prev,
          processes: prev.processes.filter(p => p.id !== pid),
          memory: { ...prev.memory, used: prev.memory.used - proc.memory }
        }));
      }
    },
    waitProcess: (pid) => {
      const proc = state.processes.find(p => p.id === pid);
      if (proc) {
        proc.state = 'waiting';
        setState({ ...state });
      }
    },
    createFile: (filename) => {
      const dir = state.cwd;
      if (!state.files[dir]) state.files[dir] = [];
      state.files[dir].push({ name: filename, content: '' });
      setState({ ...state });
    },
    removeFile: (filename) => {
      const dir = state.cwd;
      state.files[dir] = state.files[dir].filter(f => f.name !== filename);
      setState({ ...state });
    },
    mkdir: (dir) => {
      if (!state.files[dir]) state.files[dir] = [];
      setState({ ...state });
    },
    rmdir: (dir) => {
      delete state.files[dir];
      setState({ ...state });
    },
    cd: (dir) => {
      if (!state.files[dir]) return false;
      setState({ ...state, cwd: dir });
      return true;
    },
  };

  return { state, actions };
}

export default function Shell() {
  const { state, actions } = useSimpleStore();
  const [lines, setLines] = useState([{ t: 'system', out: 'CoreXOS Shell v1.0 - Type "help" for commands' }]);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const addOutput = (input, output, type = 'out') => {
    setLines(prev => [...prev, { t: 'in', out: `$ ${input}` }, { t: type, out: output }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCmd(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCmd(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCmd('');
      }
    }
  };

  const run = (line) => {
    if (!line.trim()) return;
    const parts = line.trim().split(/\s+/);
    const c = parts[0].toLowerCase();

    setHistory(prev => [...prev, line]);
    setHistoryIndex(-1);

    try {
      switch (c) {

  
        case 'add':
          if (parts.length < 4) return addOutput(line, 'Usage: add <name> <priority> <memory>', 'error');
          const name = parts[1];
          const priority = parseInt(parts[2]);
          const memory = parseInt(parts[3]);
          if (isNaN(priority) || isNaN(memory)) return addOutput(line, 'Error: priority and memory must be numbers', 'error');
          actions.addProcess({ name, priority, memory });
          addOutput(line, `Process '${name}' added (priority: ${priority}, memory: ${memory}KB)`);
          break;

        case 'ps':
          if (state.processes.length === 0) addOutput(line, 'No processes running.');
          else {
            const header = 'PID       NAME       PRIORITY  MEMORY  STATE';
            const separator = '-'.repeat(50);
            const rows = state.processes.map(p =>
              `${String(p.id).padEnd(10)} ${String(p.name).padEnd(10)} ${String(p.priority).padEnd(8)} ${String(p.memory).padEnd(7)} ${p.state}`
            );
            addOutput(line, [header, separator, ...rows].join('\n'));
          }
          break;

        case 'kill':
          if (!parts[1]) return addOutput(line, 'Usage: kill <pid>', 'error');
          actions.removeProcess(parts[1]);
          addOutput(line, `Process ${parts[1]} terminated`);
          break;

        case 'wait':
          if (!parts[1]) return addOutput(line, 'Usage: wait <pid>', 'error');
          actions.waitProcess(parts[1]);
          addOutput(line, `Waiting for process ${parts[1]} to finish...`);
          break;


        case 'mem':
          addOutput(line, `Memory Usage: ${state.memory.used}KB / ${state.memory.total}KB`);
          break;

        case 'free':
          addOutput(line, `Free Memory: ${state.memory.total - state.memory.used}KB`);
          break;


        case 'ls':
          const files = state.files[state.cwd]?.map(f => f.name) || [];
          addOutput(line, files.join('  ') || '(empty)');
          break;

        case 'cd':
          if (!parts[1]) return addOutput(line, 'Usage: cd <directory>', 'error');
          if (!actions.cd(parts[1])) addOutput(line, `Directory not found: ${parts[1]}`, 'error');
          else addOutput(line, `Current directory: ${state.cwd}`);
          break;

        case 'mkdir':
          if (!parts[1]) return addOutput(line, 'Usage: mkdir <directory>', 'error');
          actions.mkdir(parts[1]);
          addOutput(line, `Directory created: ${parts[1]}`);
          break;

        case 'rmdir':
          if (!parts[1]) return addOutput(line, 'Usage: rmdir <directory>', 'error');
          actions.rmdir(parts[1]);
          addOutput(line, `Directory removed: ${parts[1]}`);
          break;

        case 'touch':
          if (!parts[1]) return addOutput(line, 'Usage: touch <filename>', 'error');
          actions.createFile(parts[1]);
          addOutput(line, `File created: ${parts[1]}`);
          break;

        case 'rm':
          if (!parts[1]) return addOutput(line, 'Usage: rm <filename>', 'error');
          actions.removeFile(parts[1]);
          addOutput(line, `File removed: ${parts[1]}`);
          break;

        case 'cat':
          const file = state.files[state.cwd]?.find(f => f.name === parts[1]);
          if (!file) addOutput(line, `File not found: ${parts[1]}`, 'error');
          else addOutput(line, file.content || '');
          break;

  
        case 'help':
          addOutput(line, `
Available commands:

Process Management:
 add <name> <priority> <memory> - Add a process
 ps                            - Show running processes
 kill <pid>                    - Kill process
 wait <pid>                    - Wait for process

Memory Management:
 mem                           - Show memory usage
 free                          - Show free memory

File Operations:
 ls                            - List files
 cd <directory>                - Change directory
 mkdir <directory>             - Create directory
 rmdir <directory>             - Remove directory
 touch <filename>              - Create file
 rm <filename>                 - Delete file
 cat <filename>                - Show file contents

System Status:
 status                        - Show system status
 uptime                        - Show system uptime
 top                           - Show top processes

Shell Control:
 clear                         - Clear screen
 exit                          - Exit shell

Networking (Optional):
 ping <address>                - Ping server
 ifconfig                      - Show network interfaces
          `);
          break;

        case 'status':
          addOutput(line, `Processes: ${state.processes.length}, Memory: ${state.memory.used}/${state.memory.total}KB, Algorithm: ${state.algorithm}, Quantum: ${state.quantum}ms`);
          break;

        case 'uptime':
          addOutput(line, `System uptime: ${Math.floor(performance.now() / 1000)} seconds`);
          break;

        case 'top':
          const topProcesses = state.processes.slice(0, 5).map(p => `${p.id} ${p.name} ${p.memory}KB ${p.state}`);
          addOutput(line, topProcesses.join('\n') || 'No processes');
          break;

        case 'clear':
          setLines([{ t: 'system', out: 'CoreXOS Shell v1.0 - Type "help" for commands' }]);
          return;

        case 'exit':
          addOutput(line, 'Exiting shell...');
          break;

        case 'ping':
          if (!parts[1]) return addOutput(line, 'Usage: ping <address>', 'error');
          addOutput(line, `Pinging ${parts[1]}... (simulated)`);
          break;

        case 'ifconfig':
          addOutput(line, `Interface eth0: 192.168.1.2 (simulated)`);
          break;

        default:
          addOutput(line, `Command not found: ${c}. Type 'help' for commands.`, 'error');
      }
    } catch (err) {
      addOutput(line, `Error: ${err.message}`, 'error');
    }
  };

  const getLineColor = (type) => {
    switch (type) {
      case 'in': return 'text-green-300';
      case 'out': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-400';
      case 'system': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

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
          onSubmit={e => { e.preventDefault(); if (cmd.trim()) { run(cmd); setCmd(''); } }}
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
  );
}
