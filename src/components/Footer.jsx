import React from 'react'

const Footer = () => (
  <footer className="py-6 border-t border-gray-200 dark:border-white/10 text-sm">
    <div className="max-w-7xl mx-auto px-6 flex items-center justify-center whitespace-nowrap text-gray-500 dark:text-gray-400">
      © {new Date().getFullYear()} CoreXOS — Learn OS concepts interactively.
    </div>
  </footer>
)

export default Footer