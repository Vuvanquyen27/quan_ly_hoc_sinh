import { notFound } from 'next/navigation'
import SessionForm from '@/components/sessions/session-form'
import { getSession } from '@/server/sessions/queries'
import { listStudents } from '@/server/students/queries'
import { listLessons } from '@/server/lessons/queries'
import { changeSessionStatus } from '@/server/sessions/actions'

export const metadata = { title: 'Sửa buổi — EduFlow' }

export default async function SuaBuoiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(id)
  if (!session) notFound()

  const [students, lessons] = await Promise.all([listStudents({ page: 1 }), listLessons({ page: 1 })])
  const studentOpts = students.rows.map((s) => ({ id: s.id, label: s.full_name, defaultFee: s.default_fee }))
  const lessonOpts = lessons.rows.map((l) => ({ id: l.id, label: l.title }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Sửa buổi học</h1>
      <SessionForm session={session} students={studentOpts} lessons={lessonOpts} />

      {session.status === 'scheduled' && (
        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          <form action={changeSessionStatus}>
            <input type="hidden" name="id" value={session.id} />
            <input type="hidden" name="status" value="completed" />
            <button type="submit" className="text-sm text-primary hover:underline">Đánh dấu hoàn thành</button>
          </form>
          <form action={changeSessionStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={session.id} />
            <input type="hidden" name="status" value="cancelled" />
            <input name="cancelReason" placeholder="Lý do hủy" required
              className="rounded-md border border-border bg-card px-2 py-1 text-sm" />
            <button type="submit" className="text-sm text-destructive hover:underline">Hủy buổi</button>
          </form>
        </div>
      )}
    </div>
  )
}
