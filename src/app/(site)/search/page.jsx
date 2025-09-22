'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import SearchClient from './searchClient';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  return <SearchClient initialParams={params} />;
}
