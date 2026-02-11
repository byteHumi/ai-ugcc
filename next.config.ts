import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@google-cloud/storage', 'ffmpeg-static', 'ffprobe-static'],
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/ffmpeg-static/**', './node_modules/ffprobe-static/**'],
  },
};

export default nextConfig;
