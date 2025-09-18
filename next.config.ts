import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV !== 'production';
const usingTurbopack = process.env.NEXT_DISABLE_TURBOPACK !== '1';

const nextConfig: NextConfig = {
  experimental: usingTurbopack
    ? {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        allowedDevOrigins: ['*'],
      }
    : isDev && process.env.EXPERIMENTAL_ALLOWED_DEV_ORIGINS
    ? {
        allowedDevOrigins: [
          'http://localhost:9002',
          /https?:\/\/d+\-firebase-studio-[\w-]+\.[\w.-]+\.dev$/,
        ],
      }
    : {},
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
};

export default nextConfig;
