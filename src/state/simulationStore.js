import React, { createContext, useContext, useRef, useSyncExternalStore } from 'react'
import { scheduleFCFS, scheduleSJF, schedulePriority, scheduleRR } from '../core/scheduling/algorithms.js'
import { firstFit, bestFit, worstFit } from '../core/memory/alloc.js'
import { bankersSafe } from '../core/deadlock/bankers.js'
import { genId, nowTs } from '../utils/id.js'

const algMap = { FCFS: scheduleFCFS, SJF: scheduleSJF, PRIORITY: schedulePriority, RR: scheduleRR }
const memStrategies = { FIRST_FIT: firstFit, BEST_FIT: bestFit, WORST_FIT: worstFit }

const initialState = {
  mode: 'user',
  role: 'viewer',
  processes: [],
  readyQueue: [],
  waitQueue: [],
  memory: { total: 512, blocks: [{ id: 'b0', size: 512, allocatedTo: null }], strategy: 'FIRST_FIT' },
  resources: { R1: { total: 3, allocated: {} }, R2: { total: 2, allocated: {} } },
  scheduling: { algorithm: 'FCFS', quantum: 4, timeline: [], metrics: null },
  logs: [],
  challenges: { active: null, scores: {}, badges: [] }
}

function createStore(){
  let state = initialState
  const listeners = new Set()
  const notify = () => listeners.forEach(l=>l())

  const set = updater => {
    const prev = state
    const draft = { ...prev }
    const result = typeof updater === 'function' ? updater(draft) : Object.assign(draft, updater)
    state = result || draft
    notify()
  }

  const pushLog = (msg,type='info') => {
    set(s => {
      s.logs = [...s.logs, { id: genId(), t: nowTs(), type, msg }]
      return s
    })
  }

  const actions = {
    setRole(role){ set(s=>{ s.role=role; return s }); pushLog(`role -> ${role}`,'auth') },
    toggleMode(){ set(s=>{ s.mode=s.mode==='user'?'kernel':'user'; return s }) },
    addProcess(p){
      const proc = { id: genId(), name: p.name||'P'+(state.processes.length+1), burst:p.burst||5, arrival:p.arrival||0, priority:p.priority||1, memory:p.memory||32, state:'ready' }
      set(s=>{
        s.processes=[...s.processes, proc]
        s.readyQueue=[...s.readyQueue, proc.id]
        return s
      })
      pushLog(`process added ${proc.id}`)
    },
    setAlgorithm(a){ set(s=>{ s.scheduling={ ...s.scheduling, algorithm:a }; return s }); pushLog(`algorithm -> ${a}`) },
    setQuantum(q){ set(s=>{ s.scheduling={ ...s.scheduling, quantum:q }; return s }); pushLog(`quantum -> ${q}`) },
    runScheduler(){
      const fn = algMap[state.scheduling.algorithm]
      if(!fn) return
      const result = fn(state.processes, state.scheduling.quantum)
      set(s=>{
        s.scheduling = { ...s.scheduling, timeline: result.timeline, metrics: result.metrics }
        return s
      })
      pushLog(`scheduler run (${state.scheduling.algorithm})`)
    },
    allocateMemory(pid,size){
      const strat = memStrategies[state.memory.strategy]
      const res = strat(state.memory.blocks, pid, size)
      if(res.ok){
        set(s=>{
          s.memory = { ...s.memory, blocks: res.blocks }
          return s
        })
        pushLog(`mem alloc pid=${pid} size=${size}`)
      } else pushLog(`mem alloc failed pid=${pid} size=${size}`,'warn')
    },
    releaseMemory(pid){
      set(s=>{
        s.memory = {
          ...s.memory,
            blocks: s.memory.blocks.map(b=> b.allocatedTo===pid ? { ...b, allocatedTo:null } : b)
        }
        return s
      })
      pushLog(`mem released pid=${pid}`)
    },
    checkDeadlock(){
      const safe = bankersSafe(state.processes, state.resources)
      pushLog(`deadlock check: ${safe?'safe':'UNSAFE'}`, safe?'info':'error')
      return safe
    }
  }

  return {
    getState: ()=>state,
    subscribe: (l)=>{ listeners.add(l); return ()=>listeners.delete(l) },
    actions
  }
}

const StoreContext = createContext(null)

export function SimulationProvider({ children }){
  const ref = useRef()
  if(!ref.current) ref.current = createStore()
  return React.createElement(StoreContext.Provider,{ value: ref.current }, children)
}

export function useSimulation(selector = s=>s){
  const store = useContext(StoreContext)
  if(!store) throw new Error('SimulationProvider missing')
  const getSnapshot = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export function useSimActions(){
  const store = useContext(StoreContext)
  if(!store) throw new Error('SimulationProvider missing')
  return store.actions
}