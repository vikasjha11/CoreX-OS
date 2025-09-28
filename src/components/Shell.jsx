import React, { useState } from 'react'
import { useSimulation, useSimActions } from '../state/simulationStore.js'

export default function Shell(){
  const processes = useSimulation(s=>s.processes)
  const actions = useSimActions()
  const [lines,setLines]=useState([{t:'system',out:'CoreXOS shell. help for list.'}])
  const [cmd,setCmd]=useState('')

  function run(line){
    const parts = line.trim().split(/\s+/)
    const c = parts[0]
    let out=''
    switch(c){
      case 'help': out='add name burst mem | run | algo X | quantum n | mem pid size | show procs | clear'; break
      case 'add': actions.addProcess({ name:parts[1], burst:+parts[2], memory:+parts[3] }); out='added'; break
      case 'run': actions.runScheduler(); out='scheduled'; break
      case 'algo': actions.setAlgorithm(parts[1]); out='set algorithm'; break
      case 'quantum': actions.setQuantum(+parts[1]); out='set quantum'; break
      case 'mem': actions.allocateMemory(parts[1], +parts[2]); out='mem attempt'; break
      case 'show':
        if(parts[1]==='procs') out = JSON.stringify(processes.map(p=>({id:p.id,burst:p.burst,m:p.memory})))
        break
      case 'clear': setLines([]); return
      default: out='unknown'
    }
    setLines(l=>[...l,{t:'in',out:line},{t:'out',out}])
  }

  return (
    <div className="border rounded-xl p-4 bg-black text-green-400 font-mono text-xs h-64 flex flex-col">
      <div className="flex-1 overflow-auto space-y-1">
        {lines.map((l,i)=><div key={i} className={l.t==='in'?'text-green-300':'text-green-500'}>{l.out}</div>)}
      </div>
      <form onSubmit={e=>{ e.preventDefault(); if(cmd){ run(cmd); setCmd('') } }} className="flex gap-2 pt-2">
        <span>$</span>
        <input value={cmd} onChange={e=>setCmd(e.target.value)} className="flex-1 bg-transparent outline-none" />
      </form>
    </div>
  )
}