import { monthLabel, type CashflowMonth } from '@/lib/reports'
import { formatVND } from '@/lib/format'

export function CashflowChart({ data }: { data: CashflowMonth[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.total_income, d.total_expense)))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-success" /> Thu</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-destructive" /> Chi</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-end gap-4 sm:gap-6" style={{ height: 180 }}>
          {data.map((d) => (
            <div key={d.ym} className="flex h-full flex-col items-center justify-end gap-1">
              <div className="flex h-full items-end gap-1">
                <div
                  className="w-4 rounded-t bg-success sm:w-6"
                  style={{ height: `${(d.total_income / max) * 100}%` }}
                  title={`Thu ${monthLabel(d.ym)}: ${formatVND(d.total_income)}`}
                />
                <div
                  className="w-4 rounded-t bg-destructive sm:w-6"
                  style={{ height: `${(d.total_expense / max) * 100}%` }}
                  title={`Chi ${monthLabel(d.ym)}: ${formatVND(d.total_expense)}`}
                />
              </div>
              <span className="text-[0.7rem] text-muted-foreground">{monthLabel(d.ym)}</span>
              <span className={`text-[0.7rem] font-medium ${d.net_cashflow >= 0 ? 'text-success' : 'text-destructive'}`}>
                {d.net_cashflow >= 0 ? '+' : '−'}{formatVND(Math.abs(d.net_cashflow))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
