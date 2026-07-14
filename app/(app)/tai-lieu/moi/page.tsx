import type { Metadata } from 'next'
import DocumentForm from '@/components/documents/document-form'
import { listLessons } from '@/server/lessons/queries'
import { listStudents } from '@/server/students/queries'

export const metadata: Metadata = { title: 'Thêm tài liệu — EduFlow' }

export default async function ThemTaiLieuPage({
  searchParams,
}: {
  searchParams: Promise<{ lessonId?: string; studentId?: string }>
}) {
  const sp = await searchParams
  const [lessons, students] = await Promise.all([
    listLessons({ page: 1 }),
    listStudents({ page: 1 }),
  ])
  const lessonOptions = lessons.rows.map((l) => ({ id: l.id, label: l.title }))
  const studentOptions = students.rows.map((s) => ({ id: s.id, label: s.full_name }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Thêm tài liệu</h1>
      <DocumentForm
        lessons={lessonOptions}
        students={studentOptions}
        defaultLessonId={sp.lessonId}
        defaultStudentId={sp.studentId}
      />
    </div>
  )
}
