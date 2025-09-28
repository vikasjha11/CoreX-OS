import React, { useState } from 'react'

const MAIL_TO = 'engineeringcorexos@gmail.com'

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [copied, setCopied] = useState(false)

  const update = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  function buildMailto() {
    const subject = form.subject || `Contact from ${form.name || 'CoreXOS User'}`
    const bodyLines = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Subject: ${form.subject}`,
      '',
      form.message
    ]
    const body = bodyLines.join('\n')
    return `mailto:${MAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.message) return
    const link = buildMailto()
    // Some clients block long mailto URIs; fallback copy if too long
    if (link.length > 1800) {
      navigator.clipboard.writeText(
        `Send to: ${MAIL_TO}\n\nSubject: ${form.subject || '(none)'}\n\n${form.message}`
      ).then(()=> setCopied(true))
      return
    }
    window.location.href = link
  }

  return (
    <section id="contact" className="py-24 bg-gradient-to-b from-black to-black/80">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">Contact Engineers</h2>
        <p className="mt-4 text-sm md:text-base text-gray-400 max-w-xl">
          Suggest improvements, report issues, or request enhancements. Your message opens directly in your mail client—no data stored here.
        </p>

        <form onSubmit={onSubmit} className="mt-10 grid gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={update}
                placeholder="Your name"
                className="w-full h-12 rounded-xl px-4 bg-white/5 border border-white/10 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Email *</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={update}
                placeholder="you@domain.com"
                className="w-full h-12 rounded-xl px-4 bg-white/5 border border-white/10 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Subject</label>
              <input
                name="subject"
                value={form.subject}
                onChange={update}
                placeholder="Improvement / Fix Request"
                className="w-full h-12 rounded-xl px-4 bg-white/5 border border-white/10 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Message *</label>
            <textarea
              name="message"
              required
              rows={6}
              value={form.message}
              onChange={update}
              placeholder="Describe the improvement or issue..."
              className="w-full rounded-xl p-4 bg-white/5 border border-white/10 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <button
              type="submit"
              disabled={!form.email || !form.message}
              className="px-8 h-12 rounded-full bg-indigo-600 disabled:bg-indigo-800/50 disabled:cursor-not-allowed hover:bg-indigo-500 text-white text-sm font-medium transition"
            >
              Open Email Draft
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(buildMailto())
                setCopied(true)
                setTimeout(()=>setCopied(false), 2500)
              }}
              className="text-xs text-gray-400 hover:text-indigo-400 transition"
            >
              {copied ? 'Copied!' : 'Copy mailto link'}
            </button>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            No backend submission. The form builds a mailto link locally. Very long messages will be copied to clipboard if they exceed URL size limits.
          </p>
        </form>
      </div>
    </section>
  )
}