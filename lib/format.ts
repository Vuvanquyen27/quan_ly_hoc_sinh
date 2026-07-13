const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? new Date(value) : value
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount).replace(/\u00a0/g, ' ')
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
  }).format(toDate(value))
}

export function formatDateTime(value: Date | string): string {
  const date = toDate(value)
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  }).format(date)

  return `${formatDate(date)} ${time}`
}
