import React, { useState, useRef, useEffect } from 'react';

function useSimpleStore() {
  const [state, setState] = useState({
    processes: [],
    memory: { total: 2048, used: 0 },
    files: { root: [] },
    cwd: 'root',
    algorithm: 'FCFS',
    quantum: 4
  });

  const actions = {
    setState: (newState) => setState((prev) => ({ ...prev, ...newState }))
  };

  return { state, actions };
}

export default function Shell() {
  const { state } = useSimpleStore();
  const [lines, setLines] = useState([{ t: 'system', out: 'CoreXOS Shell v3.0 - Connecting to Custom Kernel...' }]);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [backendActive, setBackendActive] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8000/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'echo ping' })
        });
        if (res.ok) {
          setBackendActive(true);
          addOutput('', 'Kernel Online', 'system');
        } else {
          setBackendActive(false);
          addOutput('', 'Kernel Offline', 'error');
        }
      } catch {
        setBackendActive(false);
        addOutput('', 'Kernel Offline', 'error');
      }
    };
    checkBackend();
  }, []);

  const addOutput = (input, output, type = 'out') => {
    setLines((prev) => [
      ...prev,
      input ? { t: 'in', out: `$ ${input}` } : null,
      { t: type, out: output }
    ].filter(Boolean));
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

  const run = async (line) => {
    if (!line.trim() || !backendActive) return;
    setHistory((prev) => [...prev, line]);
    setHistoryIndex(-1);

    try {
      const res = await fetch('http://localhost:8000/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: line })
      });
      const data = await res.json();
      addOutput(line, data.output || data.error || 'No response', data.error ? 'error' : 'out');
    } catch (err) {
      addOutput(line, `Backend error: ${err.message}`, 'error');
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
        <div className="text-xs text-gray-500">{state.processes.length} processes | {state.algorithm} | Q:{state.quantum}ms</div>
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
          <span>↑/↓ for command history</span>
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${backendActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {backendActive ? 'Custom Kernel Active' : 'Kernel Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
