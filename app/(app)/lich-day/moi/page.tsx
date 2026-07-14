import SessionForm from '@/components/sessions/session-form'
import { listStudents } from '@/server/students/queries'
import { listLessons } from '@/server/lessons/queries'

export const metadata = { title: 'Thêm buổi — EduFlow' }

export default async function ThemBuoiPage() {
  const [students, lessons] = await Promise.all([listStudents({ page: 1 }), listLessons({ page: 1 })])
  const studentOpts = students.rows.map((s) => ({ id: s.id, label: s.full_name, defaultFee: s.default_fee }))
  const lessonOpts = lessons.rows.map((l) => ({ id: l.id, label: l.title }))
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Thêm buổi học</h1>
      <SessionForm students={studentOpts} lessons={lessonOpts} />
    </div>
  )
}
