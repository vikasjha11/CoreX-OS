import React from 'react'

export default function SecurityAccess(){
  return (
    <PageLayout
      title="Security & Access Control"
      subtitle="Role-based permissions, sudo elevation, audit log stream (to be wired).">
      <div className="card-surface p-6 text-xs space-y-4">
        <h3 className="font-semibold text-sm">Planned Implementation</h3>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Add roles: viewer, user, admin in store</li>
          <li>Wrap mutating actions with guard(role)</li>
          <li>sudo command sets elevated flag with timeout</li>
          <li>Audit log table & export</li>
        </ol>
      </div>
    </PageLayout>
  )
}

function PageLayout({ title, subtitle, children }){
  return (
    <section className="py-20 max-w-5xl mx-auto px-6 space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-3">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}