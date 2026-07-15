import { FinanceTabs } from '@/components/finance/finance-tabs'

export default function TaiChinhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <FinanceTabs />
      {children}
    </div>
  )
}
