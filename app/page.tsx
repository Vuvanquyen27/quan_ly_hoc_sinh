import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-border pb-5">
          <Link className="font-mono text-sm font-semibold tracking-[0.28em] text-primary" href="/">
            EDUFLOW
          </Link>
          <Link
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href="/dang-nhap"
          >
            Đăng nhập
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-secondary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
              Sổ dạy học · lịch · học phí
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl sm:leading-[1.02] sm:tracking-[-0.05em] lg:text-7xl">
              Một bàn làm việc gọn cho giáo viên cá nhân.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              EduFlow gom hồ sơ học sinh, buổi học, điểm danh và công nợ vào
              một nơi. Mục tiêu MVP: không bỏ sót lịch, không thất thoát học phí,
              dữ liệu từng giáo viên được cách ly bằng RLS.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="w-full rounded-full bg-success px-6 py-3 text-center text-sm font-semibold text-success-foreground shadow-sm transition hover:bg-[color-mix(in_oklch,var(--success),black_8%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
                href="/dang-ky"
              >
                Bắt đầu dùng thử
              </Link>
              <Link
                className="w-full rounded-full border border-border px-6 py-3 text-center text-sm font-semibold text-primary transition hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
                href="/tong-quan"
              >
                Xem không gian làm việc
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="overflow-hidden rounded-[1.4rem] border border-border bg-card">
              <div className="grid grid-cols-7 border-b border-border text-center font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                  <div className="border-r border-border py-3 last:border-r-0" key={day}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-4">
                {Array.from({ length: 28 }).map((_, index) => (
                  <div
                    className="min-h-14 border-r border-t border-border p-1.5 last:border-r-0 sm:min-h-20 sm:p-2"
                    key={index}
                  >
                    {index === 8 ? (
                      <div className="rounded-lg bg-primary p-1.5 text-[0.6rem] font-medium leading-4 text-primary-foreground sm:rounded-xl sm:p-3 sm:text-xs sm:leading-5">
                        19:30
                        <br />
                        Minh Anh
                      </div>
                    ) : null}
                    {index === 16 ? (
                      <div className="rounded-lg bg-warning p-1.5 text-[0.6rem] font-medium leading-4 text-warning-foreground sm:rounded-xl sm:p-3 sm:text-xs sm:leading-5">
                        Thu học phí
                        <br />
                        1.500.000 ₫
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ['12', 'học sinh đang học'],
                ['4', 'buổi tuần này'],
                ['3,2tr', 'công nợ cần thu'],
              ].map(([value, label]) => (
                <div className="rounded-2xl bg-muted p-4" key={label}>
                  <div className="text-2xl font-semibold text-foreground">{value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
