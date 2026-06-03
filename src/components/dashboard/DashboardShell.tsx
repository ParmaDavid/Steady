'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard',          label: 'Overview',   icon: '⊞' },
  { href: '/dashboard/chat',     label: 'Chat',       icon: '💬' },
  { href: '/dashboard/health',   label: 'Health',     icon: '❤' },
  { href: '/dashboard/meals',    label: 'Meals',      icon: '🥗' },
  { href: '/dashboard/calendar', label: 'Calendar',   icon: '📅' },
  { href: '/dashboard/home',     label: 'Home',       icon: '🏠' },
  { href: '/dashboard/vehicles', label: 'Vehicles',   icon: '🚗' },
  { href: '/dashboard/vault',    label: 'Vault',      icon: '🔒' },
  { href: '/dashboard/settings', label: 'Settings',   icon: '⚙' },
]

interface Props {
  children: React.ReactNode
  userName: string
  avatarColor: string
  householdName: string
  plan: string
}

export default function DashboardShell({ children, userName, avatarColor, householdName, plan }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo + household */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="text-lg font-semibold text-brand-700">Stead</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{householdName}</div>
          {plan === 'free' && (
            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Free</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {userName[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-gray-700 truncate flex-1">{userName}</span>
          <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-600">
            Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
