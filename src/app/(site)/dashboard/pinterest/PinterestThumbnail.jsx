'use client';
import Image from 'next/image';

// Keep original images for editing and publishing. Calendar/list thumbnails use
// Next's cached resize instead of decoding hundreds of full-size pin images.
export default function PinterestThumbnail({ src, size = 64, alt = '', ...props }) {
  if (!src) return null;
  let optimize = src.startsWith('/') && !src.startsWith('//');
  try {
    const url = new URL(src);
    optimize = url.pathname.startsWith('/uploads/') && (
      (url.protocol === 'https:' && /^(?:(?:www\.)?api\.|www\.)?(?:stlgratis\.com|stl-hub\.com)$/.test(url.hostname)) ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '3001')
    );
  } catch { /* Relative paths are handled above. */ }
  if (!optimize) return <img {...props} src={src} alt={alt} width={size} height={size} loading="lazy" decoding="async" fetchPriority="low" />;
  return <Image {...props} src={src} alt={alt} width={size} height={size} sizes={`${size}px`} quality={65} loading="lazy" decoding="async" />;
}
