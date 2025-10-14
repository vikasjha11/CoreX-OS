export function firstFit(blocks, pid, size){
  const clone = blocks.map(b=>({...b}))
  for(let i=0;i<clone.length;i++){
    if(!clone[i].allocatedTo && clone[i].size >= size){
      return applyAllocation(clone, i, pid, size)
    }
  }
  return { ok:false, blocks }
}

export function bestFit(blocks, pid, size){
  const clone = blocks.map(b=>({...b}))
  let bestIndex = -1
  for(let i=0;i<clone.length;i++){
    const b = clone[i]
    if(!b.allocatedTo && b.size >= size){
      if(bestIndex === -1 || b.size < clone[bestIndex].size) bestIndex = i
    }
  }
  if(bestIndex === -1) return { ok:false, blocks }
  return applyAllocation(clone, bestIndex, pid, size)
}

export function worstFit(blocks, pid, size){
  const clone = blocks.map(b=>({...b}))
  let worstIndex = -1
  for(let i=0;i<clone.length;i++){
    const b = clone[i]
    if(!b.allocatedTo && b.size >= size){
      if(worstIndex === -1 || b.size > clone[worstIndex].size) worstIndex = i
    }
  }
  if(worstIndex === -1) return { ok:false, blocks }
  return applyAllocation(clone, worstIndex, pid, size)
}

export function release(blocks, pid){
  const clone = blocks.map(b => b.allocatedTo === pid ? { ...b, allocatedTo: null } : { ...b })
  return { ok:true, blocks: mergeFree(clone) }
}

function applyAllocation(clone, idx, pid, size){
  const block = clone[idx]
  if(block.size === size){
    block.allocatedTo = pid
  } else {
    const remain = block.size - size
    block.size = size
    block.allocatedTo = pid
    clone.splice(idx+1,0,{ id: block.id+'_rest', size: remain, allocatedTo: null })
  }
  return { ok:true, blocks: mergeFree(clone) }
}

function mergeFree(blocks){
  const out=[]
  for(const b of blocks){
    const last = out[out.length-1]
    if(last && !last.allocatedTo && !b.allocatedTo){
      last.size += b.size
    } else out.push(b)
  }
  return out
}