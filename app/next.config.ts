import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  experimental: {
    /** allow the Studio reverse-proxy origins to fetch /_next/* in dev */
    allowedDevOrigins: [
      // local
      'http://localhost:9002',
      // Cloud Workstations / Firebase Studio preview hosts like 9000-firebase-studio-....dev
      /https?:\/\/\d{4}-firebase-studio-[\w-]+\.[\w.-]+\.dev$/
    ]
  }
};

export default nextConfig;
