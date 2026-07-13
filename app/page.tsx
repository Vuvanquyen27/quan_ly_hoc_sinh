import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#1f2933]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-[#d8cbb4] pb-5">
          <Link className="font-mono text-sm font-semibold tracking-[0.28em] text-[#315c48]" href="/">
            EDUFLOW
          </Link>
          <Link
            className="rounded-full border border-[#315c48] px-4 py-2 text-sm font-medium text-[#315c48] transition hover:bg-[#315c48] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#315c48] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
            href="/dang-nhap"
          >
            Đăng nhập
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-[#eadfc8] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#6f4f1f]">
              Sổ dạy học · lịch · học phí
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#18211d] sm:text-6xl lg:text-7xl">
              Một bàn làm việc gọn cho giáo viên cá nhân.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#526057]">
              EduFlow gom hồ sơ học sinh, buổi học, điểm danh và công nợ vào
              một nơi. Mục tiêu MVP: không bỏ sót lịch, không thất thoát học phí,
              dữ liệu từng giáo viên được cách ly bằng RLS.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-full bg-[#315c48] px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_40px_rgba(49,92,72,0.25)] transition hover:bg-[#244637] focus:outline-none focus:ring-2 focus:ring-[#315c48] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
                href="/dang-ky"
              >
                Bắt đầu dùng thử
              </Link>
              <Link
                className="rounded-full border border-[#c4b89f] px-6 py-3 text-center text-sm font-semibold text-[#315c48] transition hover:border-[#315c48] focus:outline-none focus:ring-2 focus:ring-[#315c48] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
                href="/tong-quan"
              >
                Xem không gian làm việc
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d8cbb4] bg-[#fffaf0] p-5 shadow-[0_24px_80px_rgba(74,59,36,0.16)]">
            <div className="rounded-[1.4rem] border border-[#d8cbb4] bg-white">
              <div className="grid grid-cols-7 border-b border-[#eadfc8] text-center font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[#7a6d58]">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                  <div className="border-r border-[#eadfc8] py-3 last:border-r-0" key={day}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-4">
                {Array.from({ length: 28 }).map((_, index) => (
                  <div
                    className="min-h-20 border-r border-t border-[#f0e7d7] p-2 last:border-r-0"
                    key={index}
                  >
                    {index === 8 ? (
                      <div className="rounded-xl bg-[#315c48] p-3 text-xs font-medium leading-5 text-white">
                        19:30
                        <br />
                        Minh Anh
                      </div>
                    ) : null}
                    {index === 16 ? (
                      <div className="rounded-xl bg-[#d88b34] p-3 text-xs font-medium leading-5 text-white">
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
                <div className="rounded-2xl bg-[#f7f3ea] p-4" key={label}>
                  <div className="text-2xl font-semibold text-[#18211d]">{value}</div>
                  <div className="mt-1 text-sm text-[#6b746d]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
