import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStudent } from '@/server/students/queries'
import { StudentForm } from '@/components/students/student-form'

export const metadata: Metadata = { title: 'Sửa học sinh — EduFlow' }

export default async function SuaHocSinhPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const s = await getStudent(id)
  if (!s) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/hoc-sinh/${s.id}`} className="text-sm text-[#315c48] hover:underline">← Chi tiết học sinh</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#18211d]">Sửa: {s.full_name}</h1>
      </div>
      <div className="rounded-2xl border border-[#d8cbb4] bg-white p-6 sm:p-8">
        <StudentForm student={s} />
      </div>
    </div>
  )
}
