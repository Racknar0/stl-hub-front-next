import React from 'react';
import ForgotPassword from './ForgotPassword';
import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/forgot-password', 'Recuperar acceso | STL Gratis');

export default function Page() {
  return <ForgotPassword />;
}
