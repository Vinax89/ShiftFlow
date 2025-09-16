import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // This is a workaround for a Next.js issue with Turbopack and Cloud Workstations.
    // In a future version, this may be replaced by a stable `allowedDevOrigins` option.
    allowedDevOrigins: [
      'https://6000-firebase-studio-*.cluster-*.cloudworkstations.dev',
    ],
  },
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
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
