import React from 'react'

const Footer = () => (
  <footer className="py-10 border-t border-gray-200 dark:border-white/10 text-sm">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
      <span className="text-gray-500 dark:text-gray-400">&copy; {new Date().getFullYear()} CoreXOS</span>
      <div className="flex gap-6 text-gray-500 dark:text-gray-400 text-xs">
        <a href="#modules" className="hover:text-indigo-500">Modules</a>
        <a href="#challenges" className="hover:text-indigo-500">Challenges</a>
        <a href="#innovation" className="hover:text-indigo-500">Innovation</a>
      </div>
    </div>
  </footer>
)

export default Footer