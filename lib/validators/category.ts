import { z } from 'zod'

export const CATEGORY_KINDS = ['income', 'expense'] as const

export const CATEGORY_KIND_LABEL: Record<string, string> = {
  income: 'Thu',
  expense: 'Chi',
}

export const categorySchema = z.object({
  kind: z.enum(CATEGORY_KINDS),
  name: z.string().trim().min(1, 'Tên danh mục không được trống'),
})

export type CategoryInput = z.infer<typeof categorySchema>
