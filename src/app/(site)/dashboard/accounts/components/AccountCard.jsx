import React from 'react';
import { Card, CardContent, Stack, Typography, Box, LinearProgress, Grid, CircularProgress } from '@mui/material';
import AppButton from '@/components/layout/Buttons/Button';
import StatusChip from './StatusChip';

const FREE_QUOTA_MB = Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;

export default function AccountCard({ acc, onClick, isPending, onTest, loadingAny, testing }) {
  const isToday = (d) => {
    if (!d) return false;
    const dt = new Date(d);
    if (isNaN(dt)) return false;
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
  };
  return (
    <Card
      className="glass"
      onClick={()=>onClick(acc)}
      sx={{
        cursor:'pointer',
        position:'relative',
        border: acc.status === 'CONNECTED' ? '1px solid #2e7d32' : acc.status === 'ERROR' ? '1px solid #d32f2f' : '1px solid transparent',
        ...( (() => {
          const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB;
          const used = Math.max(0, acc.storageUsedMB || 0);
          const pct = total ? (used / total) * 100 : 0;
          return pct >= 80 
            ? { backgroundColor: 'rgb(255, 191, 186)', border: '2px solid rgba(244,67,54,0.4)' } 
            : {};
        })() )
      }}
    >
      {isToday(acc.lastCheckAt) && (
        <Box sx={{ position:'absolute', left:0, right:0, bottom:0, height:6, bgcolor:'success.main', borderBottomLeftRadius: 8, borderBottomRightRadius:8, zIndex:1 }} />
      )}
      {isPending && (
        <Box onClick={(e)=>e.stopPropagation()} sx={{ position:'absolute', inset:0, zIndex:2, bgcolor:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:2 }}>
          <CircularProgress size={36} sx={{ color:'#fff' }} />
        </Box>
      )}
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{acc.alias}</Typography>
            <StatusChip status={acc.status} />
          </Stack>
          <Typography variant="body2" color="text.secondary">{acc.email}</Typography>
          <Box>
            <Typography variant="caption">Uso de almacenamiento</Typography>
            <LinearProgress
              variant="determinate"
              value={(() => {
                const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB;
                const used = Math.max(0, acc.storageUsedMB || 0);
                return Math.min(100, (used / total) * 100);
              })()}
              sx={{
                my:0.5,
                ...( (() => {
                  const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB;
                  const used = Math.max(0, acc.storageUsedMB || 0);
                  const pct = total ? (used / total) * 100 : 0;
                  return pct >= 80
                    ? { backgroundColor: 'rgba(244,67,54,0.2)', '& .MuiLinearProgress-bar': { backgroundColor: 'error.main' } }
                    : {};
                })() )
              }}
            />
            <Typography variant="caption">
              {(() => {
                const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB;
                const used = Math.max(0, acc.storageUsedMB || 0);
                const pct = Math.min(100, total ? (used / total) * 100 : 0);
                return `${used} MB / ${total} MB (${Math.round(pct)}%)`;
              })()}
            </Typography>
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption">Archivos</Typography>
              <Typography variant="body2">{acc.fileCount ?? 0}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption">Carpetas</Typography>
              <Typography variant="body2">{acc.folderCount ?? 0}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption">Última verificación</Typography>
              <Typography variant="body2">{acc.lastCheckAt ? new Date(acc.lastCheckAt).toLocaleString() : '-'}</Typography>
            </Grid>
          </Grid>
          <Stack direction="row" justifyContent="flex-end">
            <AppButton
              variant="purple"
              size="140px"
              onClick={(e)=>{ e.stopPropagation(); onTest(acc.id); }}
              disabled={isPending || loadingAny || testing}
              styles={{ fontWeight:400 }}
            >
              Actualizar
            </AppButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
