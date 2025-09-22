import { redirect } from 'next/navigation';

export default async function TagPage({ params }) {
  const { tag } = await params; // Next 15: params es async
  const tagValue = decodeURIComponent(tag || '');
  redirect(`/search?tags=${encodeURIComponent(tagValue)}`);
}
