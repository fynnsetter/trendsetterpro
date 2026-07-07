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
          {/* 🔥 Logo in top-left */}
          <div className="flex items-center justify-between py-4">
            <Link href="/dashboard/overview" className="flex items-center gap-2 shrink-0">
              <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                <span className="text-[#d8bb6b]">Trend</span>
                <span className="text-white">Setter</span>
              </span>
            </Link>
            
            {/* Right side: Notification + Search */}
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="w-64">
                <SearchAutocomplete />
              </div>
            </div>
          </div>

          {/* 🔥 Tabs below logo */}
          <nav className="flex space-x-6 flex-wrap pb-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = 
                pathname === tab.href || 
                (tab.id === 'overview' && pathname === '/dashboard')
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`py-2 border-b-2 font-medium text-sm transition-all ${
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
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}