import React from 'react';
import Login from './Login';
import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/login', 'Acceso | STL HUB');

export default function Page() {
  return <Login />;
}
