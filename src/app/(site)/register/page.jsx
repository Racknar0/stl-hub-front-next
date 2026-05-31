import React from 'react';
import Register from './Register';
import './register.scss';
import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/register', 'Registro | STL HUB');

export default function Page() {
  return <Register />;
}
