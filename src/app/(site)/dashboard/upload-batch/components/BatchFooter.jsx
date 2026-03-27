// ╔════════════════════════════════════════════════════════════╗
// ║ BatchFooter.jsx                                            ║
// ║ Pie de la tabla:                                            ║
// ║  - Total GB del batch                                       ║
// ║  - Botón "Confirmar y Subir al Worker"                      ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function BatchFooter({
  rows,
  isProcessing,
  isStoppingAll,
  handleProcessBatch,
}) {
  return (
    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
      <Typography variant="h6" sx={{ color: '#fff', textShadow: '0px 1px 3px rgba(0,0,0,0.5)' }}>
        <strong>Total Batch:</strong> {(rows.reduce((a, b) => a + (b.pesoMB || 0), 0) / 1024).toFixed(2)} GB
      </Typography>
      <Button
        variant="contained"
        size="large"
        startIcon={<CloudUploadIcon />}
        onClick={handleProcessBatch}
        disabled={isProcessing || isStoppingAll || rows.filter(r => r.estado === 'borrador' || r.estado === 'error').length === 0}
        sx={{
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 700,
          px: 4,
          py: 1.5,
          background: 'linear-gradient(45deg, #00C853 30%, #64DD17 90%)',
          color: '#fff',
          boxShadow: '0 3px 5px 2px rgba(0, 200, 83, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #00E676 30%, #76FF03 90%)',
          }
        }}
      >
        {isProcessing ? 'Enviando al Worker...' : 'Confirmar y Subir al Worker'}
      </Button>
    </Box>
  )
}
