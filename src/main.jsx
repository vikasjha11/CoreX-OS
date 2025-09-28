import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { SimulationProvider } from './state/simulationStore.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <SimulationProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </SimulationProvider>
)
