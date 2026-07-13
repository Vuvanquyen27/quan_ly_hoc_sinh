import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cố định workspace root về thư mục dự án (tránh Next chọn nhầm do lockfile lạc ở thư mục cha)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
