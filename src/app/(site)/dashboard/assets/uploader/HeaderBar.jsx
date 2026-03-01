import React from 'react'
import { Card, CardContent, Grid, FormControl, Box, Typography, Button, Stack, LinearProgress } from '@mui/material'

export default function HeaderBar({ selectedAcc, megaStatusNode, accStatus, usedPct, usedMB, totalMB, queueSummaryText, onOpenModal, onTest }) {
  const backups = Array.isArray(selectedAcc?.backups) ? selectedAcc.backups : []
  const firstBackup = backups[0]
  const backupLabel = firstBackup?.alias
    ? (backups.length > 1 ? `${firstBackup.alias} (+${backups.length - 1})` : firstBackup.alias)
    : null

  return (
    <Card className="glass mb-3" sx={{ maxWidth: 1600, ms: 'auto' }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <Box sx={{ p: 0, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cuenta MEGA</Typography>
                  <Typography variant="body2">{selectedAcc ? selectedAcc.alias : 'Ninguna seleccionada'}</Typography>
                  {selectedAcc && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.25, fontSize: '0.72rem', opacity: 0.85 }}
                    >
                      backup: {backupLabel || '—'}
                    </Typography>
                  )}
                </Box>
                <Button sx={{ marginLeft: '10px' }} variant="contained" onClick={onOpenModal}>
                  Cuenta
                </Button>
              </Box>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              {megaStatusNode}
              <Button variant="outlined" onClick={onTest} disabled={!selectedAcc || accStatus === 'connecting'}>
                Conectar
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="caption">Espacio usado / disponible</Typography>
                <LinearProgress variant="determinate" value={usedPct} sx={{ mt: 0.5 }} />
                <Typography variant="caption">{usedMB} MB / {totalMB} MB</Typography>
              </Box>
              {queueSummaryText ? (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      opacity: 0.85,
                      whiteSpace: 'nowrap',
                      fontWeight: 800,
                      color: 'text.secondary',
                    }}
                  >
                    {queueSummaryText}
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
