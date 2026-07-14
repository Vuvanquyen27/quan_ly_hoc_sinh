import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DocumentForm from '@/components/documents/document-form'
import { getDocument } from '@/server/documents/queries'
import { deleteDocumentAction } from '@/server/documents/actions'
import { listLessons } from '@/server/lessons/queries'
import { listStudents } from '@/server/students/queries'

export const metadata: Metadata = { title: 'Sửa tài liệu — EduFlow' }

export default async function SuaTaiLieuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const doc = await getDocument(id)
  if (!doc) notFound()

  const [lessons, students] = await Promise.all([
    listLessons({ page: 1 }),
    listStudents({ page: 1 }),
  ])
  const lessonOptions = lessons.rows.map((l) => ({ id: l.id, label: l.title }))
  const studentOptions = students.rows.map((s) => ({ id: s.id, label: s.full_name }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Sửa tài liệu</h1>
      <DocumentForm doc={doc} lessons={lessonOptions} students={studentOptions} />

      <form action={deleteDocumentAction}>
        <input type="hidden" name="id" value={doc.id} />
        <button type="submit" className="text-sm text-destructive hover:underline">
          Xóa tài liệu
        </button>
      </form>
    </div>
  )
}
