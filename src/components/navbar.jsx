import { useState } from 'react'
import { IconMenu, IconClose, IconArrowRight } from './ui-icons'

const links = [
  { href: '/#problems', label: 'Problems' },
  { href: '/#modules', label: 'Solution' },
  { href: '/#developers', label: 'Developers' }
]

const Navbar = () => {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-black/80 border-b border-white/5">
      <nav className="mx-auto max-w-7xl px-6 flex items-center h-20">
        {/* Brand */}
        <a href="#" className="flex items-center gap-2 font-semibold text-white">
          <span className="inline-flex h-8 w-8 rounded-md bg-gradient-to-tr from-indigo-500 to-blue-600 items-center justify-center text-[10px] font-bold tracking-wider">CX</span>
          <span className="text-lg">Core<span className="text-indigo-500">XOS</span></span>
        </a>

        {/* Center links */}
        <div className="flex-1 flex justify-center">
          <div className="hidden md:flex gap-10 text-sm">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="text-gray-300 hover:text-white transition relative after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 hover:after:w-full after:bg-indigo-500 after:transition-all"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <a
            href="/#contact"
            className="hidden md:inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-5 py-2.5 rounded-full transition shadow"
          >
            Contact
          </a>
            <a
              href="/#modules"
              className="hidden md:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-full transition shadow"
            >
              Open Demo <IconArrowRight className="w-4 h-4" />
            </a>

          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden h-10 w-10 rounded-md border border-white/10 flex items-center justify-center text-gray-300"
          >
            {open ? <IconClose className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-6 pb-6 space-y-4 bg-black/90 border-t border-white/5">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-gray-300 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <a
              href="/#contact"
              onClick={() => setOpen(false)}
              className="inline-flex flex-1 items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-5 py-2.5 rounded-full transition shadow"
            >
              Contact
            </a>
            <a
              href="/#modules"
              onClick={() => setOpen(false)}
              className="inline-flex flex-1 items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-full transition shadow"
            >
              Demo
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
