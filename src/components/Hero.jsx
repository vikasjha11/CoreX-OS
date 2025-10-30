const Hero = () => (
  <section className="relative overflow-hidden bg-black">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-40 -left-32 w-[550px] h-[550px] bg-indigo-600/25 blur-3xl rounded-full" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-blue-600/15 blur-3xl rounded-full" />
    </div>

    <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20">
      <div className="flex justify-center">
        <div className="flex items-center gap-3 border border-white/15 rounded-full px-5 py-2 bg-white/5 backdrop-blur text-xs text-gray-200">
          <span className="whitespace-nowrap">OS-in-a-Box · Tap. Go. Learn.</span>
        </div>
      </div>

      <h1 className="mt-12 text-center font-[480] tracking-tight leading-[1.05] text-4xl sm:text-5xl md:text-7xl text-white">
        Experience how an <span className="text-indigo-500">OS thinks</span>.
      </h1>

      <p className="glow-paragraph mt-8 max-w-2xl mx-auto text-center text-base sm:text-lg">
        CoreXOS models process scheduling, memory allocation, deadlocks, synchronization, security, kernel transitions,
        gamified challenges and AI‑assisted optimization—all in one browser lab.
      </p>

      <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
        <a href="#modules" className="px-8 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow inline-flex justify-center">
          Start Exploring
        </a>
        <a href="#problems" className="px-8 py-3.5 rounded-full border border-white/15 hover:border-white/40 text-sm text-white inline-flex justify-center">
          Problems Solved
        </a>
      </div>

      <div className="mt-24">
        <div className="relative mx-auto max-w-5xl rounded-[48px] overflow-hidden aspect-[16/7] ring-1 ring-white/10 shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=60"
            alt="Simulation panels"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/0" />
        </div>
      </div>
    </div>
  </section>
)
export default Hero