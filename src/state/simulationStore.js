import React, { createContext, useContext, useRef, useSyncExternalStore, useCallback } from 'react'
import { scheduleFCFS, scheduleSJF, schedulePriority, scheduleRR } from '../core/scheduling/algorithms.js'
import { firstFit, bestFit, worstFit, release as releaseMem } from '../core/memory/alloc.js'
import { bankersSafe } from '../core/deadlock/bankers.js'
import { genId, nowTs } from '../utils/id.js'

const algMap = { FCFS: scheduleFCFS, SJF: scheduleSJF, PRIORITY: schedulePriority, RR: scheduleRR }

const initialMemoryTotal = 256

const initialState = {
  mode: 'user',
  role: 'viewer',
  processes: [],
  readyQueue: [],
  waitQueue: [],
  memory: {
    total: initialMemoryTotal,
    strategy: 'FIRST_FIT',
    blocks: [{ id: 'b0', size: initialMemoryTotal, allocatedTo: null }],
  },
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
    const draft = JSON.parse(JSON.stringify(prev)) 
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
      const proc = { 
        id: genId(), 
        name: p.name||'P'+(state.processes.length+1), 
        burst:p.burst||5, 
        arrival:p.arrival||0, 
        priority:p.priority||1, 
        memory:p.memory||32, 
        state:'ready' 
      }
      set(s=>{
        s.processes=[...s.processes, proc]
        s.readyQueue=[...s.readyQueue, proc.id]
        return s
      })
      pushLog(`process added ${proc.id}`)
    },
    removeProcess(pid){
      set(s=>{
        s.processes = s.processes.filter(p => p.id !== pid)
        s.readyQueue = s.readyQueue.filter(id => id !== pid)
        return s
      })
      pushLog(`process removed ${pid}`)
    },
    setAlgorithm(a){ set(s=>{ s.scheduling={ ...s.scheduling, algorithm:a }; return s }); pushLog(`algorithm -> ${a}`) },
    setQuantum(q){ set(s=>{ s.scheduling={ ...s.scheduling, quantum:q }; return s }); pushLog(`quantum -> ${q}`) },
    runScheduler(){
      const fn = algMap[state.scheduling.algorithm]
      if(!fn) {
        pushLog('Invalid algorithm', 'error')
        return
      }
      try {
        const result = fn(state.processes, state.scheduling.quantum)
        set(s=>{
          s.scheduling = { ...s.scheduling, timeline: result.timeline, metrics: result.metrics }
          return s
        })
        pushLog(`scheduler run (${state.scheduling.algorithm})`)
      } catch(e) {
        pushLog(`scheduler error: ${e.message}`, 'error')
      }
    },
    setMemoryStrategy(strategy){
      set(s => {
        s.memory.strategy = strategy
        return s
      })
    },
    allocateMemory(pid, size){
      set(s => {
        const sz = Number(size)
        if (!pid || !(sz > 0)) return s
        const { strategy, blocks } = s.memory
        let res
        if (strategy === 'BEST_FIT') res = bestFit(blocks, pid, sz)
        else if (strategy === 'WORST_FIT') res = worstFit(blocks, pid, sz)
        else res = firstFit(blocks, pid, sz)
        if (res.ok){
          s.memory.blocks = res.blocks
        }
        return s
      })
    },
    releaseMemory(pid){
      set(s => {
        if (!pid) return s
        const res = releaseMem(s.memory.blocks, pid)
        if (res.ok){
          s.memory.blocks = res.blocks
        }
        return s
      })
    },
    resetMemory(){
      set(s => {
        s.memory = {
          total: s.memory.total ?? initialMemoryTotal,
          strategy: 'FIRST_FIT',
          blocks: [{ id: 'b0', size: s.memory.total ?? initialMemoryTotal, allocatedTo: null }],
        }
        return s
      })
    },
    checkDeadlock(){
      try {
        const safe = bankersSafe(state.processes, state.resources)
        pushLog(`deadlock check: ${safe?'safe':'UNSAFE'}`, safe?'info':'error')
        return safe
      } catch(e) {
        pushLog(`deadlock check error: ${e.message}`, 'error')
        return true // Assume safe on error
      }
    },
    resetAll(){
      set(()=> structuredClone
        ? structuredClone(initialState)
        : JSON.parse(JSON.stringify(initialState))
      )
    },
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
  const getSnapshot = useCallback(() => {
    try {
      return selector(store.getState())
    } catch(e) {
      console.error('useSimulation selector error:', e)
      return selector(initialState) 
    }
  }, [store, selector])
  
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export function useSimActions(){
  const store = useContext(StoreContext)
  if(!store) throw new Error('SimulationProvider missing')
  return store.actions
}

export { /* ...existing exports... */ }