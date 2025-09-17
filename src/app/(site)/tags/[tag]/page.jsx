import React from 'react';
import TagClient from './TagClient';

export default async function TagPage({ params }) {
  const { tag } = await params; // Next 15: params es async
  const tagValue = decodeURIComponent(tag || 'tag');
  return <TagClient tag={tagValue} />;
}
