import { useState, useRef, useEffect } from 'react';

function useSimpleStore() {
  const [state, setState] = useState({
    processes: [],
    memory: { total: 2048, used: 0 },
    files: { root: [] },
    cwd: 'root',
    algorithm: 'FCFS',
    quantum: 4,
    // scheduler extras
    clock: 0,
    running: null,
    ready: []
  });

  const actions = {
    setState: (newState) => setState((prev) => ({ ...prev, ...newState }))
  };

  return { state, actions };
}

export default function Shell() {
  const { state, actions } = useSimpleStore();
  const [lines, setLines] = useState([{ t: 'system', out: 'CoreXOS Shell v3.0 - Connecting to Custom Kernel...' }]);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [backendActive, setBackendActive] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const addOutput = (input, output, type = 'out') => {
    setLines((prev) => [
      ...prev,
      input ? { t: 'in', out: `$ ${input}` } : null,
      { t: type, out: output }
    ].filter(Boolean));
  };

  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:8000/state');
      if (!res.ok) throw new Error('State fetch failed');
      const s = await res.json();
      actions.setState({
        processes: s.processes || [],
        memory: s.memory || { total: 2048, used: 0 },
        files: s.files || { root: [] },
        cwd: s.cwd || 'root',
        algorithm: s.algorithm || 'FCFS',
        quantum: s.quantum ?? 4,
        clock: s.clock ?? 0,
        running: s.running ?? null,
        ready: s.ready || []
      });
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8000/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'echo ping' })
        });
        if (!res.ok) throw new Error('Backend check failed');
        const data = await res.json();
        // echo ping -> "ping" is returned by server, treat as OK
        if (data && (data.output === 'ping' || data.output)) {
          setBackendActive(true);
          await fetchState();
          setLines((prev) => [...prev, { t: 'system', out: 'Kernel Online' }]);
        } else {
          setBackendActive(false);
          setLines((prev) => [...prev, { t: 'error', out: 'Kernel Offline' }]);
        }
      } catch {
        setBackendActive(false);
        setLines((prev) => [...prev, { t: 'error', out: 'Kernel Offline' }]);
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    if (!backendActive) return;
    const id = setInterval(async () => {
      const ok = await fetchState();
      if (!ok) setBackendActive(false);
    }, 2000);
    return () => clearInterval(id);
  }, [backendActive]);

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

  const run = async (line) => {
    const trimmed = line.trim();
    if (!trimmed || !backendActive) return;

    // Handle client-side clear
    if (trimmed.toLowerCase() === 'clear') {
      setLines([]);
      setCmd('');
      return;
    }

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // echo prompt & command to lines (similar to GUI echo)
    addOutput(trimmed, '', 'in');

    try {
      const res = await fetch('http://localhost:8000/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed })
      });
      if (!res.ok) {
        addOutput(trimmed, `Backend HTTP ${res.status}`, 'error');
        setBackendActive(false);
        setCmd('');
        return;
      }
      const data = await res.json();

      // Update store from backend state if present
      if (data.state) {
        actions.setState({
          processes: data.state.processes || [],
          memory: data.state.memory || { total: 2048, used: 0 },
          files: data.state.files || { root: [] },
          cwd: data.state.cwd || 'root',
          algorithm: data.state.algorithm || 'FCFS',
          quantum: data.state.quantum ?? 4,
          clock: data.state.clock ?? 0,
          running: data.state.running ?? null,
          ready: data.state.ready || []
        });
      }

      // Special clear directive
      if (data.output === '__CLEAR__') {
        setLines([]);
      } else {
        const out = data.output || data.error || 'No response';
        addOutput(trimmed, out, data.error ? 'error' : 'out');
      }
    } catch (err) {
      addOutput(trimmed, `Backend error: ${err.message}`, 'error');
      setBackendActive(false);
    }
    setCmd('');
  };

  const getLineColor = (type) => {
    switch (type) {
      case 'in': return 'text-green-300';
      case 'out': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'system': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const runningProc = state.processes.find(p => p.id === state.running);
  const cpuLabel = runningProc ? `${runningProc.name}(${runningProc.id})` : 'idle';

  return (
    <div className="card-surface bg-gray-900/80 backdrop-blur-sm border-gray-700/50 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className={`w-3 h-3 rounded-full ${backendActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-sm text-gray-400 font-medium">
            CoreXOS Custom Shell {backendActive ? '(Online)' : '(Offline)'}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {state.processes.length} processes | {state.algorithm} | Q:{state.quantum} | t:{state.clock} | CPU:{cpuLabel}
        </div>
      </div>

      <div className="p-4 h-96 flex flex-col bg-black/90">
        <div className="flex-1 overflow-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent" ref={scrollRef}>
          {lines.map((l, i) => (
            <div key={i} className={`${getLineColor(l.t)} leading-relaxed`}>
              <pre className="whitespace-pre-wrap font-mono text-sm">{l.out}</pre>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (cmd.trim()) run(cmd); }}
          className="flex items-center gap-3 pt-3 border-t border-gray-700/50 mt-2"
        >
          <span className="text-green-300 font-mono font-bold">$</span>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!backendActive}
            className={`flex-1 bg-transparent outline-none font-mono text-sm placeholder-gray-500 focus:placeholder-gray-400 transition-colors ${backendActive ? 'text-green-400' : 'text-gray-600 cursor-not-allowed'}`}
            placeholder={backendActive ? "Type a command..." : "Kernel Offline"}
            autoFocus
          />
          <div className={`w-2 h-5 animate-pulse ${backendActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </form>
      </div>

      <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>↑/↓ for command history • try: add P1 2 64 8, setalg RR, setq 3, run 10</span>
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${backendActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {backendActive ? 'Custom Kernel Active' : 'Kernel Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
