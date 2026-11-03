/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the Arena/E2B live-preview host, and any host the platform proxies
  // through, to reach the dev server (otherwise the preview iframe is blocked).
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai', '*.vercel.app', 'localhost', '*.localhost'],
  // `node:sqlite` is a Node built-in used only in server code; keep it external.
  serverExternalPackages: [],
  images: {
    // Remote photography is streamed straight from its licensed host. No paid
    // image CDN / API key required; uploaded media is served by /api/media.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
  eslint: { dirs: ['app', 'components', 'lib', 'db', 'types', 'tests'] },
};

export default nextConfig;
