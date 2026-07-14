/**
 * Khung chờ (skeleton) hiển thị tức thì khi chuyển trang — thay cho màn hình
 * đứng im trong lúc Server Component await query Supabase.
 * Chỉ dùng semantic token (bg-secondary / bg-card), không màu cứng.
 */

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-secondary ${className}`} />
}

/** Tiêu đề + phụ đề của trang. */
function HeaderSkeleton({ withCta = false }: { withCta?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-2">
        <Bar className="h-7 w-40" />
        <Bar className="h-4 w-24" />
      </div>
      {withCta ? <Bar className="h-9 w-32" /> : null}
    </div>
  )
}

/** Vài dòng danh sách giả (card mobile / hàng bảng). */
function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-card" />
      ))}
    </div>
  )
}

/** Skeleton cho các trang danh sách: hoc-sinh, bai-hoc, tai-lieu. */
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <HeaderSkeleton withCta />
      <RowsSkeleton rows={rows} />
    </div>
  )
}

/**
 * Fallback cho <Suspense> khi chỉ phần KẾT QUẢ chảy vào (shell header/form đã
 * hiện sẵn). Dùng trong các trang danh sách đã tách streaming.
 */
export function ListResultsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Đang tải danh sách">
      <Bar className="h-4 w-24" />
      <div className="pt-2">
        <RowsSkeleton rows={rows} />
      </div>
    </div>
  )
}

/** Skeleton cho trang tổng quan (dashboard 3 thẻ). */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    </div>
  )
}

/** Skeleton cho trang lịch dạy (header + khối lịch lớn). */
export function CalendarSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <HeaderSkeleton withCta />
      <div className="h-[60vh] animate-pulse rounded-lg bg-card" />
    </div>
  )
}
