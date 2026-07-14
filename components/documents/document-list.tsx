'use client'

import Link from 'next/link'
import { getSignedUrlAction } from '@/server/documents/actions'
import type { DocumentRow } from '@/server/documents/queries'
import { TYPE_LABEL } from '@/lib/validators/document'

async function openFile(id: string) {
  const url = await getSignedUrlAction(id)
  if (url) window.open(url, '_blank', 'noopener')
}

function OpenCell({ d }: { d: DocumentRow }) {
  if (d.type === 'link' && d.url) {
    return (
      <a
        href={d.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        Mở liên kết
      </a>
    )
  }
  if (d.type === 'file' && d.storage_path) {
    return (
      <button
        onClick={() => openFile(d.id)}
        className="text-primary hover:underline"
      >
        Tải tệp
      </button>
    )
  }
  return <span className="text-muted-foreground">—</span>
}

export function DocumentList({ rows }: { rows: DocumentRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Chưa có tài liệu.</p>
        <Link
          href="/tai-lieu/moi"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Thêm tài liệu đầu tiên
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Bảng — hiển thị từ md trở lên */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Mở</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-muted">
                <td className="px-4 py-3 font-medium text-foreground">{d.title}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {TYPE_LABEL[d.type] ?? d.type}
                </td>
                <td className="px-4 py-3">
                  <OpenCell d={d} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/tai-lieu/${d.id}/sua`}
                    className="text-primary hover:underline"
                  >
                    Sửa
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card — hiển thị dưới md (điện thoại) */}
      <ul className="space-y-3 md:hidden">
        {rows.map((d) => (
          <li key={d.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium text-foreground">{d.title}</span>
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                {TYPE_LABEL[d.type] ?? d.type}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <OpenCell d={d} />
              <Link
                href={`/tai-lieu/${d.id}/sua`}
                className="text-primary hover:underline"
              >
                Sửa
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
