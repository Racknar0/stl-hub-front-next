import React from 'react';
import { Box } from '@mui/material';

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
export function countryName(code) {
  if (!code) return 'Sin dato';
  try { return regionNames.of(String(code).toUpperCase()) || String(code); }
  catch { return String(code); }
}

export function CountryLabel({ code }) {
  if (!code) return <span style={{ color: '#7b91aa' }}>Sin dato</span>;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    {/^[a-z]{2}$/i.test(code) && <img src={`https://flagcdn.com/${code.toLowerCase()}.svg`} alt="" width="16" height="12" style={{ objectFit: 'cover', borderRadius: 1 }} />}
    {countryName(code)}
  </span>;
}

export default function UserLocation({ ip, country }) {
  if (!ip && !country) return <span style={{ color: '#7b91aa' }}>—</span>;
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: .3, fontSize: 10, color: '#94a3b8' }}>
    <Box sx={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace' }}>{ip || 'Sin IP'}</Box>
    {country && <CountryLabel code={country} />}
  </Box>;
}
