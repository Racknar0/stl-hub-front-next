// ╔════════════════════════════════════════════════════════════╗
// ║ BatchControlPanel.jsx                                      ║
// ║ Panel superior de acciones: SCP dropzone, Escanear,         ║
// ║ IA Metadatos, Distribuir, Selector de cuentas,              ║
// ║ Rotar Proxy, Detener Todo, Modo Revisión,                   ║
// ║ Eliminar Completados, Eliminar Todo                         ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import {
  Button, Stack, Box, Typography, FormControl, InputLabel,
  Select, MenuItem, Checkbox, ListItemText, Switch, FormControlLabel,
  Divider, Tooltip
} from '@mui/material'

import { confirmAlert } from '@/helpers/alerts'

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import ReplayIcon from '@mui/icons-material/Replay'
import SearchIcon from '@mui/icons-material/Search'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function BatchControlPanel({
  // ─── SCP Dropzone ───
  scpPickerRef,
  scpDropActive,
  scpIndexedFile,
  formatBytes,
  handleScpPick,
  handleScpDrop,
  setScpDropActive,
  // ─── Acciones principales ───
  isScanning,
  isApplyingAiMetadata,
  isRetryingAi,
  isProcessing,
  isStoppingAll,
  aiRetryCandidateIds,
  handleScanLocal,
  handleApplyAiMetadata,
  handleRetryFailedAi,
  handleAutoDistribute,
  distributionAccountIdsRef,
  // ─── Distribución de cuentas ───
  distributionAccountIds,
  handleDistributionAccountsChange,
  handleDistributionSelectorClose,
  handleDistributionSelectorOpen,
  accountSelectionMeta,
  minPendingAssetMb,
  cuentas,
  // ─── Rotar proxy ───
  activeUploadingRow,
  handleRotateProxyGlobal,
  // ─── Detener todo ───
  rows,
  handleStopAndResetToDraft,
  // ─── Modo revisión ───
  reviewMode,
  setReviewMode,
  // ─── Eliminar completados / todo ───
  http,
  setToast,
  setRows,
  fetchQueue,
  // ─── Estilos compartidos ───
  compactActionBtnSx,
}) {
  return (
    <Box sx={{ mb: 3, p: 2, borderRadius: 3, border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(10px)' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
        
        {/* ─── BLOQUE 1: INPUT Y DROPZONE ─── */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1, minWidth: { xs: '100%', lg: 'auto' } }}>
          <input ref={scpPickerRef} type="file" style={{ display: 'none' }} onChange={handleScpPick} />
          <Box
            onClick={() => scpPickerRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(true) }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(false) }}
            onDrop={handleScpDrop}
            sx={{
              flexGrow: 1,
              maxWidth: 380,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderRadius: 2,
              px: 2,
              py: 1,
              border: '2px dashed',
              borderColor: scpDropActive ? '#38bdf8' : 'rgba(148,163,184,0.4)',
              background: scpDropActive ? 'rgba(56,189,248,0.12)' : 'rgba(30,41,59,0.5)',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#38bdf8', background: 'rgba(56,189,248,0.05)' }
            }}
          >
            <CloudUploadIcon sx={{ color: scpDropActive ? '#38bdf8' : '#94a3b8', fontSize: 32 }} />
            <Box>
              <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600, lineHeight: 1.2 }}>
                Arrastra aquí el archivo pesado
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.2 }}>
                {scpIndexedFile?.name ? `${scpIndexedFile.name} · ${formatBytes(scpIndexedFile.size)}` : 'Click para examinar'}
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Buscar nuevas carpetas en uploads/batch_imports y agregarlas a la cola">
            <Button
              variant="contained"
              onClick={async () => {
                if (await confirmAlert('¿Escanear carpetas?', '¿Estás seguro de escanear las carpetas locales en busca de nuevos assets?')) {
                  handleScanLocal()
                }
              }}
              disabled={isScanning || isApplyingAiMetadata || isRetryingAi}
              startIcon={<SearchIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)',
                '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }
              }}
            >
              {isScanning ? 'Escaneando...' : 'Escanear'}
            </Button>
          </Tooltip>
        </Stack>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' }, borderColor: 'rgba(148,163,184,0.2)' }} />

        {/* ─── BLOQUE 2: IA Y DISTRIBUCION ─── */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Tooltip title="Generar Metadatos con IA">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoFixHighIcon />}
              onClick={async () => {
                if (await confirmAlert('¿Generar Metadatos?', '¿Generar metadatos con IA para los items listos?')) {
                  handleApplyAiMetadata()
                }
              }}
              disabled={isApplyingAiMetadata || isScanning || isRetryingAi}
              sx={{
                ...compactActionBtnSx, borderColor: '#2dd4bf', color: '#2dd4bf',
                '&:hover': { borderColor: '#5eead4', background: 'rgba(45,212,191,0.1)' }
              }}
            >
              Metadatos
            </Button>
          </Tooltip>

          {aiRetryCandidateIds?.length > 0 && (
            <Tooltip title={`Reintentar ${aiRetryCandidateIds.length} fallidos`}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={handleRetryFailedAi}
                disabled={isRetryingAi || isScanning || isApplyingAiMetadata}
                sx={{ ...compactActionBtnSx, borderColor: '#fbbf24', color: '#fbbf24' }}
              >
                Reintentar
              </Button>
            </Tooltip>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(30,41,59,0.6)', p: 0.5, pr: 1.5, borderRadius: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200, maxWidth: 280 }}>
              <InputLabel id="batch-dist-label" sx={{ color: '#94a3b8', fontSize: 13, mt: -0.5 }}>Cuentas destino</InputLabel>
              <Select
                labelId="batch-dist-label"
                multiple
                value={distributionAccountIds || []}
                onChange={handleDistributionAccountsChange}
                onOpen={handleDistributionSelectorOpen}
                onClose={handleDistributionSelectorClose}
                label="Cuentas destino"
                renderValue={(selected) => {
                  const ids = Array.isArray(selected) ? selected.map(Number) : []
                  if (!ids.length) return <Typography variant="caption">Todas las disponibles</Typography>
                  return <Typography variant="caption" noWrap>{ids.length} cuentas</Typography>
                }}
                sx={{
                  height: 34,
                  color: '#f8fafc',
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  bgcolor: 'rgba(15,23,42,0.6)'
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#0f172a',
                      border: '1px solid rgba(71,85,105,0.55)',
                    },
                  },
                }}
              >
                {accountSelectionMeta?.selectable?.map((c) => {
                  const checked = (distributionAccountIds || []).includes(Number(c.id))
                  return (
                    <MenuItem key={c.id} value={c.id} sx={{ color: '#e2e8f0', '&:hover': { bgcolor: '#1e293b' } }}>
                      <Checkbox checked={checked} size="small" sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }} />
                      <ListItemText 
                        primary={c.alias} 
                        secondary={`${(Math.max(0, Number(c.freeMb || 0)) / 1024).toFixed(2)} GB`}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: checked ? 700 : 500 }}
                        secondaryTypographyProps={{ fontSize: 11, color: '#94a3b8' }}
                      />
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
            <Tooltip title="Asignar automáticamente el peso de los archivos a las cuentas con espacio libre">
              <Button
                variant="contained"
                size="small"
                startIcon={<AutoAwesomeIcon />}
                onClick={async () => {
                  if (await confirmAlert('¿Distribuir automáticamente?', '¿Distribuir los assets automáticamente entre las cuentas destino seleccionadas?')) {
                    handleAutoDistribute({ preferredAccountIds: distributionAccountIdsRef?.current })
                  }
                }}
                sx={{
                  borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 30, px: 2,
                  background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                  '&:hover': { background: 'linear-gradient(135deg, #9333ea, #6b21a8)' }
                }}
              >
                Distribuir
              </Button>
            </Tooltip>
          </Box>
        </Stack>
      </Stack>

      <Divider sx={{ my: 2, borderColor: 'rgba(148,163,184,0.15)' }} />

      {/* ─── BLOQUE 3: CONTROLES SECUNDARIOS Y PELIGRO ─── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={<Switch checked={reviewMode} onChange={(e) => setReviewMode(Boolean(e?.target?.checked))} color="info" size="small" />}
            label={<Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600 }}>Modo Revisión</Typography>}
            sx={{ m: 0, px: 1.5, py: 0.5, borderRadius: 2, border: '1px solid rgba(56,189,248,0.3)', bgcolor: 'rgba(14,116,144,0.1)' }}
          />

          <Tooltip title="Rotar Proxy de la fila en subida">
            <span>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={async () => {
                  if (await confirmAlert('¿Rotar Proxy?', '¿Forzar la rotación del proxy ahora mismo?')) {
                    handleRotateProxyGlobal()
                  }
                }}
                disabled={!activeUploadingRow}
                startIcon={<SyncAltIcon />}
                sx={{ ...compactActionBtnSx, minHeight: 32 }}
              >
                Rotar Proxy
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Detener proceso activo y pasar todo a borrador">
            <span>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<StopCircleIcon />}
                onClick={async () => {
                  if (await confirmAlert('¿Detener Todo?', '¿Estás seguro de detener el proceso activo y regresar todo a borrador?')) {
                    handleStopAndResetToDraft()
                  }
                }}
                disabled={isStoppingAll || (rows || []).every((r) => String(r?.estado || '').toLowerCase() === 'borrador')}
                sx={{ ...compactActionBtnSx, minHeight: 32 }}
              >
                Detener Todo
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Limpiar todos los items que ya se subieron correctamente">
            <Button
              variant="text"
              size="small"
              onClick={async () => {
                if (!(await confirmAlert('¿Limpiar Completados?', '¿Eliminar todos los items COMPLETADOS del batch?'))) return
                try {
                  const res = await http.deleteRaw('/batch-imports/completed')
                  if (res.data?.success) {
                    setToast({ open: true, msg: res.data.message || 'Completados eliminados', type: 'success' })
                    fetchQueue()
                  } else {
                    setToast({ open: true, msg: 'Error al eliminar', type: 'error' })
                  }
                } catch (e) {
                  setToast({ open: true, msg: 'Error de red', type: 'error' })
                }
              }}
              startIcon={<DeleteSweepIcon />}
              sx={{ color: '#94a3b8', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(148,163,184,0.1)' }, ...compactActionBtnSx, minHeight: 32 }}
            >
              Limpiar Completados
            </Button>
          </Tooltip>

          <Tooltip title="Peligro: Elimina TODO el historial y carpetas del batch actual">
            <Button
              variant="outlined"
              size="small"
              onClick={async () => {
                if (!(await confirmAlert('¿Purgar Todo?', '¿Estás seguro? Esto eliminará TODOS los items del batch, las carpetas y los registros de la BD.', 'Purgar', 'Cancelar', 'warning'))) return
                try {
                  const res = await http.deleteRaw('/batch-imports/purge-all')
                  if (res.data?.success) {
                    setRows([])
                    setToast({ open: true, msg: res.data.message, type: 'success' })
                  } else {
                    setToast({ open: true, msg: 'Error al purgar', type: 'error' })
                  }
                } catch (e) {
                  setToast({ open: true, msg: 'Error de red', type: 'error' })
                }
              }}
              startIcon={<DeleteForeverIcon />}
              sx={{
                ...compactActionBtnSx,
                minHeight: 32,
                borderColor: 'rgba(239,68,68,0.5)',
                color: '#fca5a5',
                '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)', color: '#fee2e2' }
              }}
            >
              Purgar Todo
            </Button>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  )
}
