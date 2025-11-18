import React, { useMemo, useState, useRef, useEffect } from 'react'

/**
 * Deadlock & Synchronization - Enhanced Professional Version
 * - Banker's Algorithm with step-by-step animation
 * - Resource Allocation Graph with smooth visualization
 * - Resource requests with safety check
 * - Educational tooltips and explanations
 * - CSV export functionality
 */

export default function DeadlockSync(){
  // State
  const [total, setTotal] = useState({ r1: 10, r2: 10 });
  const [processes, setProcesses] = useState([]);
  const [mode, setMode] = useState('banker');
  const [logs, setLogs] = useState([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [safeSeq, setSafeSeq] = useState([]);
  const [systemState, setSystemState] = useState('idle');
  const [showExplanation, setShowExplanation] = useState(true);
  const [currentStep, setCurrentStep] = useState('');
  const [availableFlash, setAvailableFlash] = useState(false);
  const [highlightedNeed, setHighlightedNeed] = useState(-1);
  const logEndRef = useRef(null);
  
  // Advanced features state
  const [graphMode, setGraphMode] = useState('rag'); // 'rag' | 'wfg'
  const [deadlockCycle, setDeadlockCycle] = useState([]);
  const [stepByStepMode, setStepByStepMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [preventionMode, setPreventionMode] = useState({
    resourceOrdering: false,
    holdAndWait: false,
    circularWait: false
  });
  const [resourceOrder, setResourceOrder] = useState(['R1', 'R2']);
  const [timeline, setTimeline] = useState([]);
  const [simulationMode, setSimulationMode] = useState(false);

  // Form refs
  const allocR1Ref = useRef(null); const allocR2Ref = useRef(null);
  const maxR1Ref = useRef(null);   const maxR2Ref = useRef(null);
  const reqPidRef = useRef(null);  const reqR1Ref = useRef(null); const reqR2Ref = useRef(null);

  // Auto-scroll logs only within container (not the whole page)
  useEffect(() => {
    if (logEndRef.current) {
      const container = logEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs]);

  // Load demo on mount
  useEffect(() => {
    console.log('Component mounted, loading safe example');
    loadSafeExample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived values
  const available = useMemo(() => recomputeAvailable(processes, total), [processes, total]);

  // Logging with timestamps and colors
  function logLine(s, type = 'info'){
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { msg: s, type, timestamp }]);
  }
  
  function clearLogs(){ setLogs([]); setSystemState('idle'); setCurrentStep(''); }

  // Add to timeline
  const addTimelineEvent = (type, description, data) => {
    const timestamp = new Date().toLocaleTimeString();
    setTimeline(prev => [...prev, { type, description, data, timestamp }]);
  };

  // Example presets
  const loadSafeExample = () => {
    console.log('loadSafeExample called');
    const newTotal = { r1: 10, r2: 10 };
    setTotal(newTotal);
    const demo = [
      { id:'P1', alloc:{ r1:0, r2:1 }, max:{ r1:7, r2:5 }, finished:false },
      { id:'P2', alloc:{ r1:2, r2:0 }, max:{ r1:3, r2:2 }, finished:false },
      { id:'P3', alloc:{ r1:3, r2:0 }, max:{ r1:9, r2:0 }, finished:false },
      { id:'P4', alloc:{ r1:2, r2:1 }, max:{ r1:2, r2:2 }, finished:false },
      { id:'P5', alloc:{ r1:0, r2:0 }, max:{ r1:4, r2:3 }, finished:false },
    ];
    console.log('Setting processes:', demo);
    setProcesses(demo);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setLogs([]);
    setSystemState('idle');
    setDeadlockCycle([]);
    setAvailableFlash(true);
    setTimeout(() => setAvailableFlash(false), 500);
    setTimeout(() => {
      const avail = recomputeAvailable(demo, newTotal);
      logLine(`Loaded Safe State Example | Available: R1=${avail.r1}, R2=${avail.r2}`, 'success');
    }, 0);
  };

  const loadUnsafeExample = () => {
    const newTotal = { r1: 5, r2: 5 };
    setTotal(newTotal);
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
    setDeadlockCycle([]);
    setAvailableFlash(true);
    setTimeout(() => setAvailableFlash(false), 500);
    setTimeout(() => {
      const avail = recomputeAvailable(demo, newTotal);
      logLine(`Loaded Unsafe State Example | Available: R1=${avail.r1}, R2=${avail.r2}`, 'warning');
    }, 0);
  };

  const loadDeadlockExample = () => {
    const newTotal = { r1: 4, r2: 4 };
    setTotal(newTotal);
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
    setDeadlockCycle([]);
    setAvailableFlash(true);
    setTimeout(() => setAvailableFlash(false), 500);
    setTimeout(() => {
      const avail = recomputeAvailable(demo, newTotal);
      logLine(`Loaded Potential Deadlock Example | Available: R1=${avail.r1}, R2=${avail.r2}`, 'error');
    }, 0);
  };

  const resetAll = () => {
    setProcesses([]);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setSystemState('idle');
    setCurrentStep('');
    setDeadlockCycle([]);
    setTimeline([]);
    setStepByStepMode(false);
    setCurrentStepIndex(0);
    clearLogs();
    setAvailableFlash(true);
    setTimeout(() => setAvailableFlash(false), 500);
    setTimeout(() => logLine('Reset all state | Available: R1=' + total.r1 + ', R2=' + total.r2, 'info'), 0);
  };

  const loadDemo = () => { loadSafeExample(); };

  // Utilities
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function recomputeAvailable(procs, tot) {
    const used = procs.reduce((acc, p) => {
      acc.r1 += Number(p.alloc.r1||0);
      acc.r2 += Number(p.alloc.r2||0);
      return acc;
    }, {r1:0, r2:0});
    return { r1: Number(tot.r1) - used.r1, r2: Number(tot.r2) - used.r2 };
  }

  // Validate resource constraints
  function validateResourceConstraints(alloc, max, currentProcesses = [], isNewProcess = false) {
    // Rule 1: Allocation must not be negative
    if (alloc.r1 < 0 || alloc.r2 < 0) {
      return { valid: false, error: 'Allocation cannot be negative' };
    }

    // Rule 2: Max must not be negative
    if (max.r1 < 0 || max.r2 < 0) {
      return { valid: false, error: 'Maximum cannot be negative' };
    }

    // Rule 3: Alloc must not exceed Max
    if (alloc.r1 > max.r1 || alloc.r2 > max.r2) {
      return { valid: false, error: 'Allocation cannot exceed Maximum' };
    }

    // Rule 4: Total allocated (including new) must not exceed Total available
    const currentAllocated = currentProcesses.reduce((acc, p) => {
      acc.r1 += Number(p.alloc.r1 || 0);
      acc.r2 += Number(p.alloc.r2 || 0);
      return acc;
    }, { r1: 0, r2: 0 });

    const totalAfter = {
      r1: currentAllocated.r1 + (isNewProcess ? alloc.r1 : 0),
      r2: currentAllocated.r2 + (isNewProcess ? alloc.r2 : 0)
    };

    if (totalAfter.r1 > total.r1) {
      return { valid: false, error: `Cannot allocate R1=${alloc.r1}: would exceed Total R1=${total.r1}` };
    }
    if (totalAfter.r2 > total.r2) {
      return { valid: false, error: `Cannot allocate R2=${alloc.r2}: would exceed Total R2=${total.r2}` };
    }

    return { valid: true };
  }

  function computeNeed(p){
    return {
      r1: Number(p.max.r1||0) - Number(p.alloc.r1||0),
      r2: Number(p.max.r2||0) - Number(p.alloc.r2||0),
    };
  }

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

  async function runBankerStepper({ delay=1000 } = {}) {
    if (!processes.length){
      logLine('No processes to run. Add or Load Example.', 'warning');
      return;
    }
    
    // Validate all processes have valid resource values
    for (const p of processes) {
      const need = computeNeed(p);
      if (need.r1 < 0 || need.r2 < 0) {
        logLine(`Cannot run: ${p.id} has invalid state (Need < 0). Check Allocation and Maximum values.`, 'error');
        return;
      }
      if (p.alloc.r1 < 0 || p.alloc.r2 < 0) {
        logLine(`Cannot run: ${p.id} has negative allocation.`, 'error');
        return;
      }
    }
    
    // Validate Available is not negative
    if (available.r1 < 0 || available.r2 < 0) {
      logLine(`Cannot run: Available resources are negative (R1=${available.r1}, R2=${available.r2}). Check Total vs Allocated.`, 'error');
      return;
    }
    
    setCurrentStep('Checking system safety...');
    const { seq, finish } = computeSafeSequence(processes, total);
    logLine(`Starting Banker's Algorithm check. Available: R1=${available.r1}, R2=${available.r2}`, 'info');

    setSafeSeq(seq);
    if (seq.length) {
      setSystemState('safe');
      const indexMap = processes.reduce((m, p, i) => (m[p.id]=i, m), {});
      
      // If step-by-step mode, just set up the sequence
      if(stepByStepMode){
        setCurrentStepIndex(0);
        setCurrentStep('Ready to step through safe sequence. Click "Next Step" to proceed.');
        logLine('Step-by-step mode activated. Use "Next Step" button.', 'info');
        return;
      }
      
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

  function advanceStep(){
    if(!safeSeq.length || currentStepIndex >= safeSeq.length){
      setCurrentStep('✓ Safe sequence complete: ' + safeSeq.join(' → '));
      setHighlightIdx(-1);
      setHighlightedNeed(-1);
      logLine('✅ Step-by-step execution completed.', 'success');
      setStepByStepMode(false);
      setCurrentStepIndex(0);
      return;
    }
    
    const indexMap = processes.reduce((m, p, i) => (m[p.id]=i, m), {});
    const pid = safeSeq[currentStepIndex];
    const i = indexMap[pid];
    const p = processes[i];
    const need = computeNeed(p);
    
    setCurrentStep(`Step ${currentStepIndex+1}/${safeSeq.length}: ${pid} needs (${need.r1},${need.r2}) ≤ Available (${available.r1},${available.r2}) → Can complete!`);
    setHighlightIdx(i);
    setHighlightedNeed(i);
    setCurrentStepIndex(prev => prev + 1);
    logLine(`Step ${currentStepIndex+1}: ${pid} can proceed and will release resources.`, 'info');
  }

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

  function handleRequest(){
    if (!processes.length){
      logLine('No processes to request for.', 'warning');
      return;
    }
    const pid = reqPidRef.current?.value;
    const reqR1 = Number(reqR1Ref.current?.value || 0);
    const reqR2 = Number(reqR2Ref.current?.value || 0);
    
    // Validate process exists
    const idx = processes.findIndex(p => p.id === pid);
    if (idx < 0) { 
      logLine('Invalid process selected', 'error');
      return; 
    }

    const p = processes[idx];
    const need = computeNeed(p);
    
    // Rule 1: Request must not be negative
    if (reqR1 < 0 || reqR2 < 0) {
      logLine(`Request by ${pid} failed: Request cannot be negative`, 'error');
      return;
    }
    
    // Rule 2: Request must not exceed Need
    if (reqR1 > need.r1 || reqR2 > need.r2) {
      logLine(`Request by ${pid} DENIED: Exceeds Need | Request(${reqR1},${reqR2}) > Need(${need.r1},${need.r2})`, 'error');
      return;
    }
    
    // Rule 3: Request must not exceed Available
    if (reqR1 > available.r1 || reqR2 > available.r2) {
      logLine(`Request by ${pid} DENIED: Insufficient resources | Request(${reqR1},${reqR2}) > Available(${available.r1},${available.r2})`, 'warning');
      return;
    }

    // Create tentative state
    const tentative = processes.map((q, i) => i === idx
      ? ({ ...q, alloc: { r1: q.alloc.r1 + reqR1, r2: q.alloc.r2 + reqR2 }})
      : q
    );
    
    // Check safety using Banker's Algorithm
    const { seq } = computeSafeSequence(tentative, total);
    
    if (seq.length) {
      if(!simulationMode){
        setProcesses(tentative);
        setSafeSeq(seq);
        setSystemState('safe');
        const newAvail = recomputeAvailable(tentative, total);
        addTimelineEvent('request', `${pid} granted R1:${reqR1}, R2:${reqR2}`, { pid, reqR1, reqR2, newAvail });
        
        // Visual feedback
        setAvailableFlash(true);
        setTimeout(() => setAvailableFlash(false), 500);
        
        logLine(`Request by ${pid} GRANTED safely | Allocated(${reqR1},${reqR2}) | New Available: R1=${newAvail.r1}, R2=${newAvail.r2} | Safe seq: ${seq.join(' → ')}`, 'success');
      } else {
        const simAvail = recomputeAvailable(tentative, total);
        logLine(`[SIMULATION] Request by ${pid} WOULD BE GRANTED | Would allocate(${reqR1},${reqR2}) | Available would be: R1=${simAvail.r1}, R2=${simAvail.r2} | Safe seq: ${seq.join(' → ')}`, 'info');
      }
    } else {
      logLine(`Request by ${pid} DENIED: Would lead to UNSAFE state ${simulationMode ? '(simulation)' : ''}`, 'error');
      if (!simulationMode) {
        setSystemState('unsafe');
      }
    }
  }

  // Simulate request without applying
  function simulateRequest(){
    setSimulationMode(true);
    handleRequest();
    setTimeout(() => setSimulationMode(false), 100);
  }

  function runDeadlockDetection(){
    if (!processes.length){
      logLine('No processes for deadlock detection.', 'warning');
      return;
    }
    
    // Validate all processes have valid resource values
    for (const p of processes) {
      const need = computeNeed(p);
      if (need.r1 < 0 || need.r2 < 0) {
        logLine(`Cannot run detection: ${p.id} has invalid state (Need < 0).`, 'error');
        return;
      }
    }
    
    logLine('Running Deadlock Detection...', 'info');
    addTimelineEvent('detection', 'Deadlock detection started', {});
    
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

    const visited={}, stack={}, parent={};
    const cyclePath = [];
    
    function dfs(v, path = []){
      visited[v]=true; stack[v]=true;
      path.push(v);
      
      for(const nb of adj[v]){
        if(!visited[nb]){
          parent[nb] = v;
          if(dfs(nb, [...path])) return true;
        }
        else if(stack[nb]){
          // Cycle found, extract the cycle
          const cycleStart = path.indexOf(nb);
          cyclePath.push(...path.slice(cycleStart), nb);
          return true;
        }
      }
      stack[v]=false;
      return false;
    }
    
    let cycle=false;
    for(const n of Object.keys(adj)){
      if(!visited[n] && dfs(n)){ 
        cycle=true; 
        break; 
      }
    }
    
    if(cycle){ 
      setSystemState('deadlock');
      setDeadlockCycle(cyclePath);
      logLine(`⚠️ Deadlock detected! Cycle: ${cyclePath.join(' → ')}`, 'error');
      addTimelineEvent('deadlock', 'Deadlock cycle detected', { cycle: cyclePath });
    }
    else { 
      setSystemState('safe');
      setDeadlockCycle([]);
      logLine('✅ No deadlock detected.', 'success');
      addTimelineEvent('safe', 'System verified safe', {});
    }
  }

  // Process termination for deadlock recovery
  function terminateProcess(pid){
    setProcesses(prev => prev.filter(p => p.id !== pid));
    setDeadlockCycle([]);
    logLine(`🔴 Process ${pid} terminated for deadlock recovery`, 'warning');
    addTimelineEvent('terminate', `Process ${pid} terminated`, { pid });
  }

  // Resource preemption
  function preemptResource(pid, resource){
    setProcesses(prev => prev.map(p => {
      if(p.id === pid){
        return {
          ...p,
          alloc: {
            r1: resource === 'r1' ? 0 : p.alloc.r1,
            r2: resource === 'r2' ? 0 : p.alloc.r2
          }
        };
      }
      return p;
    }));
    logLine(`⚡ Resource ${resource.toUpperCase()} preempted from ${pid}`, 'warning');
    addTimelineEvent('preempt', `Resource ${resource} preempted`, { pid, resource });
  }

  function addProcessFromForm(){
    const allocR1 = Number(allocR1Ref.current?.value || 0);
    const allocR2 = Number(allocR2Ref.current?.value || 0);
    const maxR1 = Number(maxR1Ref.current?.value || 0);
    const maxR2 = Number(maxR2Ref.current?.value || 0);
    const id = 'P' + (processes.length + 1);
    
    const alloc = { r1: allocR1, r2: allocR2 };
    const max = { r1: maxR1, r2: maxR2 };
    
    // Validate all resource constraints
    const validation = validateResourceConstraints(alloc, max, processes, true);
    if (!validation.valid) {
      logLine(`Cannot add ${id}: ${validation.error}`, 'error');
      return;
    }
    
    const proc = { id, alloc, max, finished: false };
    const newProcesses = [...processes, proc];
    setProcesses(newProcesses);
    setSafeSeq([]);
    setHighlightIdx(-1);
    setSystemState('idle');
    setDeadlockCycle([]);
    
    // Calculate and show new Available
    const newAvail = recomputeAvailable(newProcesses, total);
    setAvailableFlash(true);
    setTimeout(() => setAvailableFlash(false), 500);
    
    const need = computeNeed(proc);
    logLine(`Added ${id} | Alloc(${allocR1},${allocR2}) Max(${maxR1},${maxR2}) Need(${need.r1},${need.r2}) | Available: R1=${newAvail.r1}, R2=${newAvail.r2}`, 'success');
    addTimelineEvent('add', `Process ${id} added`, { id, alloc, max, need });
    
    // Clear form
    if (allocR1Ref.current) allocR1Ref.current.value = '0';
    if (allocR2Ref.current) allocR2Ref.current.value = '0';
    if (maxR1Ref.current) maxR1Ref.current.value = '0';
    if (maxR2Ref.current) maxR2Ref.current.value = '0';
  }

  function onRunClicked(){
    if (mode === 'banker') return runBankerStepper({ delay: 1000 });
    return runDeadlockDetection();
  }

  // UI Components
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
      idle: { 
        color: 'bg-gray-500', 
        text: 'Idle', 
        glow: '', 
        bg: 'bg-gray-500/5',
        border: 'border-gray-500/20'
      },
      safe: { 
        color: 'bg-green-500', 
        text: 'Safe State ✓', 
        glow: 'shadow-green-500/50 shadow-lg', 
        bg: 'bg-green-500/10',
        border: 'border-green-500/30'
      },
      unsafe: { 
        color: 'bg-yellow-500', 
        text: 'Unsafe State ⚠', 
        glow: 'shadow-yellow-500/50 shadow-lg', 
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30'
      },
      deadlock: { 
        color: 'bg-red-500', 
        text: 'Deadlock Detected 🚨', 
        glow: 'shadow-red-500/50 shadow-lg', 
        bg: 'bg-red-500/10',
        border: 'border-red-500/30'
      }
    };
    const state = states[systemState];
    
    return (
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl ${state.bg} border ${state.border} transition-all duration-300 ${systemState === 'deadlock' ? 'animate-pulse' : ''}`}>
        <div className={`w-3 h-3 rounded-full ${state.color} ${state.glow} animate-pulse`}></div>
        <span className="text-sm font-semibold">{state.text}</span>
      </div>
    );
  }

  function Gantt({ seq }){
    if (!seq?.length) return <em className="text-xs text-gray-400">No safe sequence found yet.</em>;
    const colors = ['#4ade80', '#60a5fa', '#facc15', '#fb923c', '#f472b6'];
    return (
      <div className="flex gap-3 flex-wrap items-center">
        {seq.map((pid, i) => (
          <React.Fragment key={pid}>
            <div className="text-xs text-black/90 rounded-lg px-4 py-2 font-semibold shadow-lg transform hover:scale-105 transition-all hover:shadow-xl"
                 style={{ background: colors[i % colors.length] }}>
              {pid}
            </div>
            {i < seq.length - 1 && <span className="text-gray-400 font-bold mx-1">→</span>}
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
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </pattern>
          <marker id="arrowgreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#6ee7b7" />
          </marker>
          <marker id="arrowred" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#fca5a5" />
          </marker>
        </defs>
        <rect width={w} height={h} fill="url(#grid)" />
        
        {processes.map((p, i) => {
          const x = pxStart + i * gap, y = 60;
          const isHighlighted = i === highlightIdx;
          const isCycleNode = deadlockCycle.includes(p.id);
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r="28" 
                      fill={isCycleNode ? '#dc2626' : (isHighlighted ? '#8b5cf6' : '#4c1d95')} 
                      stroke={isCycleNode ? '#fca5a5' : (isHighlighted ? '#a78bfa' : '#7c3aed')} 
                      strokeWidth={isCycleNode ? '3' : '2'} />
              <circle cx={x} cy={y} r="22" fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
              <text x={x} y={y+5} textAnchor="middle" fontSize="14" fill="#e9d5ff" fontWeight="bold">{p.id}</text>
            </g>
          );
        })}
        
        <g>
          <rect x={r1x-40} y={ry-25} width="80" height="50" rx="8" ry="8" 
                fill="#164e63" stroke="#22d3ee" strokeWidth="2" />
          <text x={r1x} y={ry+6} textAnchor="middle" fontSize="16" fill="#67e8f9" fontWeight="bold">R1</text>
        </g>
        <g>
          <rect x={r2x-40} y={ry-25} width="80" height="50" rx="8" ry="8" 
                fill="#164e63" stroke="#22d3ee" strokeWidth="2" />
          <text x={r2x} y={ry+6} textAnchor="middle" fontSize="16" fill="#67e8f9" fontWeight="bold">R2</text>
        </g>
        
        {processes.map((p, i) => {
          const px = pxStart + i * gap, py = 60;
          const need = computeNeed(p);
          const isHighlighted = i === highlightIdx;
          
          return (
            <g key={p.id + '-edges'}>
              {(p.alloc.r1||0) > 0 && (
                <line x1={r1x} y1={ry-25} x2={px} y2={py+28} 
                      stroke={isHighlighted ? '#10b981' : '#6ee7b7'} 
                      strokeWidth={isHighlighted ? '3' : '2'} 
                      markerEnd="url(#arrowgreen)" />
              )}
              {(p.alloc.r2||0) > 0 && (
                <line x1={r2x} y1={ry-25} x2={px} y2={py+28} 
                      stroke={isHighlighted ? '#10b981' : '#6ee7b7'} 
                      strokeWidth={isHighlighted ? '3' : '2'}
                      markerEnd="url(#arrowgreen)" />
              )}
              {need.r1 > 0 && (
                <line x1={px} y1={py-28} x2={r1x} y2={ry-25} 
                      stroke={isHighlighted ? '#ef4444' : '#fca5a5'} 
                      strokeWidth={isHighlighted ? '3' : '2'} 
                      strokeDasharray="8,4"
                      markerEnd="url(#arrowred)" />
              )}
              {need.r2 > 0 && (
                <line x1={px} y1={py-28} x2={r2x} y2={ry-25} 
                      stroke={isHighlighted ? '#ef4444' : '#fca5a5'} 
                      strokeWidth={isHighlighted ? '3' : '2'} 
                      strokeDasharray="8,4"
                      markerEnd="url(#arrowred)" />
              )}
            </g>
          );
        })}
        
        <g transform="translate(10, 10)">
          <line x1="0" y1="0" x2="30" y2="0" stroke="#6ee7b7" strokeWidth="2" />
          <text x="35" y="4" fontSize="11" fill="#9ca3af">Allocated</text>
          <line x1="0" y1="20" x2="30" y2="20" stroke="#fca5a5" strokeWidth="2" strokeDasharray="6,3" />
          <text x="35" y="24" fontSize="11" fill="#9ca3af">Requested</text>
          {deadlockCycle.length > 0 && (
            <>
              <circle cx="15" cy="50" r="10" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
              <text x="35" y="54" fontSize="11" fill="#fca5a5">Deadlock Cycle</text>
            </>
          )}
        </g>
      </svg>
    );
  }

  function WFG(){
    const w = 700, h = 300;
    const pxStart = 100;
    const gap = Math.min(120, (w - 200) / Math.max(1, processes.length));
    
    // Build wait-for relationships: process waits for another if it needs a resource that other holds
    const waitEdges = [];
    processes.forEach((pWaiting, i) => {
      const need = computeNeed(pWaiting);
      processes.forEach((pHolding, j) => {
        if (i !== j) {
          // Check if pWaiting needs R1 and pHolding has R1 allocated
          if (need.r1 > 0 && (pHolding.alloc.r1 || 0) > 0) {
            waitEdges.push({ from: pWaiting.id, to: pHolding.id, resource: 'R1' });
          }
          // Check if pWaiting needs R2 and pHolding has R2 allocated
          if (need.r2 > 0 && (pHolding.alloc.r2 || 0) > 0) {
            waitEdges.push({ from: pWaiting.id, to: pHolding.id, resource: 'R2' });
          }
        }
      });
    });
    
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="rounded-lg bg-gradient-to-br from-purple-900/50 to-pink-900/30 border border-white/5">
        <defs>
          <pattern id="gridwfg" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </pattern>
          <marker id="arrowwait" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#f9a8d4" />
          </marker>
        </defs>
        <rect width={w} height={h} fill="url(#gridwfg)" />
        
        {/* Draw edges first */}
        {waitEdges.map((edge, idx) => {
          const fromIdx = processes.findIndex(p => p.id === edge.from);
          const toIdx = processes.findIndex(p => p.id === edge.to);
          const x1 = pxStart + fromIdx * gap;
          const y1 = h / 2;
          const x2 = pxStart + toIdx * gap;
          const y2 = h / 2;
          
          // Curved path for better visibility
          const mx = (x1 + x2) / 2;
          const my = y1 - 40;
          const isCycleEdge = deadlockCycle.includes(edge.from) && deadlockCycle.includes(edge.to);
          
          return (
            <g key={`edge-${idx}`}>
              <path d={`M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`}
                    stroke={isCycleEdge ? '#dc2626' : '#f9a8d4'}
                    strokeWidth={isCycleEdge ? '3' : '2'}
                    fill="none"
                    markerEnd="url(#arrowwait)" />
              <text x={mx} y={my - 5} textAnchor="middle" fontSize="10" fill="#d4d4d8">{edge.resource}</text>
            </g>
          );
        })}
        
        {/* Draw process nodes */}
        {processes.map((p, i) => {
          const x = pxStart + i * gap;
          const y = h / 2;
          const isCycleNode = deadlockCycle.includes(p.id);
          
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r="35" 
                      fill={isCycleNode ? '#dc2626' : '#7e22ce'} 
                      stroke={isCycleNode ? '#fca5a5' : '#c084fc'} 
                      strokeWidth={isCycleNode ? '3' : '2'} />
              <circle cx={x} cy={y} r="28" fill="none" stroke="rgba(192,132,252,0.3)" strokeWidth="1" />
              <text x={x} y={y+6} textAnchor="middle" fontSize="16" fill="#f3e8ff" fontWeight="bold">{p.id}</text>
            </g>
          );
        })}
        
        <g transform="translate(10, 10)">
          <text x="0" y="0" fontSize="12" fill="#9ca3af" fontWeight="bold">Wait-For Graph</text>
          <text x="0" y="20" fontSize="10" fill="#6b7280">Processes wait for resources held by others</text>
          {deadlockCycle.length > 0 && (
            <>
              <circle cx="15" cy="50" r="10" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
              <text x="35" y="54" fontSize="11" fill="#fca5a5">Cycle = Deadlock</text>
            </>
          )}
        </g>
      </svg>
    );
  }

  // Main Render
  return (
    <PageLayout
      title="Deadlock & Synchronization"
      subtitle="Interactive Banker's Algorithm safety analysis, deadlock detection using Resource Allocation Graph, and resource request simulation.">
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes drawLine {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideIn { animation: slideIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-pulse { animation: pulse 2s ease-in-out infinite; }
        .edge-animated { stroke-dasharray: 1000; animation: drawLine 0.5s ease-out forwards; }
      `}</style>

      {/* Header with state indicator */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
        <SystemStateIndicator />
        {currentStep && (
          <div className="flex-1 px-5 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-sm animate-fadeIn shadow-lg">
            <span className="font-bold text-indigo-300 mr-2">→</span>
            <span className="text-gray-200">{currentStep}</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Column 1: Resources & Controls */}
        <div className="space-y-6">
          {/* Resources */}
          <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/10 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="text-2xl">🔧</span> Resources
              </h3>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="block text-gray-300 font-medium text-sm">Total R1</span>
                  <Tooltip text="Total units of Resource 1 available in the system">
                    <span className="text-gray-500 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <input type="number" min="0" 
                       className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all outline-none"
                       value={total.r1}
                       onChange={e=>{
                         const newVal = Number(e.target.value||0);
                         setTotal(t=>({...t, r1:newVal}));
                         setAvailableFlash(true);
                         setTimeout(() => setAvailableFlash(false), 500);
                         const newAvail = recomputeAvailable(processes, {...total, r1:newVal});
                         logLine(`Total R1 changed to ${newVal} | Available: R1=${newAvail.r1}, R2=${newAvail.r2}`, 'info');
                       }}/>
              </label>
              <label className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="block text-gray-300 font-medium text-sm">Total R2</span>
                  <Tooltip text="Total units of Resource 2 available in the system">
                    <span className="text-gray-500 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <input type="number" min="0" 
                       className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all outline-none"
                       value={total.r2}
                       onChange={e=>{
                         const newVal = Number(e.target.value||0);
                         setTotal(t=>({...t, r2:newVal}));
                         setAvailableFlash(true);
                         setTimeout(() => setAvailableFlash(false), 500);
                         const newAvail = recomputeAvailable(processes, {...total, r2:newVal});
                         logLine(`Total R2 changed to ${newVal} | Available: R1=${newAvail.r1}, R2=${newAvail.r2}`, 'info');
                       }}/>
              </label>
            </div>

            <div className={`p-4 rounded-lg transition-all duration-500 ${
              available.r1 < 0 || available.r2 < 0 
                ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40' 
                : (available.r1 <= 2 || available.r2 <= 2)
                  ? 'bg-gradient-to-r from-yellow-500/15 to-amber-500/15 border border-yellow-500/30'
                  : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30'
            } ${availableFlash ? 'ring-2 ring-green-500 scale-105 shadow-lg shadow-green-500/50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Available Resources</span>
                {available.r1 >= 0 && available.r2 >= 0 && (
                  <span className="text-green-400 text-xs">✓ Valid</span>
                )}
                {(available.r1 < 0 || available.r2 < 0) && (
                  <span className="text-red-400 text-xs">⚠ Invalid</span>
                )}
              </div>
              <div className="flex gap-6 text-lg font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">R1:</span>
                  <span className={available.r1 < 0 ? 'text-red-400' : 'text-white'}>{available.r1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">R2:</span>
                  <span className="text-white">{available.r2}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button type="button"
                      onClick={(e) => { e.preventDefault(); onRunClicked(); }} 
                      className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105">
                {mode==='banker' ? '▶ Run Banker Safety Check' : '🔍 Run Deadlock Detection'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                        onClick={(e) => { e.preventDefault(); setMode(m=>m==='banker'?'detection':'banker'); }}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-[1.02] text-xs border border-white/10 transition-all hover:shadow-md">
                  🔄 {mode === 'banker' ? 'Banker' : 'Detection'}
                </button>
                <button type="button"
                        onClick={(e) => { e.preventDefault(); exportCsv(); }} 
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-[1.02] text-xs border border-white/10 transition-all hover:shadow-md">
                  📊 Export CSV
                </button>
              </div>
              <div className="mt-2">
                <button type="button"
                        onClick={(e) => { e.preventDefault(); setStepByStepMode(prev => !prev); }}
                        className={`w-full px-3 py-2 rounded-lg text-xs border transition-all hover:scale-[1.02] ${
                          stepByStepMode 
                            ? 'bg-blue-500/30 border-blue-500/50 text-blue-200 shadow-lg shadow-blue-500/30' 
                            : 'bg-white/10 hover:bg-white/20 border-white/10 hover:shadow-md'
                        }`}>
                  🎯 {stepByStepMode ? 'Step-by-Step: ON' : 'Step-by-Step: OFF'}
                </button>
              </div>
              {stepByStepMode && safeSeq.length > 0 && (
                <button type="button"
                        onClick={(e) => { e.preventDefault(); advanceStep(); }}
                        className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                  ⏭️ Next Step ({currentStepIndex}/{safeSeq.length})
                </button>
              )}
            </div>
          </div>

          {/* Examples */}
          <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/10 shadow-lg">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <span className="text-2xl">📚</span> Example Scenarios
            </h3>
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
            <div className="grid gap-2">
              <button type="button"
                      onClick={(e) => { e.preventDefault(); loadSafeExample(); }} 
                      className="px-4 py-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 hover:scale-[1.01] border border-green-500/30 text-left flex items-center gap-2 transition-all text-sm animate-slideUp hover:shadow-lg">
                <span className="text-lg">✅</span>
                <span className="font-medium">Safe State Example</span>
              </button>
              <button type="button"
                      onClick={(e) => { e.preventDefault(); loadUnsafeExample(); }} 
                      className="px-4 py-3 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 hover:scale-[1.01] border border-yellow-500/30 text-left flex items-center gap-2 transition-all text-sm animate-slideUp hover:shadow-lg">
                <span className="text-lg">⚠️</span>
                <span className="font-medium">Unsafe State Example</span>
              </button>
              <button type="button"
                      onClick={(e) => { e.preventDefault(); loadDeadlockExample(); }} 
                      className="px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 hover:scale-[1.01] border border-red-500/30 text-left flex items-center gap-2 transition-all text-sm animate-slideUp hover:shadow-lg">
                <span className="text-lg">🚨</span>
                <span className="font-medium">Deadlock Example</span>
              </button>
              <button type="button"
                      onClick={(e) => { e.preventDefault(); resetAll(); }} 
                      className="px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 hover:scale-[1.01] border border-gray-600/30 text-center font-medium transition-all text-sm animate-slideUp hover:shadow-lg">
                🔄 Reset All
              </button>
            </div>
          </div>

          {/* Safe Sequence */}
          <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/10 shadow-lg">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <span className="text-2xl">🎯</span> Safe Sequence
            </h3>
            <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent"></div>
            <Gantt seq={safeSeq}/>
          </div>
        </div>

        {/* Column 2: Process Table */}
        <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/10 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <span className="text-2xl">⚙️</span> Processes
            </h3>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-400">
                <tr className="border-b border-white/10">
                  <th className="text-left pb-3 pt-1">
                    <Tooltip text="Process identifier">
                      <span className="cursor-help">ID</span>
                    </Tooltip>
                  </th>
                  <th className="text-center pb-3 pt-1">
                    <Tooltip text="Allocated resources currently held by this process">
                      <span className="cursor-help flex items-center justify-center gap-1">
                        <span>Alloc R1</span>
                        <span className="text-[10px] opacity-60">📌</span>
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-center pb-3 pt-1">
                    <Tooltip text="Allocated resources currently held by this process">
                      <span className="cursor-help flex items-center justify-center gap-1">
                        <span>Alloc R2</span>
                        <span className="text-[10px] opacity-60">📌</span>
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-center pb-3 pt-1">
                    <Tooltip text="Maximum resources this process may request (declared at start)">
                      <span className="cursor-help flex items-center justify-center gap-1">
                        <span>Max R1</span>
                        <span className="text-[10px] opacity-60">🔝</span>
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-center pb-3 pt-1">
                    <Tooltip text="Maximum resources this process may request (declared at start)">
                      <span className="cursor-help flex items-center justify-center gap-1">
                        <span>Max R2</span>
                        <span className="text-[10px] opacity-60">🔝</span>
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-center pb-3 pt-1">
                    <Tooltip text="Need = Max - Alloc (remaining resources needed to complete execution)">
                      <span className="text-yellow-300 cursor-help flex items-center justify-center gap-1">
                        <span>Need R1</span>
                        <span className="text-[10px]">⚡</span>
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-center pb-3 pt-1">
                    <Tooltip text="Need = Max - Alloc (remaining resources needed to complete execution)">
                      <span className="text-yellow-300 cursor-help flex items-center justify-center gap-1">
                        <span>Need R2</span>
                        <span className="text-[10px]">⚡</span>
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-center pb-3 pt-1">
                    <Tooltip text="Process completion status in safe sequence">
                      <span className="cursor-help">Status</span>
                    </Tooltip>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
              {processes.map((p, i) => {
                const need = computeNeed(p);
                const isHighlighted = i === highlightIdx;
                const needHighlighted = i === highlightedNeed;
                return (
                  <tr key={p.id} 
                      className={`border-b border-white/5 transition-all duration-300 ${
                        isHighlighted ? 'bg-purple-500/20 ring-2 ring-purple-500' : 'hover:bg-white/5'
                      }`}>
                    <td className="py-2 px-2 font-medium">{p.id}</td>
                    <td className="text-center">{p.alloc.r1}</td>
                    <td className="text-center">{p.alloc.r2}</td>
                    <td className="text-center">{p.max.r1}</td>
                    <td className="text-center">{p.max.r2}</td>
                    <td className={`text-center transition-all ${needHighlighted ? 'bg-yellow-500/30 font-bold' : ''}`}>
                      {need.r1}
                    </td>
                    <td className={`text-center transition-all ${needHighlighted ? 'bg-yellow-500/30 font-bold' : ''}`}>
                      {need.r2}
                    </td>
                    <td className="text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-medium ${
                        p.finished ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {p.finished ? 'Can Finish ✓' : 'Waiting'}
                      </span>
                    </td>
                    <td className="text-right pr-2">
                      <button type="button"
                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
                        onClick={(e)=> { 
                          e.preventDefault(); 
                          const newProcs = processes.filter(x=>x.id!==p.id);
                          setProcesses(newProcs);
                          setAvailableFlash(true);
                          setTimeout(() => setAvailableFlash(false), 500);
                          const newAvail = recomputeAvailable(newProcs, total);
                          logLine(`Removed ${p.id} | Available: R1=${newAvail.r1}, R2=${newAvail.r2}`, 'info');
                          addTimelineEvent('remove', `Process ${p.id} removed`, { id: p.id });
                        }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!processes.length && (
                <tr>
                  <td colSpan={9} className="text-gray-500 py-4 text-center">
                    No processes. Add one below or load an example.
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <span>➕</span> Add Process
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium">Allocation</label>
                <div className="flex gap-2">
                  <input ref={allocR1Ref} type="number" min="0" 
                         placeholder="R1"
                         className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/10 transition-all outline-none text-sm" 
                         defaultValue="0" />
                  <input ref={allocR2Ref} type="number" min="0" 
                         placeholder="R2"
                         className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/10 transition-all outline-none text-sm" 
                         defaultValue="0" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium">Maximum</label>
                <div className="flex gap-2">
                  <input ref={maxR1Ref} type="number" min="0" 
                         placeholder="R1"
                         className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/10 transition-all outline-none text-sm" 
                         defaultValue="0" />
                  <input ref={maxR2Ref} type="number" min="0" 
                         placeholder="R2"
                         className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/10 transition-all outline-none text-sm" 
                         defaultValue="0" />
                </div>
              </div>
            </div>
            <button type="button"
                    onClick={(e) => { e.preventDefault(); addProcessFromForm(); }} 
                    className="mt-3 w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all transform hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50">
              Add Process
            </button>
          </div>
        </div>

        {/* Column 3: RAG & Logs */}
        <div className="space-y-6">
          {/* Request Resources */}
          <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/10 shadow-lg">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="text-2xl">📨</span> Request Resources
              </h3>
              <p className="text-xs text-gray-400 mt-1">Simulate a process requesting additional resources</p>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1">
                    Process
                    <Tooltip text="Select which process is requesting resources">
                      <span className="text-gray-500 cursor-help">ⓘ</span>
                    </Tooltip>
                  </label>
                  <select ref={reqPidRef} 
                          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white/10 transition-all outline-none text-sm" 
                          defaultValue="">
                    <option value="" disabled>Select</option>
                    {processes.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1">
                    Req R1
                    <Tooltip text="Number of Resource 1 units requested">
                      <span className="text-gray-500 cursor-help">ⓘ</span>
                    </Tooltip>
                  </label>
                  <input ref={reqR1Ref} type="number" min="0" 
                         placeholder="0"
                         className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white/10 transition-all outline-none text-sm" 
                         defaultValue="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1">
                    Req R2
                    <Tooltip text="Number of Resource 2 units requested">
                      <span className="text-gray-500 cursor-help">ⓘ</span>
                    </Tooltip>
                  </label>
                  <input ref={reqR2Ref} type="number" min="0" 
                         placeholder="0"
                         className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white/10 transition-all outline-none text-sm" 
                         defaultValue="0" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button"
                      onClick={(e) => { e.preventDefault(); handleRequest(); }} 
                      className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-all transform hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/50">
                ✅ Grant Request
              </button>
              <button type="button"
                      onClick={(e) => { e.preventDefault(); simulateRequest(); }} 
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all transform hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/50">
                🔍 Simulate
              </button>
            </div>
            <p className="text-xs text-gray-400">
              <strong>Grant</strong>: Apply if safe. <strong>Simulate</strong>: Test without applying.
            </p>
          </div>

          {/* RAG/WFG */}
          <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-teal-900/20 to-cyan-900/20 border border-teal-500/10 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-2xl">{graphMode === 'rag' ? '🔗' : '🔄'}</span> 
                  {graphMode === 'rag' ? 'Resource Allocation Graph' : 'Wait-For Graph'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {graphMode === 'rag' 
                    ? 'Visual representation of resource allocation and requests' 
                    : 'Process dependencies: who waits for whom'}
                </p>
              </div>
              <button type="button"
                      onClick={(e) => { e.preventDefault(); setGraphMode(m => m === 'rag' ? 'wfg' : 'rag'); }}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs border border-white/10 transition-all">
                🔄 Switch to {graphMode === 'rag' ? 'WFG' : 'RAG'}
              </button>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent"></div>
            {processes.length > 0 ? (
              graphMode === 'rag' ? <RAG/> : <WFG/>
            ) : (
              <div className="flex items-center justify-center py-16 text-center">
                <div className="space-y-2">
                  <div className="text-4xl opacity-30">📊</div>
                  <p className="text-sm text-gray-400">Add processes or load an example</p>
                  <p className="text-xs text-gray-500">to visualize the allocation graph</p>
                </div>
              </div>
            )}
          </div>

          {/* Deadlock Recovery */}
          {deadlockCycle.length > 0 && (
            <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-red-900/30 to-orange-900/20 border border-red-500/20 shadow-lg animate-fadeIn">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-2xl">🚨</span> Deadlock Recovery
                </h3>
                <p className="text-xs text-red-300 mt-1">
                  Cycle detected: <strong>{deadlockCycle.join(' → ')}</strong>
                </p>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Terminate Process</label>
                  <div className="flex gap-2">
                    <select className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                            id="terminatePid">
                      {deadlockCycle.map(pid => (
                        <option key={pid} value={pid}>{pid}</option>
                      ))}
                    </select>
                    <button type="button"
                            onClick={(e) => { 
                              e.preventDefault(); 
                              const pid = document.getElementById('terminatePid').value;
                              terminateProcess(pid); 
                            }}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/50">
                      ❌ Terminate
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Preempt Resource</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                            id="preemptPid">
                      {deadlockCycle.map(pid => (
                        <option key={pid} value={pid}>{pid}</option>
                      ))}
                    </select>
                    <select className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                            id="preemptResource">
                      <option value="r1">R1</option>
                      <option value="r2">R2</option>
                    </select>
                    <button type="button"
                            onClick={(e) => { 
                              e.preventDefault(); 
                              const pid = document.getElementById('preemptPid').value;
                              const res = document.getElementById('preemptResource').value;
                              preemptResource(pid, res); 
                            }}
                            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/50">
                      ⚡ Preempt
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-200">
                <strong>⚠️ Warning:</strong> Recovery actions modify system state. Termination removes process entirely. Preemption deallocates resource.
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-gray-900/20 to-slate-900/20 border border-gray-500/10 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="text-2xl">📋</span> Event Log
              </h3>
              <Tooltip text="Clear all event log entries">
                <button type="button"
                        onClick={(e) => { e.preventDefault(); clearLogs(); }} 
                        className="text-xs text-gray-400 hover:text-white transition-all hover:scale-105">
                  Clear
                </button>
              </Tooltip>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-500/30 to-transparent"></div>
            <div className="max-h-64 overflow-auto bg-black/40 rounded-lg p-3 space-y-1">
              {logs.map((l, i) => {
                const colors = {
                  info: 'text-blue-300 bg-blue-500/5',
                  success: 'text-green-300 bg-green-500/5',
                  warning: 'text-yellow-300 bg-yellow-500/5',
                  error: 'text-red-300 bg-red-500/5'
                };
                return (
                  <div key={i} className={`text-xs ${colors[l.type]} animate-slideIn flex gap-2 py-2 px-2 rounded border-b border-white/5`}>
                    <span className="text-gray-500 font-mono text-[10px] shrink-0">[{l.timestamp}]</span>
                    <span className="leading-relaxed">{l.msg}</span>
                  </div>
                );
              })}
              {!logs.length && <div className="text-xs text-gray-500 text-center py-4">No events yet...</div>}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Prevention Strategies */}
          <div className="card-surface p-5 space-y-5 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/10 shadow-lg">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="text-2xl">🛡️</span> Deadlock Prevention
              </h3>
              <p className="text-xs text-gray-400 mt-1">Enable strategies to prevent deadlock conditions</p>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/10">
                <div className="flex items-center gap-3">
                  <input type="checkbox" 
                         checked={preventionMode.resourceOrdering}
                         onChange={(e) => setPreventionMode(prev => ({...prev, resourceOrdering: e.target.checked}))}
                         className="w-4 h-4 rounded bg-white/10 border-white/20" />
                  <div>
                    <div className="text-sm font-medium">Resource Ordering</div>
                    <div className="text-xs text-gray-400">Enforce R1 → R2 allocation order</div>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/10">
                <div className="flex items-center gap-3">
                  <input type="checkbox" 
                         checked={preventionMode.holdAndWait}
                         onChange={(e) => setPreventionMode(prev => ({...prev, holdAndWait: e.target.checked}))}
                         className="w-4 h-4 rounded bg-white/10 border-white/20" />
                  <div>
                    <div className="text-sm font-medium">No Hold & Wait</div>
                    <div className="text-xs text-gray-400">Process must request all resources at once</div>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/10">
                <div className="flex items-center gap-3">
                  <input type="checkbox" 
                         checked={preventionMode.circularWait}
                         onChange={(e) => setPreventionMode(prev => ({...prev, circularWait: e.target.checked}))}
                         className="w-4 h-4 rounded bg-white/10 border-white/20" />
                  <div>
                    <div className="text-sm font-medium">No Circular Wait</div>
                    <div className="text-xs text-gray-400">Prevent circular dependency chains</div>
                  </div>
                </div>
              </label>
            </div>
            
            {(preventionMode.resourceOrdering || preventionMode.holdAndWait || preventionMode.circularWait) && (
              <div className="p-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs text-purple-200">
                <strong>⚠️ Active Prevention:</strong> System behavior modified to prevent deadlock conditions.
              </div>
            )}
          </div>

          {/* Explanation Panel */}
          {showExplanation && (
            <div className="card-surface p-5 space-y-3 bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border border-indigo-500/10 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className="text-xl">💡</span> Quick Guide
                </h3>
                <button type="button"
                        onClick={(e) => { e.preventDefault(); setShowExplanation(false); }} 
                        className="text-xs text-gray-400 hover:text-white transition-colors">
                  ✕
                </button>
              </div>
              <div className="text-xs text-gray-300 space-y-2">
                <p><strong className="text-white">Alloc:</strong> Resources currently held by process</p>
                <p><strong className="text-white">Max:</strong> Maximum resources process may request</p>
                <p><strong className="text-white">Need:</strong> Max - Alloc (remaining needed)</p>
                <p><strong className="text-white">Available:</strong> Unallocated resources in system</p>
                <p className="pt-2 border-t border-white/10"><strong className="text-green-300">Safe State:</strong> All processes can complete</p>
                <p><strong className="text-red-300">Deadlock:</strong> Circular wait prevents progress</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

function PageLayout({ title, subtitle, children }){
  return (
    <section className="py-20 max-w-7xl mx-auto px-6 space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-400 mt-3 max-w-3xl leading-relaxed">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

