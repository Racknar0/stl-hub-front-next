import React from 'react';
import Account from '../account/Account';
import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/account', 'Mi cuenta | STL Gratis');

export default function Page() {
  return <Account />;
}
