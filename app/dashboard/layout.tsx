'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import NotificationBell from '@/components/NotificationBell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const tabs = [
    { id: 'overview', label: 'Overview', href: '/dashboard/overview' },
    { id: 'analysis', label: 'Analysis', href: '/dashboard/analysis' },
    { id: 'watchlist', label: 'Watchlist', href: '/dashboard/watchlist' },
    { id: 'alerts', label: 'Alerts', href: '/dashboard/alerts' },
    { id: 'saved', label: 'Saved', href: '/dashboard/saved-analyses' },
    { id: 'settings', label: 'Settings', href: '/dashboard/settings' },
  ]

  return (
    <div className="min-h-screen bg-[#1a2332]">
      <div className="border-b border-white/10 bg-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col gap-4 py-4">
            {/* Logo + Tabs - Stack on mobile */}
            <div className="flex flex-wrap items-center gap-4 overflow-x-auto">
              <Link href="/dashboard/overview" className="flex items-center gap-2 shrink-0">
                <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <span className="text-[#d8bb6b]">Trend</span>
                  <span className="text-white">Setter</span>
                </span>
              </Link>

              <nav className="flex gap-4 text-sm flex-wrap" aria-label="Tabs">
                {tabs.map((tab) => {
                  const isActive = 
                    pathname === tab.href || 
                    (tab.id === 'overview' && pathname === '/dashboard')
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={`py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                        isActive
                          ? 'border-[#d8bb6b] text-[#d8bb6b]'
                          : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Search & Notification - Stack on mobile */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <SearchAutocomplete />
              </div>
              <NotificationBell />
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}