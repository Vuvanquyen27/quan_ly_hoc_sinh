'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { saveStudent, type StudentActionState } from '@/server/students/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/server/students/queries'
import { STUDENT_STATUSES, FEE_TYPES, STATUS_LABEL, FEE_TYPE_LABEL } from '@/lib/validators/student'

function Field({
  label, name, children,
}: { label: string; name?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

export function StudentForm({ student }: { student?: Student }) {
  const [state, action, pending] = useActionState<StudentActionState, FormData>(saveStudent, null)

  return (
    <form action={action} className="space-y-5">
      {student && <input type="hidden" name="id" value={student.id} />}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Họ và tên *" name="fullName">
            <Input id="fullName" name="fullName" required defaultValue={student?.full_name ?? ''} placeholder="Nguyễn Văn A" />
          </Field>
        </div>

        <Field label="Lớp / khối" name="gradeLevel">
          <Input id="gradeLevel" name="gradeLevel" defaultValue={student?.grade_level ?? ''} placeholder="Lớp 9" />
        </Field>
        <Field label="Môn học (phẩy để ngăn cách)" name="subjects">
          <Input id="subjects" name="subjects" defaultValue={student?.subjects?.join(', ') ?? ''} placeholder="Toán, Lý" />
        </Field>

        <Field label="Ngày sinh" name="dateOfBirth">
          <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={student?.date_of_birth ?? ''} />
        </Field>
        <Field label="Giới tính" name="gender">
          <select id="gender" name="gender" defaultValue={student?.gender ?? ''} className={selectClass}>
            <option value="">—</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </Field>

        <Field label="SĐT học sinh" name="phone">
          <Input id="phone" name="phone" defaultValue={student?.phone ?? ''} />
        </Field>
        <Field label="Email" name="email">
          <Input id="email" name="email" type="email" defaultValue={student?.email ?? ''} />
        </Field>

        <Field label="Tên phụ huynh" name="parentName">
          <Input id="parentName" name="parentName" defaultValue={student?.parent_name ?? ''} />
        </Field>
        <Field label="SĐT phụ huynh" name="parentPhone">
          <Input id="parentPhone" name="parentPhone" defaultValue={student?.parent_phone ?? ''} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Địa chỉ" name="address">
            <Input id="address" name="address" defaultValue={student?.address ?? ''} />
          </Field>
        </div>

        <Field label="Học phí mặc định (VND)" name="defaultFee">
          <Input id="defaultFee" name="defaultFee" type="number" min={0} step={1000} defaultValue={student?.default_fee ?? 0} />
        </Field>
        <Field label="Cách tính phí" name="feeType">
          <select id="feeType" name="feeType" defaultValue={student?.fee_type ?? 'per_session'} className={selectClass}>
            {FEE_TYPES.map((f) => <option key={f} value={f}>{FEE_TYPE_LABEL[f]}</option>)}
          </select>
        </Field>

        <Field label="Trạng thái" name="status">
          <select id="status" name="status" defaultValue={student?.status ?? 'active'} className={selectClass}>
            {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Ghi chú" name="notes">
            <textarea id="notes" name="notes" rows={3} defaultValue={student?.notes ?? ''}
              className={selectClass + ' h-auto py-2'} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="success" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Đang lưu…' : student ? 'Lưu thay đổi' : 'Thêm học sinh'}
        </Button>
        <Link href="/hoc-sinh" className="text-sm text-muted-foreground hover:underline">Hủy</Link>
      </div>
    </form>
  )
}
