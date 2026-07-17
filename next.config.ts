import type { NextConfig } from "next";

// Content-Security-Policy tối thiểu cho MVP.
// - Siết chặt các directive KHÔNG ảnh hưởng render: frame-ancestors/object-src/base-uri/form-action.
// - Nới `script/style 'unsafe-inline'` vì Next.js App Router cần inline script (hydration) + inline style.
//   TODO (sau MVP): nâng cấp CSP theo nonce qua proxy để bỏ 'unsafe-inline'/'unsafe-eval'.
// - `connect-src` mở cho Supabase REST (https) + Realtime (wss); `img-src https:` cho avatar Storage công khai.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
].join("; ");

// Header bảo mật tĩnh, áp cho mọi route. HSTS chỉ có tác dụng trên HTTPS (Vercel) — vô hại trên localhost.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Cố định workspace root về thư mục dự án (tránh Next chọn nhầm do lockfile lạc ở thư mục cha)
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
