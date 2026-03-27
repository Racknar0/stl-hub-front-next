// ╔════════════════════════════════════════════════════════════════╗
// ║ ScpUploadDialog.jsx                                            ║
// ║ Dialog para subida pesada por SCP:                              ║
// ║  - Muestra los comandos WSL/rsync/SCP generados por el backend ║
// ║  - Barra de progreso de subida detectada en VPS                 ║
// ╚════════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Stack, Typography, LinearProgress, Alert
} from '@mui/material'

export default function ScpUploadDialog({
  open,
  onClose,
  scpIndexedFile,
  scpCommandData,
  scpCommandError,
  scpCommandLoading,
  scpUploadProbe,
  fetchBatchScpCommand,
  formatBytes,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { background: '#1d1e26', color: '#fff' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Comando para Subida Pesada (SCP)</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
          Arrastraste: <strong>{scpIndexedFile?.name || '—'}</strong>. El comando se genera desde backend sin bloqueo por PIN.
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', display: 'block', mb: 1.3 }}>
          Tamaño indexado: {formatBytes(scpIndexedFile?.size || 0)}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={fetchBatchScpCommand}
            disabled={scpCommandLoading}
            sx={{ minWidth: 170, textTransform: 'none', fontWeight: 700 }}
          >
            {scpCommandLoading ? 'Generando…' : 'Regenerar comandos'}
          </Button>
        </Stack>

        {scpCommandError ? (
          <Alert severity="error" sx={{ mb: 2 }}>{scpCommandError}</Alert>
        ) : null}

        {!scpCommandData?.commands ? null : (
          <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}>
            {scpCommandData.commands.rsyncWslFileCmd || scpCommandData.commands.rsyncWslFolderCmd ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#93c5fd' }}>Comando WSL rsync (recomendado para masivo):</div>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mt: 0.6 }}>
                  Ejecuta en Linux/WSL. Lee archivos en Windows desde /mnt/c/stl-hub/super-batch y reanuda cortes.
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.2, p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                    {scpCommandData.commands.rsyncWslFileCmd || scpCommandData.commands.rsyncWslFolderCmd}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.rsyncWslFileCmd || scpCommandData.commands.rsyncWslFolderCmd)}>Copiar</Button>
                </Stack>
              </>
            ) : null}

            {scpCommandData.commands.winscpKeepupCmd ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#ffd54f' }}>Comando recomendado (reanuda si se corta):</div>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mt: 0.6 }}>
                  Ideal para archivos muy grandes. Mantiene estado local y reintenta sin perder el avance completado.
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.8, p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                    {scpCommandData.commands.winscpKeepupCmd}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.winscpKeepupCmd)}>Copiar</Button>
                </Stack>
              </>
            ) : null}

            <div style={{ fontWeight: 700, fontSize: 15, color: '#69f0ae' }}>Comando SCP Directo:</div>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.5, p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                {scpCommandData.commands.singleFileCmd || scpCommandData.commands.folderContentCmd}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.singleFileCmd || scpCommandData.commands.folderContentCmd)}>Copiar</Button>
            </Stack>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mb: 1 }}>
              Crear carpeta remota (solo si hace falta):
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                {scpCommandData.commands.mkdirCmd}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.mkdirCmd)}>Copiar</Button>
            </Stack>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 1.25 }}>
              Ruta destino fija: {scpCommandData.commands.remoteBatchImportsDir}
            </Typography>
          </Box>
        )}

        {/* ── Progreso de subida VPS ── */}
        {scpIndexedFile?.name ? (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(56,189,248,0.35)' }}>
            <Typography variant="body2" sx={{ color: '#e0f2fe', fontWeight: 700, mb: 0.8 }}>
              Progreso de subida detectado en VPS
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, Number(scpUploadProbe.percent || 0)))}
              sx={{
                height: 12, borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.14)',
                '& .MuiLinearProgress-bar': {
                  background: scpUploadProbe.percent >= 100
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(224,242,254,0.92)', display: 'block', mt: 0.65 }}>
              {Math.max(0, Math.min(100, Number(scpUploadProbe.percent || 0))).toFixed(0)}% · {formatBytes(scpUploadProbe.sizeB)} / {formatBytes(scpIndexedFile?.size || 0)}
              {scpUploadProbe.speedMBs > 0 ? ` · ${scpUploadProbe.speedMBs.toFixed(2)} MB/s` : ''}
            </Typography>
            {!scpUploadProbe.exists ? (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)', display: 'block', mt: 0.4 }}>
                Esperando que inicie la transferencia SCP...
              </Typography>
            ) : null}
            {scpUploadProbe.done ? (
              <Typography variant="caption" sx={{ color: '#86efac', display: 'block', mt: 0.4, fontWeight: 700 }}>
                Archivo recibido completo en el VPS.
              </Typography>
            ) : null}
            {scpUploadProbe.error ? (
              <Typography variant="caption" sx={{ color: '#fecaca', display: 'block', mt: 0.4 }}>
                {scpUploadProbe.error}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
        <Button variant="contained" onClick={onClose}>¡Entendido!</Button>
      </DialogActions>
    </Dialog>
  )
}
