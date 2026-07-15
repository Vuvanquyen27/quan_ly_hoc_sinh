export type CashflowMonth = {
  ym: string // 'YYYY-MM'
  total_income: number
  total_expense: number
  net_cashflow: number
}

/** 'YYYY-MM' của một Date theo giờ Asia/Ho_Chi_Minh. */
export function vnYearMonth(d: Date): string {
  const s = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d) // 'YYYY-MM-DD'
  return s.slice(0, 7)
}

/** Mảng n tháng liên tục ('YYYY-MM') kết thúc tại endYM (bao gồm). */
export function lastNMonths(n: number, endYM: string): string[] {
  const [ey, em] = endYM.split('-').map(Number)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    let y = ey
    let m = em - i
    while (m <= 0) {
      m += 12
      y -= 1
    }
    out.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return out
}

/** 'YYYY-MM' → 'MM/YY'. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${m}/${y.slice(2)}`
}
