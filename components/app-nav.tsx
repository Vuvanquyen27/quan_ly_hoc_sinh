'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/tong-quan', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/hoc-sinh', label: 'Học sinh', icon: Users },
  { href: '/bai-hoc', label: 'Bài học', icon: BookOpen },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || pathname.startsWith(href + '/')
}

export function DesktopNav() {
  const isActive = useIsActive()
  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            isActive(href)
              ? 'bg-secondary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function BottomNav() {
  const isActive = useIsActive()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
