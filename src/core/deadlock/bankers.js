// (reuse previously supplied bankersSafe implementation)
export function bankersSafe(processes, resources){
  const available = {}
  Object.entries(resources).forEach(([r,info])=>{
    const allocatedSum = Object.values(info.allocated).reduce((s,v)=>s+v,0)
    available[r] = info.total - allocatedSum
  })
  const need = processes.map(p=>({
    id:p.id,
    need: Object.fromEntries(Object.keys(resources).map(r=>[
      r,(p.max?.[r]||0)-(p.alloc?.[r]||0)
    ])),
    alloc: p.alloc || {}
  }))
  const finished = new Set()
  let changed = true
  while(changed){
    changed = false
    for(const p of need){
      if(finished.has(p.id)) continue
      if(Object.entries(p.need).every(([r,a])=>a <= available[r])){
        Object.entries(p.alloc).forEach(([r,a])=> available[r]+=a)
        finished.add(p.id)
        changed = true
      }
    }
  }
  return finished.size === processes.length
}