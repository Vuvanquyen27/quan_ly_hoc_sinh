import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập tên (ít nhất 2 ký tự)'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự'),
})

export const resetSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
