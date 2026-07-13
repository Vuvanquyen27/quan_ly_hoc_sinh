import type { Metadata } from 'next'
import Link from 'next/link'
import { StudentForm } from '@/components/students/student-form'

export const metadata: Metadata = { title: 'Thêm học sinh — EduFlow' }

export default function ThemHocSinhPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/hoc-sinh" className="text-sm text-[#315c48] hover:underline">← Danh sách học sinh</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#18211d]">Thêm học sinh</h1>
      </div>
      <div className="rounded-2xl border border-[#d8cbb4] bg-white p-6 sm:p-8">
        <StudentForm />
      </div>
    </div>
  )
}
