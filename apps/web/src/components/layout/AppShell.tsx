import { useState } from 'react'
import type { UserRole } from '@keve/shared'
import { NAV_BY_ROLE } from '@/config/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Outlet } from 'react-router-dom'

export function AppShell({ role }: { role: UserRole }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const config = NAV_BY_ROLE[role]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar config={config} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} config={config} />
      <div className="lg:pl-60">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav config={config} />
    </div>
  )
}
