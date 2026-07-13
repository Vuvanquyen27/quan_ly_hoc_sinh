import type { Metadata } from 'next'
import Link from 'next/link'
import { StudentForm } from '@/components/students/student-form'

export const metadata: Metadata = { title: 'Thêm học sinh — EduFlow' }

export default function ThemHocSinhPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/hoc-sinh" className="text-sm text-primary hover:underline">← Danh sách học sinh</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Thêm học sinh</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <StudentForm />
      </div>
    </div>
  )
}
