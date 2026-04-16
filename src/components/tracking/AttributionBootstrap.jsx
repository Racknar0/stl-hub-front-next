'use client';

import { useEffect } from 'react';
import { bootstrapAttributionFromUrl } from '../../helpers/attribution';

export default function AttributionBootstrap() {
  useEffect(() => {
    bootstrapAttributionFromUrl();
  }, []);

  return null;
}
