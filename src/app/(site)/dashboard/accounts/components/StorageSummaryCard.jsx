import React, { useState } from 'react';
import { Box, ButtonBase, Collapse, LinearProgress, Typography } from '@mui/material';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { storageUsageColor } from '@/helpers/accountHealth';

const gb = mb => `${(mb / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} GB`;
const types = [['main', 'Main', '#7dd3fc'], ['backup', 'Backup', '#6ee7b7']];

export default function StorageSummaryCard({ totalStorage, groupLabel }) {
  const [expanded, setExpanded] = useState(false);
  if (!totalStorage) return null;
  return (
    <Box sx={{ mb: 1.5, bgcolor: '#101b2a', border: '1px solid rgba(148,163,184,.23)', borderRadius: 2, overflow: 'hidden' }}>
      <ButtonBase onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="account-storage-details"
        sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', textAlign: 'left', gap: 2, px: 1.5, py: 1.1, flexWrap: 'wrap', '&:focus-visible': { outline: '2px solid #38bdf8', outlineOffset: -2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#cbd5e1', fontSize: 13 }}>
          <StorageOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />Almacenamiento
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 3 }, alignItems: 'center', flexWrap: 'wrap' }}>
          {types.map(([type, label, color]) => {
            const data = totalStorage[type];
            return <Box component="span" key={type} sx={{ fontSize: 12, color: '#94a3b8' }}>
              <Box component="span" sx={{ color, fontWeight: 600, mr: 1 }}>{label}</Box>
              {data.okCount ? `${gb(data.used)} / ${gb(data.total)}` : 'Sin cuentas OK'}
            </Box>;
          })}
          <ExpandMoreIcon sx={{ fontSize: 20, color: '#94a3b8', transform: expanded ? 'rotate(180deg)' : undefined }} />
        </Box>
      </ButtonBase>
      <Collapse in={expanded} id="account-storage-details">
        <Box sx={{ borderTop: '1px solid rgba(148,163,184,.15)', p: 1.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {types.map(([type, label, color]) => {
              const data = totalStorage[type];
              return <Box key={type}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: .8 }}>
                  <Typography sx={{ fontSize: 12, color, fontWeight: 600 }}>{label} · {data.okCount} cuentas OK</Typography>
                  <Typography sx={{ fontSize: 12, color: storageUsageColor(data.pct) }}>{data.pct.toFixed(1)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(100, data.pct)} sx={{ height: 4, borderRadius: 1, bgcolor: 'rgba(148,163,184,.15)', '& .MuiLinearProgress-bar': { bgcolor: storageUsageColor(data.pct) } }} />
                <Typography sx={{ mt: .8, fontSize: 11, color: '#94a3b8' }}>
                  {gb(data.used)} usados · {gb(Math.max(0, data.total - data.used))} libres
                  {data.excludedCount > 0 && ` · ${data.excludedCount} cuentas sin conexión OK excluidas`}
                  {data.estimatedCount > 0 && ` · Cuota estimada en ${data.estimatedCount} cuentas`}
                </Typography>
              </Box>;
            })}
          </Box>
          <Typography sx={{ mt: 1.5, fontSize: 11, color: '#94a3b8' }}>
            {groupLabel ? `${groupLabel}. ` : ''}Solo cuentas CONNECTED del grupo seleccionado. Main y Backup se muestran por separado; las copias no representan contenido único adicional.
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
