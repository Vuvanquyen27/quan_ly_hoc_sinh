'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/tai-chinh/phai-thu', label: 'Phải thu' },
  { href: '/tai-chinh/phai-tra', label: 'Phải trả' },
  { href: '/tai-chinh/thu-chi', label: 'Thu/chi' },
  { href: '/tai-chinh/han-thanh-toan', label: 'Hạn thanh toán' },
  { href: '/tai-chinh/lich-su', label: 'Lịch sử' },
  { href: '/tai-chinh/danh-muc', label: 'Danh mục' },
]

export function FinanceTabs() {
  const pathname = usePathname()
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-border">
        {TABS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
