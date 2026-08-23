const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stlgratis.com').replace(/\/$/, '');

function normalizePath(path) {
  const value = String(path || '/').trim();
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

export function buildNoindexMetadata(canonicalPath, title = 'STL HUB') {
  const path = normalizePath(canonicalPath);

  return {
    title,
    alternates: {
      canonical: `${SITE_URL}${path}`,
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}
