/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3001', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.stl-hub.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'stl-hub.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'api.stl-hub.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.api.stl-hub.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'stlgratis.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.stlgratis.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'api.stlgratis.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.api.stlgratis.com', pathname: '/uploads/**' },
    ],
  },

  // 👉 Permite servir el árbol de páginas bajo /en (middleware gestiona x-lang para contenido EN)
  // Excluimos la ruta /en/asset/* para que Next.js pueda resolver físicamente la página en inglés.
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/api\/?$/, '').replace(/\/$/, '');
    return [
      { source: '/api/hero-banners/:path*', destination: `${apiBase}/api/hero-banners/:path*` },
      { source: '/uploads/hero-banners/:path*', destination: `${apiBase}/uploads/hero-banners/:path*` },
      { source: '/en/:path((?!asset(?:/|$)).*)', destination: '/:path*' },
    ];
  },
};

export default nextConfig;
