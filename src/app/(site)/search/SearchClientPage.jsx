'use client';
import { useSearchParams } from 'next/navigation';
import SearchClient from './searchClient';

export default function SearchClientPage() {
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  return <SearchClient initialParams={params} />;
}