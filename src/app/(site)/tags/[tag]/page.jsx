import { headers } from 'next/headers';
import { permanentRedirect } from 'next/navigation';

export default async function TagPage({ params }) {
  const { tag } = await params; // Next 15: params es async
  const tagValue = decodeURIComponent(tag || '').trim();

  let isEn = false;
  try {
    const h = await headers();
    isEn = h.get('x-lang') === 'en';
  } catch {}

  const basePath = isEn ? '/en/search' : '/search';
  if (!tagValue) {
    permanentRedirect(basePath);
  }

  permanentRedirect(`${basePath}?tags=${encodeURIComponent(tagValue)}`);
}
