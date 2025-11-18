export function cloneProcesses(processes){
  return processes.map((p, i) => ({ id: p.id ?? i, name: p.name ?? `P${i}`, arrival: p.arrival ?? 0, burst: p.burst ?? p.duration ?? 5, priority: p.priority ?? 1 }))
}

// Simple FCFS non-preemptive simulator
export function simulateFCFS(procs){
  const procsSorted = [...procs].sort((a,b)=>a.arrival - b.arrival)
  let time=0, context=0, busyTime=0
  const results = {}
  procsSorted.forEach((p, idx) =>{
    if(time < p.arrival) time = p.arrival
    const start = time
    const response = start - p.arrival
    const waiting = start - p.arrival
    time += p.burst
    const turnaround = time - p.arrival
    busyTime += p.burst
    results[p.id] = { waiting, turnaround, response }
    if(idx>0) context++
  })
  return summarize(results, procs.length, time, busyTime, context)
}

// SJF non-preemptive
export function simulateSJF(procs){
  const pending = [...procs].map(p=>({...p}))
  let time=0, context=0, busyTime=0
  const results = {}
  while(pending.length){
    const available = pending.filter(p=>p.arrival<=time)
    let p
    if(available.length===0){
      time = Math.min(...pending.map(x=>x.arrival));
      continue
    }else{
      available.sort((a,b)=>a.burst-b.burst)
      p = available[0]
    }
    const idx = pending.findIndex(x=>x.id===p.id)
    pending.splice(idx,1)
    const start=time
    const response = start - p.arrival
    const waiting = start - p.arrival
    time += p.burst
    const turnaround = time - p.arrival
    busyTime += p.burst
    results[p.id] = { waiting, turnaround, response }
    if(Object.keys(results).length>1) context++
  }
  return summarize(results, Object.keys(results).length, time, busyTime, context)
}

// Round Robin preemptive
export function simulateRR(procs, quantum=4){
  const queue = [...procs].map(p=>({...p, remaining:p.burst}))
  queue.sort((a,b)=>a.arrival - b.arrival)
  let time=0, context=0, busyTime=0
  const results = {}
  const ready=[]
  while(queue.length || ready.length){
    while(queue.length && queue[0].arrival<=time) ready.push(queue.shift())
    if(ready.length===0){
      time = queue[0].arrival; continue
    }
    const p = ready.shift()
    const start = results[p.id]?.startedAt ?? time
    if(results[p.id]===undefined) results[p.id] = { waiting:0, turnaround:0, response: time - p.arrival }
    const exec = Math.min(quantum, p.remaining)
    p.remaining -= exec
    time += exec
    busyTime += exec
    if(p.remaining>0){
      // requeue
      while(queue.length && queue[0].arrival<=time) ready.push(queue.shift())
      ready.push(p)
      context++
    }else{
      const turnaround = time - p.arrival
      const waiting = turnaround - p.burst
      results[p.id] = { waiting, turnaround, response: results[p.id].response }
      if(ready.length>0 || queue.length>0) context++
    }
  }
  return summarize(results, Object.keys(results).length, time, busyTime, context)
}

// Priority non-preemptive (lower number = higher priority)
export function simulatePriority(procs){
  const pending = [...procs].map(p=>({...p}))
  let time=0, context=0, busyTime=0
  const results = {}
  while(pending.length){
    const available = pending.filter(p=>p.arrival<=time)
    let p
    if(available.length===0){
      time = Math.min(...pending.map(x=>x.arrival));
      continue
    }else{
      available.sort((a,b)=>a.priority - b.priority)
      p = available[0]
    }
    const idx = pending.findIndex(x=>x.id===p.id)
    pending.splice(idx,1)
    const start=time
    const response = start - p.arrival
    const waiting = start - p.arrival
    time += p.burst
    const turnaround = time - p.arrival
    busyTime += p.burst
    results[p.id] = { waiting, turnaround, response }
    if(Object.keys(results).length>1) context++
  }
  return summarize(results, Object.keys(results).length, time, busyTime, context)
}

function summarize(results, n, totalTime, busyTime, context){
  const avgWaiting = average(Object.values(results).map(r=>r.waiting))
  const avgTurnaround = average(Object.values(results).map(r=>r.turnaround))
  const avgResponse = average(Object.values(results).map(r=>r.response))
  const cpuUtil = totalTime>0 ? Math.round((busyTime/totalTime)*100) : 0
  const throughput = n / (totalTime || 1)
  return { avgWaiting, avgTurnaround, avgResponse, contextSwitches: context, cpuUtilization: cpuUtil, throughput }
}
function average(arr){ if(!arr.length) return 0; return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) }

// Helper: generate synthetic workload based on pattern
export function generateWorkload(pattern='mixed', count=6){
  const res=[]
  for(let i=0;i<count;i++){
    let burst=5, priority=1
    switch(pattern){
      case 'cpu': burst = 8 + Math.round(Math.random()*8); priority = 2; break
      case 'io': burst = 1 + Math.round(Math.random()*3); priority = 3; break
      case 'mixed': burst = 2 + Math.round(Math.random()*6); priority = 2; break
      case 'light': burst = 1 + Math.round(Math.random()*2); priority = 3; break
      case 'heavy': burst = 6 + Math.round(Math.random()*10); priority = 1; break
    }
    res.push({ id: `p${i+1}`, name: `P${i+1}`, arrival: Math.floor(Math.random()*3), burst, priority })
  }
  return res
}

// Recommend an RR quantum based on average burst and target utilization
export function predictQuantum(processes, targetUtil=90){
  if(!processes || !processes.length) return 4
  const avg = processes.reduce((a,b)=>a+b.burst,0)/processes.length
  // heuristic: quantum ~ half the average burst, constrained
  const q = Math.max(1, Math.round(avg * 0.5))
  // adjust for target utilization: if target is high, nudge up
  const adj = Math.round((targetUtil - 75)/25)
  return Math.max(1, q + adj)
}
