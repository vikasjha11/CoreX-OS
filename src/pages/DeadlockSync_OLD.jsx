import React, { useMemo, useState, useRef, useEffect } from 'react'

/**
 * Deadlock & Synchronization
 * - Banker's Algorithm (safe sequence, animated)
 * - Resource Allocation Graph (RAG) cycle detection
 * - Resource requests with safety check
 * - CSV export of current table
 */

export default function DeadlockSync(){
  // State
  const [total, setTotal] = useState({ r1: 10, r2: 10 });
  const [processes, setProcesses] = useState([]); // { id, alloc:{r1,r2}, max:{r1,r2}, finished }
  const [mode, setMode] = useState('banker');     // 'banker' | 'detection'
  const [logs, setLogs] = useState([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [safeSeq, setSafeSeq] = useState([]);
  const [systemState, setSystemState] = useState('idle'); // 'idle' | 'safe' | 'unsafe' | 'deadlock'
  const [showExplanation, setShowExplanation] = useState(true);
  const [currentStep, setCurrentStep] = useState('');
  const [availableFlash, setAvailableFlash] = useState(false);
  const [highlightedNeed, setHighlightedNeed] = useState(-1);
  const logEndRef = useRef(null);

  // Derived values
  const available = useMemo(() => recomputeAvailable(processes, total), [processes, total]);

  // Form refs
  const allocR1Ref = useRef(null); const allocR2Ref = useRef(null);
  const maxR1Ref = useRef(null);   const maxR2Ref = useRef(null);
  const reqPidRef = useRef(null);  const reqR1Ref = useRef(null); const reqR2Ref = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Logging with timestamps and colors
  function logLine(s, type = 'info'){
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { msg: s, type, timestamp }]);
  }
  function clearLogs(){ setLogs([]); setSystemState('idle'); setCurrentStep(''); }

  // Example presets
  function loadSafeExample(){
    setTotal({ r1: 10, r2: 10 });
    const demo = [
      { id:'P1', alloc:{ r1:0, r2:1 }, max:{ r1:7, r2:5 }, finished:false },
      { id:'P2', alloc:{ r1:2, r2:0 }, max:{ r1:3, r2:2 }, finished:false },
      { id:'P3', alloc:{ r1:3, r2:0 }, max:{ r1:9, r2:0 }, finished:false },
      { id:'P4', alloc:{ r1:2, r2:1 }, max:{ r1:2, r2:2 }, finished:false },
      { id:'P5', alloc:{ r1:0, r2:0 }, max:{ r1:4, r2:3 }, finished:false },
    ];
    setProcesses(demo);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setLogs([]);
    setSystemState('idle');
    logLine('Loaded Safe State Example', 'success');
  }

  function loadUnsafeExample(){
    setTotal({ r1: 5, r2: 5 });
    const demo = [
      { id:'P1', alloc:{ r1:2, r2:2 }, max:{ r1:4, r2:4 }, finished:false },
      { id:'P2', alloc:{ r1:2, r2:1 }, max:{ r1:3, r2:3 }, finished:false },
      { id:'P3', alloc:{ r1:1, r2:2 }, max:{ r1:3, r2:4 }, finished:false },
    ];
    setProcesses(demo);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setLogs([]);
    setSystemState('idle');
    logLine('Loaded Unsafe State Example', 'warning');
  }

  function loadDeadlockExample(){
    setTotal({ r1: 4, r2: 4 });
    const demo = [
      { id:'P1', alloc:{ r1:2, r2:0 }, max:{ r1:3, r2:2 }, finished:false },
      { id:'P2', alloc:{ r1:0, r2:2 }, max:{ r1:2, r2:3 }, finished:false },
      { id:'P3', alloc:{ r1:1, r2:1 }, max:{ r1:2, r2:2 }, finished:false },
    ];
    setProcesses(demo);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setLogs([]);
    setSystemState('idle');
    logLine('Loaded Potential Deadlock Example', 'error');
  }

  // Presets
  function resetAll(){
    setProcesses([]);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setSystemState('idle');
    setCurrentStep('');
    clearLogs();
    logLine('Reset all state', 'info');
  }
  function loadDemo(){
    loadSafeExample();
  }

  // Utilities
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  /**
   * Sum allocations and compute remaining available units.
   * @param {Array} procs
   * @param {{r1:number,r2:number}} tot
   * @returns {{r1:number,r2:number}}
   */
  function recomputeAvailable(procs, tot) {
    const used = procs.reduce((acc, p) => {
      acc.r1 += Number(p.alloc.r1||0);
      acc.r2 += Number(p.alloc.r2||0);
      return acc;
    }, {r1:0, r2:0});
    return { r1: Number(tot.r1) - used.r1, r2: Number(tot.r2) - used.r2 };
  }

  /**
   * Compute remaining need of a process (Max - Alloc).
   * @param {{alloc:{r1:number,r2:number},max:{r1:number,r2:number}}} p
   * @returns {{r1:number,r2:number}}
   */
  function computeNeed(p){
    return {
      r1: Number(p.max.r1||0) - Number(p.alloc.r1||0),
      r2: Number(p.max.r2||0) - Number(p.alloc.r2||0),
    };
  }

  /**
   * Banker's Algorithm: try to build a safe sequence.
   * @param {Array} procs
   * @param {{r1:number,r2:number}} tot
   * @returns {{seq:string[], finish:boolean[]}}
   */
  function computeSafeSequence(procs, tot){
    const work = { ...recomputeAvailable(procs, tot) };
    const finish = procs.map(p => !!p.finished);
    const seq = [];
    let progressed = true;

    while (progressed) {
      progressed = false;
      for (let i = 0; i < procs.length; i++) {
        if (finish[i]) continue;
        const p = procs[i];
        const need = computeNeed(p);
        if (need.r1 <= work.r1 && need.r2 <= work.r2) {
          work.r1 += Number(p.alloc.r1||0);
          work.r2 += Number(p.alloc.r2||0);
          finish[i] = true;
          seq.push(p.id);
          progressed = true;
        }
      }
    }
    const allFinished = finish.every(Boolean);
    return { seq: allFinished ? seq : [], finish };
  }

  // Actions: add process
  function addProcessFromForm(){
    const allocR1 = Number(allocR1Ref.current?.value || 0);
    const allocR2 = Number(allocR2Ref.current?.value || 0);
    const maxR1 = Number(maxR1Ref.current?.value || 0);
    const maxR2 = Number(maxR2Ref.current?.value || 0);
    const id = 'P' + (processes.length + 1);
    if (allocR1 > maxR1 || allocR2 > maxR2) {
      alert('Allocation cannot be greater than Max');
      logLine(`Cannot add ${id}: Allocation > Max`, 'error');
      return;
    }
    const proc = { id, alloc: { r1: allocR1, r2: allocR2 }, max: { r1: maxR1, r2: maxR2 }, finished: false };
    setProcesses(prev => [...prev, proc]);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setSystemState('idle');
    logLine(`Added ${id} (alloc ${allocR1},${allocR2} | max ${maxR1},${maxR2})`, 'info');
    
    // Reset form
    if (allocR1Ref.current) allocR1Ref.current.value = '0';
    if (allocR2Ref.current) allocR2Ref.current.value = '0';
    if (maxR1Ref.current) maxR1Ref.current.value = '0';
    if (maxR2Ref.current) maxR2Ref.current.value = '0';
  }

  // Actions: run Banker's stepper (animated)
  async function runBankerStepper({ delay=1000 } = {}) {
    if (!processes.length){
      logLine('No processes to run. Add or Load Demo.', 'warning');
      return;
    }
    
    setCurrentStep('Checking system safety...');
    const { seq, finish } = computeSafeSequence(processes, total);
    logLine(`Starting Banker's Algorithm check. Available: R1=${available.r1}, R2=${available.r2}`, 'info');

    setSafeSeq(seq);
    if (seq.length) {
      setSystemState('safe');
      const indexMap = processes.reduce((m, p, i) => (m[p.id]=i, m), {});
      
      for (let k = 0; k < seq.length; k++) {
        const i = indexMap[seq[k]];
        const p = processes[i];
        const need = computeNeed(p);
        
        setCurrentStep(`Checking ${seq[k]}: Need(${need.r1},${need.r2}) ≤ Available(${available.r1},${available.r2})`);
        setHighlightIdx(i);
        setHighlightedNeed(i);
        await sleep(delay);
        
        setCurrentStep(`${seq[k]} can complete! Resources will be released.`);
        setAvailableFlash(true);
        setTimeout(() => setAvailableFlash(false), 500);
        await sleep(delay / 2);
      }
      
      setHighlightIdx(-1);
      setHighlightedNeed(-1);
      setCurrentStep('✓ Safe sequence found: ' + seq.join(' → '));
      logLine('✅ System is SAFE. Safe sequence: ' + seq.join(' → '), 'success');
      setProcesses(prev => prev.map((p, i) => ({ ...p, finished: finish[i] })));
    } else {
      setHighlightIdx(-1);
      setHighlightedNeed(-1);
      setSafeSeq([]);
      setSystemState('unsafe');
      setCurrentStep('⚠ No safe sequence exists');
      logLine('⚠️ System is NOT SAFE (deadlock potential).', 'error');
      setProcesses(prev => prev.map(p => ({ ...p, finished: false })));
    }
  }

  // Actions: export CSV
  function exportCsv(){
    const rows = [['id','allocR1','allocR2','maxR1','maxR2','needR1','needR2','status']];
    processes.forEach(p => {
      const need = computeNeed(p);
      rows.push([
        p.id, p.alloc.r1, p.alloc.r2, p.max.r1, p.max.r2,
        need.r1, need.r2, (p.finished ? 'Finished' : 'Waiting')
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'processes.csv'; document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
    logLine('Exported processes.csv', 'success');
  }

  // Actions: request resources (granted only if safe)
  function handleRequest(){
    if (!processes.length){
      logLine('No processes to request for.', 'warning');
      return;
    }
    const pid = reqPidRef.current?.value;
    const reqR1 = Number(reqR1Ref.current?.value || 0);
    const reqR2 = Number(reqR2Ref.current?.value || 0);
    const idx = processes.findIndex(p => p.id === pid);
    if (idx < 0) { alert('Invalid process'); return; }

    const p = processes[idx];
    const need = computeNeed(p);
    if (reqR1 > need.r1 || reqR2 > need.r2) {
      alert('Request exceeds process need!');
      logLine(`Request by ${pid} exceeds need!`, 'error');
      return;
    }
    if (reqR1 > available.r1 || reqR2 > available.r2) {
      logLine(`Request by ${pid} cannot be granted (insufficient resources).`, 'warning');
      return;
    }

    const tentative = processes.map((q, i) => i === idx
      ? ({ ...q, alloc: { r1: q.alloc.r1 + reqR1, r2: q.alloc.r2 + reqR2 }})
      : q
    );
    const { seq } = computeSafeSequence(tentative, total);
    if (seq.length) {
      setProcesses(tentative);
      setSafeSeq(seq);
      setAvailableFlash(true);
      setTimeout(() => setAvailableFlash(false), 500);
      logLine(`Request by ${pid} GRANTED safely. New safe sequence: ${seq.join(' → ')}`, 'success');
    } else {
      logLine(`Request by ${pid} NOT SAFE, rolling back.`, 'error');
    }
  }

  // Actions: deadlock detection via RAG cycle
  function runDeadlockDetection(){
    logLine('Running Deadlock Detection...', 'info');
    const nodes = new Set();
    const edges = [];
    processes.forEach(p => nodes.add(p.id));
    ['R1','R2'].forEach(r => nodes.add(r));
    processes.forEach(p => {
      if ((p.alloc.r1||0) > 0) edges.push(['R1', p.id]);
      if ((p.alloc.r2||0) > 0) edges.push(['R2', p.id]);
      const need = computeNeed(p);
      if (need.r1 > 0) edges.push([p.id, 'R1']);
      if (need.r2 > 0) edges.push([p.id, 'R2']);
    });

    const adj = {}; [...nodes].forEach(n => adj[n]=[]);
    edges.forEach(([u,v])=>adj[u].push(v));

    const visited={}, stack={};
    function dfs(v){
      visited[v]=true; stack[v]=true;
      for(const nb of adj[v]){
        if(!visited[nb] && dfs(nb)) return true;
        if(stack[nb]) return true;
      }
      stack[v]=false; return false;
    }
    let cycle=false;
    for(const n of Object.keys(adj)){
      if(!visited[n] && dfs(n)){ cycle=true; break; }
    }
    if(cycle){ 
      setSystemState('deadlock');
      logLine('⚠️ Deadlock detected (cycle in RAG).', 'error'); 
    }
    else { 
      setSystemState('safe');
      logLine('✅ No deadlock detected.', 'success'); 
    }
  }

  // UI: primary action button
  function onRunClicked(){
    if (mode === 'banker') return runBankerStepper({ delay: 800 });
    return runDeadlockDetection();
  }

  // Presentational components
  function Tooltip({ text, children }) {
    return (
      <div className="group relative inline-block">
        {children}
        <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-2 text-xs bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 -left-24">
          {text}
        </div>
      </div>
    );
  }

  function SystemStateIndicator() {
    const states = {
      idle: { color: 'bg-gray-500', text: 'Idle', glow: '' },
      safe: { color: 'bg-green-500', text: 'Safe State', glow: 'shadow-green-500/50' },
      unsafe: { color: 'bg-yellow-500', text: 'Unsafe State', glow: 'shadow-yellow-500/50' },
      deadlock: { color: 'bg-red-500', text: 'Deadlock', glow: 'shadow-red-500/50' }
    };
    const state = states[systemState];
    
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 ${systemState === 'deadlock' ? 'animate-pulse' : ''}`}>
        <div className={`w-3 h-3 rounded-full ${state.color} shadow-lg ${state.glow} animate-pulse`}></div>
        <span className="text-xs font-medium">{state.text}</span>
      </div>
    );
  }

  function Gantt({ seq }){
    if (!seq?.length) return <em className="text-xs text-gray-400">No safe sequence found yet.</em>;
    const colors = ['#4ade80', '#60a5fa', '#facc15', '#fb923c', '#f472b6'];
    return (
      <div className="flex gap-2 flex-wrap items-center">
        {seq.map((pid, i) => (
          <React.Fragment key={pid}>
            <div className="text-xs text-black/90 rounded-lg px-4 py-2 font-medium shadow-lg transform hover:scale-105 transition-transform animate-slideIn"
                 style={{ 
                   background: colors[i % colors.length],
                   animationDelay: `${i * 100}ms`
                 }}>
              {pid}
            </div>
            {i < seq.length - 1 && <span className="text-gray-500">→</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  function RAG(){
    const w = 700, h = 300;
    const pxStart = 60;
    const gap = Math.min(100, (w - 200) / Math.max(1, processes.length));
    const r1x = w * 0.3, r2x = w * 0.7, ry = 240;
    
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="rounded-lg bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-white/5">
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#grid)" />
        
        {/* Process nodes */}
        {processes.map((p, i) => {
          const x = pxStart + i * gap, y = 60;
          const isHighlighted = i === highlightIdx;
          return (
            <g key={p.id} className={isHighlighted ? 'animate-pulse' : ''}>
              <circle cx={x} cy={y} r="28" 
                      fill={isHighlighted ? '#8b5cf6' : '#4c1d95'} 
                      stroke={isHighlighted ? '#a78bfa' : '#7c3aed'} 
                      strokeWidth="2"
                      className="transition-all duration-300" />
              <circle cx={x} cy={y} r="22" fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
              <text x={x} y={y+5} textAnchor="middle" fontSize="14" fill="#e9d5ff" fontWeight="bold">{p.id}</text>
            </g>
          );
        })}
        
        {/* Resource nodes */}
        <g>
          <rect x={r1x-40} y={ry-25} width="80" height="50" rx="8" ry="8" 
                fill="#164e63" stroke="#22d3ee" strokeWidth="2" 
                className="transition-all duration-300" />
          <text x={r1x} y={ry+6} textAnchor="middle" fontSize="16" fill="#67e8f9" fontWeight="bold">R1</text>
        </g>
        <g>
          <rect x={r2x-40} y={ry-25} width="80" height="50" rx="8" ry="8" 
                fill="#164e63" stroke="#22d3ee" strokeWidth="2"
                className="transition-all duration-300" />
          <text x={r2x} y={ry+6} textAnchor="middle" fontSize="16" fill="#67e8f9" fontWeight="bold">R2</text>
        </g>
        
        {/* Edges */}
        {processes.map((p, i) => {
          const px = pxStart + i * gap, py = 60;
          const need = computeNeed(p);
          const isHighlighted = i === highlightIdx;
          
          return (
            <g key={p.id + '-edges'}>
              {/* Allocation edges (resource -> process) */}
              {(p.alloc.r1||0) > 0 && (
                <line x1={r1x} y1={ry-25} x2={px} y2={py+28} 
                      stroke={isHighlighted ? '#10b981' : '#6ee7b7'} 
                      strokeWidth={isHighlighted ? '3' : '2'} 
                      markerEnd="url(#arrowgreen)"
                      className="transition-all duration-300" />
              )}
              {(p.alloc.r2||0) > 0 && (
                <line x1={r2x} y1={ry-25} x2={px} y2={py+28} 
                      stroke={isHighlighted ? '#10b981' : '#6ee7b7'} 
                      strokeWidth={isHighlighted ? '3' : '2'}
                      markerEnd="url(#arrowgreen)"
                      className="transition-all duration-300" />
              )}
              
              {/* Request edges (process -> resource) */}
              {need.r1 > 0 && (
                <line x1={px} y1={py-28} x2={r1x} y2={ry-25} 
                      stroke={isHighlighted ? '#ef4444' : '#fca5a5'} 
                      strokeWidth={isHighlighted ? '3' : '2'} 
                      strokeDasharray="8,4"
                      markerEnd="url(#arrowred)"
                      className="transition-all duration-300" />
              )}
              {need.r2 > 0 && (
                <line x1={px} y1={py-28} x2={r2x} y2={ry-25} 
                      stroke={isHighlighted ? '#ef4444' : '#fca5a5'} 
                      strokeWidth={isHighlighted ? '3' : '2'} 
                      strokeDasharray="8,4"
                      markerEnd="url(#arrowred)"
                      className="transition-all duration-300" />
              )}
            </g>
          );
        })}
        
        {/* Arrow markers */}
        <defs>
          <marker id="arrowgreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#6ee7b7" />
          </marker>
          <marker id="arrowred" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#fca5a5" />
          </marker>
        </defs>
        
        {/* Legend */}
        <g transform="translate(10, 10)">
          <line x1="0" y1="0" x2="30" y2="0" stroke="#6ee7b7" strokeWidth="2" />
          <text x="35" y="4" fontSize="11" fill="#9ca3af">Allocated</text>
          
          <line x1="0" y1="20" x2="30" y2="20" stroke="#fca5a5" strokeWidth="2" strokeDasharray="6,3" />
          <text x="35" y="24" fontSize="11" fill="#9ca3af">Requested</text>
        </g>
      </svg>
    );
  }

  // Render
  return (
    <PageLayout
      title="Deadlock & Synchronization"
      subtitle="Banker’s safety, deadlock detection using RAG, requests, and CSV export.">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="card-surface p-5 space-y-4">
          <h3 className="font-semibold text-sm">Resources</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="block text-gray-400">Total R1</span>
              <input type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5"
                     value={total.r1}
                     onChange={e=>setTotal(t=>({...t, r1:Number(e.target.value||0)}))}/>
            </label>
            <label className="space-y-1">
              <span className="block text-gray-400">Total R2</span>
              <input type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5"
                     value={total.r2}
                     onChange={e=>setTotal(t=>({...t, r2:Number(e.target.value||0)}))}/>
            </label>
            <div className="col-span-2 text-[11px] text-gray-400">
              Available: R1={available.r1} • R2={available.r2}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={onRunClicked} className="px-4 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
              {mode==='banker' ? 'Run Banker Safety' : 'Run Deadlock Detection'}
            </button>
            <button onClick={()=>setMode(m=>m==='banker'?'detection':'banker')}
                    className="px-4 h-9 rounded-full bg-white/10 text-xs">
              Toggle Mode (now: {mode})
            </button>
            <button onClick={exportCsv} className="px-4 h-9 rounded-full bg-white/10 text-xs">Export CSV</button>
            <button onClick={loadDemo} className="px-4 h-9 rounded-full bg-white/10 text-xs">Load Demo</button>
            <button onClick={resetAll} className="px-4 h-9 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs">Reset</button>
          </div>

          <div className="pt-2">
            <h4 className="font-semibold text-xs mb-2">Safe Sequence</h4>
            <Gantt seq={safeSeq}/>
          </div>
        </div>

        <div className="card-surface p-5 space-y-4 lg:col-span-1">
          <h3 className="font-semibold text-sm">Processes</h3>
          <table id="procTable" className="w-full text-xs border-separate border-spacing-y-1">
            <thead className="text-gray-400">
              <tr>
                <th className="text-left">ID</th>
                <th>alloc R1</th><th>alloc R2</th>
                <th>max R1</th><th>max R2</th>
                <th>need R1</th><th>need R2</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {processes.map((p, i) => {
              const need = computeNeed(p);
              const highlight = i === highlightIdx ? 'ring-2 ring-indigo-400' : '';
              return (
                <tr key={p.id} className={`bg-white/5 ${highlight}`}>
                  <td className="px-2 py-1">{p.id}</td>
                  <td className="text-center">{p.alloc.r1}</td>
                  <td className="text-center">{p.alloc.r2}</td>
                  <td className="text-center">{p.max.r1}</td>
                  <td className="text-center">{p.max.r2}</td>
                  <td className="text-center">{need.r1}</td>
                  <td className="text-center">{need.r2}</td>
                  <td className="text-center">{p.finished ? 'Finished' : 'Waiting'}</td>
                  <td className="text-right pr-2">
                    <button className="text-red-300 hover:text-red-200"
                            onClick={()=>{ setProcesses(prev => prev.filter(x=>x.id!==p.id)); }}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {!processes.length && (
              <tr><td colSpan={9} className="text-gray-500 px-2 py-2">No processes.</td></tr>
            )}
            </tbody>
          </table>

          <div className="border-t border-white/10 pt-3">
            <h4 className="font-semibold text-xs mb-2">Add Process</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <label className="space-y-1 col-span-2">
                <span className="block text-gray-400">alloc R1,R2</span>
                <div className="flex gap-2">
                  <input ref={allocR1Ref} type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5" defaultValue="0" />
                  <input ref={allocR2Ref} type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5" defaultValue="0" />
                </div>
              </label>
              <label className="space-y-1 col-span-2">
                <span className="block text-gray-400">max R1,R2</span>
                <div className="flex gap-2">
                  <input ref={maxR1Ref} type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5" defaultValue="0" />
                  <input ref={maxR2Ref} type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5" defaultValue="0" />
                </div>
              </label>
              <div className="col-span-4">
                <button onClick={addProcessFromForm} className="mt-1 px-4 h-8 rounded-full bg-white/10 text-xs">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="font-semibold text-sm mb-3">Request Resources</h3>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <label className="space-y-1">
                <span className="block text-gray-400">PID</span>
                <select ref={reqPidRef} className="w-full h-8 rounded bg-white/5 px-2" defaultValue="">
                  <option value="" disabled>Select PID</option>
                  {processes.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-gray-400">req R1</span>
                <input ref={reqR1Ref} type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5" defaultValue="0" />
              </label>
              <label className="space-y-1">
                <span className="block text-gray-400">req R2</span>
                <input ref={reqR2Ref} type="number" min="0" className="w-full px-2 h-8 rounded bg-white/5" defaultValue="0" />
              </label>
              <div className="flex items/end">
                <button onClick={handleRequest} className="w-full h-8 rounded-full bg-white/10 text-xs">
                  Send Request
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Will be granted only if safe state remains.</p>
          </div>

          <div className="card-surface p-5">
            <h3 className="font-semibold text-sm mb-3">Resource Allocation Graph</h3>
            <RAG/>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm mb-2">Log</h3>
              <button onClick={clearLogs} className="text-[11px] text-gray-400 hover:text-white">Clear</button>
            </div>
            <pre id="log" className="text-[11px] leading-5 max-h-48 overflow-auto bg-black/30 p-3 rounded">
{logs.map((l, i) => <div key={i}>{l}</div>)}
            </pre>
          </div>
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