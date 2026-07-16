'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Package, ScrollText } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/admin/tai-khoan', label: 'Tài khoản', icon: Users, exact: false },
  { href: '/admin/goi', label: 'Gói', icon: Package, exact: false },
  { href: '/admin/nhat-ky', label: 'Nhật ký', icon: ScrollText, exact: false },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
}

export function AdminNav() {
  const isActive = useIsActive()
  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {NAV_ITEMS.map(({ href, label, exact }) => (
        <Link
          key={href}
          href={href}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            isActive(href, exact)
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

export function AdminBottomNav() {
  const isActive = useIsActive()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, exact, icon: Icon }) => {
          const active = isActive(href, exact)
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
