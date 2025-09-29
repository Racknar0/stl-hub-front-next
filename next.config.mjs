/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3001', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.stl-hub.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'stl-hub.com', pathname: '/uploads/**' },
    ],
  },

  // 👉 Permite servir tu mismo árbol de páginas bajo /en sin mover carpetas
  async rewrites() {
    return [
      { source: '/en', destination: '/' },
      { source: '/en/:path*', destination: '/:path*' },
    ];
  },
};

export default nextConfig;