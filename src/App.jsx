import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/navbar'
import Hero from './components/Hero'
import Services from './components/Services'
import ProblemSolved from './components/ProblemSolved'
import ContactUs from './components/ContactUs'
import Footer from './components/Footer'
import DeadlockSync from './pages/DeadlockSync'
import ShellKernel from './pages/ShellKernel'
import SecurityAccess from './pages/SecurityAccess'
import Gamification from './pages/Gamification'
import InnovationPage from './pages/Innovation'
import ProcessMemoryCore from './pages/ProcessMemoryCore.jsx'
import Developers from './components/Developers'

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <div className="min-h-screen font-sans bg-app">
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <Landing />
          }
        />
        <Route path="/deadlock" element={<DeadlockSync />} />
        <Route path="/shell-kernel" element={<ShellKernel />} />
        <Route path="/security" element={<SecurityAccess />} />
        <Route path="/gamification" element={<Gamification />} />
        <Route path="/innovation" element={<InnovationPage />} />
        <Route path="/process-memory" element={<ProcessMemoryCore />} />
        <Route path="/process-management" element={<ProcessMemoryCore />} />
        <Route path="/memory-management" element={<ProcessMemoryCore />} />
      </Routes>
      <Footer />
    </div>
  )
}

function Landing() {
  return (
    <main>
      <Hero />
      <Services />
      <ProblemSolved />
      <Developers />
      <ContactUs />
    </main>
  )
}

export default App
