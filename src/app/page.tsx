import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-xl font-semibold text-brand-700">Stead</span>
        <div className="flex gap-3">
          <Link href="/auth/login" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link href="/auth/signup" className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-semibold text-gray-900 leading-tight mb-6">
          Your family&apos;s<br />home base
        </h1>
        <p className="text-xl text-gray-500 mb-10 leading-relaxed">
          Health tracking, shared calendar, vehicle maintenance, emergency documents —
          all managed through a simple conversation.
        </p>
        <Link
          href="/auth/signup"
          className="inline-block px-8 py-4 bg-brand-600 text-white text-lg rounded-xl hover:bg-brand-700 transition-colors"
        >
          Start for free
        </Link>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: '💬', title: 'Chat first', desc: 'Log anything by just saying it. "Changed the oil on the truck today" is all it takes.' },
          { icon: '🏠', title: 'Everything in one place', desc: 'Health, meals, schedule, vehicles, household tasks, and important documents.' },
          { icon: '🔒', title: 'Emergency vault', desc: 'Securely store important documents and share them with trusted people when it matters most.' },
        ].map(f => (
          <div key={f.title} className="bg-gray-50 rounded-2xl p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
