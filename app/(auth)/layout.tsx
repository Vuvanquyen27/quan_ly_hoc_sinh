import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-4 py-10 text-[#1f2933]">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 block text-center font-mono text-sm font-semibold tracking-[0.28em] text-[#315c48]"
        >
          EDUFLOW
        </Link>
        <div className="rounded-2xl border border-[#d8cbb4] bg-white p-6 shadow-[0_20px_60px_rgba(74,59,36,0.12)] sm:p-8">
          {children}
        </div>
      </div>
    </main>
  )
}
