import { } from './algorithms' // placeholder if file already exists
// Processes: [{id, arrival, burst, priority}]
export function scheduleFCFS(list){
  const procs = [...list].sort((a,b)=>a.arrival-b.arrival)
  let time = 0
  const timeline = []
  const waits = []
  const turns = []
  procs.forEach(p=>{
    if(time < p.arrival) time = p.arrival
    const start = time
    time += p.burst
    timeline.push({ pid:p.id, start, end: time })
    waits.push(start - p.arrival)
    turns.push(time - p.arrival)
  })
  return metricsResult(timeline, waits, turns, time)
}

export function scheduleSJF(list){
  const ready = []
  const procs = [...list].sort((a,b)=>a.arrival-b.arrival)
  let time = 0, i=0
  const timeline=[], waits=[], turns=[]
  while(i<procs.length || ready.length){
    while(i<procs.length && procs[i].arrival <= time) ready.push(procs[i++])
    if(!ready.length){ time = procs[i].arrival; continue }
    ready.sort((a,b)=>a.burst-b.burst)
    const p = ready.shift()
    const start = time
    time += p.burst
    timeline.push({ pid:p.id, start, end:time })
    waits.push(start - p.arrival)
    turns.push(time - p.arrival)
  }
  return metricsResult(timeline, waits, turns, time)
}

export function schedulePriority(list){
  const ready=[]
  const procs=[...list].sort((a,b)=>a.arrival-b.arrival)
  let time=0,i=0
  const timeline=[], waits=[], turns=[]
  while(i<procs.length || ready.length){
    while(i<procs.length && procs[i].arrival <= time) ready.push(procs[i++])
    if(!ready.length){ time=procs[i].arrival; continue }
    ready.sort((a,b)=>a.priority-b.priority)
    const p=ready.shift()
    const start=time
    time+=p.burst
    timeline.push({ pid:p.id,start,end:time })
    waits.push(start-p.arrival)
    turns.push(time-p.arrival)
  }
  return metricsResult(timeline, waits, turns, time)
}

export function scheduleRR(list, quantum=4){
  const queue=[...list].sort((a,b)=>a.arrival-b.arrival)
  const pending=[]
  let time=queue[0]?.arrival||0
  const remain = Object.fromEntries(list.map(p=>[p.id,p.burst]))
  const timeline=[]
  while(queue.length || pending.length){
    while(queue.length && queue[0].arrival <= time) pending.push(queue.shift())
    if(!pending.length){ time = queue[0].arrival; continue }
    const p = pending.shift()
    const slice = Math.min(quantum, remain[p.id])
    const start = time
    time += slice
    remain[p.id]-=slice
    timeline.push({ pid:p.id, start, end:time })
    while(queue.length && queue[0].arrival <= time) pending.push(queue.shift())
    if(remain[p.id]>0) pending.push(p)
  }
  // Compute waits & turns from timeline
  const grouped = {}
  timeline.forEach(s=>{
    grouped[s.pid] = grouped[s.pid] || { first:s.start, total:0, last:s.end }
    grouped[s.pid].total += (s.end - s.start)
    grouped[s.pid].last = s.end
  })
  const waits=[], turns=[]
  list.forEach(p=>{
    waits.push( (grouped[p.id].last - p.arrival) - p.burst )
    turns.push( grouped[p.id].last - p.arrival )
  })
  return metricsResult(timeline, waits, turns, Math.max(...Object.values(grouped).map(g=>g.last)))
}

function metricsResult(timeline, waits, turns, finish){
  const avg = a => a.reduce((s,v)=>s+v,0)/a.length || 0
  return {
    timeline,
    metrics:{
      avgWaiting: +avg(waits).toFixed(2),
      avgTurnaround: +avg(turns).toFixed(2),
      cpuUtilization: 100, // assuming continuous use (extend with idle tracking)
      totalTime: finish
    }
  }
}