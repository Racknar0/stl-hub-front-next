import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, Grid, Card, CardContent, Stack, Typography, Box, IconButton, LinearProgress, Button } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import StatusChip from './StatusChip'

export default function SelectMegaAccountModal({ open, onClose, accounts = [], freeQuotaMB = 20480, onSelectAccount }) {
  const [expandedAccId, setExpandedAccId] = useState(null)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Seleccionar cuenta MEGA</DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
          <Grid container spacing={2}>
            {(accounts || []).map((acc) => (
              <Grid item xs={12} md={4} key={acc.id}>
                <Card
                  className="glass"
                  sx={{
                    cursor: 'pointer',
                    border: '2px solid rgba(255,255,255,0.28)',
                    borderRadius: 2,
                    position: 'relative',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.05s ease',
                    ...( (() => { 
                      const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : freeQuotaMB; 
                      const used = Math.max(0, acc.storageUsedMB || 0); 
                      const pct = total ? (used / total) * 100 : 0; 
                      return pct >= 80 ? { backgroundColor: 'rgba(244,67,54,0.08)', borderColor: 'rgba(244,67,54,0.4)' } : {}; 
                    })() ),
                    '&:hover': {
                      ...( (() => { 
                        const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : freeQuotaMB; 
                        const used = Math.max(0, acc.storageUsedMB || 0); 
                        const pct = total ? (used / total) * 100 : 0; 
                        return pct >= 80 
                          ? { borderColor: 'rgba(244,67,54,0.7)', boxShadow: '0 0 0 3px rgba(244,67,54,0.25)' } 
                          : { borderColor: '#7C4DFF', boxShadow: '0 0 0 3px rgba(124,77,255,0.25)' };
                      })() )
                    },
                    '&:active': { transform: 'scale(0.997)' }
                  }}
                >
                  {(() => { const dt = acc.lastCheckAt && new Date(acc.lastCheckAt); const now = new Date(); return dt && !isNaN(dt) && dt.getFullYear()===now.getFullYear() && dt.getMonth()===now.getMonth() && dt.getDate()===now.getDate(); })() && (
                    <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, bgcolor: 'success.main', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, zIndex: 1 }} />
                  )}
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{acc.alias}</Typography>
                        <StatusChip status={acc.status} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{acc.email}</Typography>
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={(() => {
                            const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : freeQuotaMB
                            const used = Math.max(0, acc.storageUsedMB || 0)
                            return Math.min(100, (used / total) * 100)
                          })()}
                          sx={{
                            my: 0.5,
                            ...( (() => {
                              const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : freeQuotaMB;
                              const used = Math.max(0, acc.storageUsedMB || 0);
                              const pct = total ? (used / total) * 100 : 0;
                              return pct >= 80
                                ? {
                                    backgroundColor: 'rgba(244,67,54,0.2)',
                                    '& .MuiLinearProgress-bar': { backgroundColor: 'error.main' },
                                  }
                                : {};
                            })() ),
                          }}
                        />
                        <Typography variant="caption">
                          {(() => {
                            const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : freeQuotaMB;
                            const used = Math.max(0, acc.storageUsedMB || 0);
                            const pct = Math.min(100, total ? (used / total) * 100 : 0);
                            return `${used} MB / ${total} MB (${Math.round(pct)}%)`;
                          })()}
                        </Typography>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            Backups:
                            {Array.isArray(acc.backups) && acc.backups.length === 0 && (
                              <span style={{ color: '#ef5350' }}>Sin backup</span>
                            )}
                            {Array.isArray(acc.backups) && acc.backups.length > 0 && (
                              <span style={{ opacity: .8 }}>({acc.backups.length})</span>
                            )}
                          </Typography>
                          <IconButton
                            size="small"
                            disabled={!Array.isArray(acc.backups) || acc.backups.length === 0}
                            onClick={() => setExpandedAccId(prev => prev === acc.id ? null : acc.id)}
                            sx={{
                              transform: expandedAccId === acc.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform .15s ease',
                            }}
                            aria-label="Toggle backups"
                          >
                            <ExpandMoreIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        {expandedAccId === acc.id && Array.isArray(acc.backups) && acc.backups.length > 0 && (
                          <Box sx={{ mt: 1, pl: 0.5 }}>
                            <Stack spacing={0.5}>
                              {acc.backups.map((b) => (
                                <Stack key={b.id} direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="caption" sx={{ fontWeight: 500 }}>{b.alias}</Typography>
                                  <StatusChip status={b.status} />
                                </Stack>
                              ))}
                            </Stack>
                          </Box>
                        )}
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
                        <Grid item xs={12}>
                          <Typography variant="caption">Última verificación</Typography>
                          <Typography variant="body2">{acc.lastCheckAt ? new Date(acc.lastCheckAt).toLocaleString() : '-'}</Typography>
                        </Grid>
                      </Grid>
                      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                        <Button
                          variant="contained"
                          onClick={() => {
                            const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : freeQuotaMB;
                            const used = Math.max(0, acc.storageUsedMB || 0);
                            const pct = Math.min(100, total ? (used / total) * 100 : 0);
                            const hasBackup = Array.isArray(acc.backups) && acc.backups.length > 0;
                            if (!hasBackup) {
                              window.alert('Esta cuenta no tiene backup asignado. No puede seleccionarse.');
                              return;
                            }
                            onSelectAccount?.(acc, pct)
                          }}
                        >
                          Seleccionar
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {(accounts || []).length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ opacity: .8, p:1 }}>No hay cuentas main disponibles</Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
