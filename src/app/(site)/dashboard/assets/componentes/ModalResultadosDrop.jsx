'use client'

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Divider,
  Box,
  Stack,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function ModalResultadosDrop({ open, onClose, found = [], notFound = [] }) {
  const foundCount = Array.isArray(found) ? found.length : 0
  const notFoundCount = Array.isArray(notFound) ? notFound.length : 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>Resultados de búsqueda por archivos</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip size="small" color="success" label={`Encontrados: ${foundCount}`} />
            <Chip size="small" color={notFoundCount ? 'error' : 'default'} label={`No encontrados: ${notFoundCount}`} />
          </Stack>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary">
          Se comparó contra <b>archiveName</b>. Si un archivo no aparece, verifica nombre/extensión o que el asset exista.
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Encontrados</Typography>
            <Stack spacing={0.75}>
              {foundCount ? found.map((f, i) => (
                <Box key={`${f?.name || 'found'}-${i}`} sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{f?.name}</Typography>
                  {f?.match && <Typography variant="caption" color="text.secondary">match: {f.match}</Typography>}
                </Box>
              )) : (
                <Typography variant="body2" color="text.secondary">-</Typography>
              )}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>No encontrados</Typography>
            <Stack spacing={0.75}>
              {notFoundCount ? notFound.map((n, i) => (
                <Box key={`${n}-${i}`} sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(244, 67, 54, 0.08)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{n}</Typography>
                </Box>
              )) : (
                <Typography variant="body2" color="text.secondary">-</Typography>
              )}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
