import { createBrowserClient } from '@supabase/ssr'

/** Supabase client cho trình duyệt (Client Component) — dùng khóa anon, có RLS. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
