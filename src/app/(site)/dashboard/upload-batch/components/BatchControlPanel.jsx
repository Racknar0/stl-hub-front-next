// ╔════════════════════════════════════════════════════════════╗
// ║ BatchControlPanel.jsx                                      ║
// ║ Panel superior de acciones: SCP dropzone, Escanear,         ║
// ║ Fila 1 (flujo): ① Origen, ② IA, ③ Cuentas                    ║
// ║ Fila 2: Vista, Subida y menú Limpieza (purgas)              ║
// ║                                                            ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import {
  Button, Stack, Box, Typography, FormControl,
  Select, MenuItem, Checkbox, ListItemText, Switch, FormControlLabel,
  Divider, Tooltip, Menu, ToggleButton, ToggleButtonGroup
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
import TelegramIcon from '@mui/icons-material/Telegram'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'

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
  handleClearAccounts,
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
  // ─── Agrupamiento semántico ───
  semanticSort,
  setSemanticSort,
  // ─── Telegram Source ───
  useTelegramSource,
  setUseTelegramSource,
  // ─── Eliminar completados / todo ───
  http,
  setToast,
  setRows,
  fetchQueue,
  // ─── Estilos compartidos ───
  compactActionBtnSx,
}) {
  const totalAvailableSpaceBytes = React.useMemo(() => {
    const list = Array.isArray(accountSelectionMeta?.selectable) ? accountSelectionMeta.selectable : []
    const totalMb = list.reduce((sum, c) => sum + Math.max(0, Number(c.usableFreeMb || 0)), 0)
    return totalMb * 1024 * 1024
  }, [accountSelectionMeta])

  const [cleanupAnchor, setCleanupAnchor] = React.useState(null)

  const handleCleanCompleted = async () => {
    setCleanupAnchor(null)
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
  }

  const handlePurgeAll = async () => {
    setCleanupAnchor(null)
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
  }

  const handlePurgeOrganized = async () => {
    setCleanupAnchor(null)
    if (!(await confirmAlert('¿Purgar Organized?', 'Esto eliminará TODOS los archivos y carpetas dentro de telegram_downloads_organized. Úsalo si quedaron residuos tras el batch.', 'Purgar', 'Cancelar', 'warning'))) return
    try {
      const res = await http.deleteRaw('/batch-imports/purge-organized')
      if (res.data?.success) {
        setToast({ open: true, msg: res.data.message, type: 'success' })
      } else {
        setToast({ open: true, msg: 'Error al purgar organized', type: 'error' })
      }
    } catch (e) {
      setToast({ open: true, msg: 'Error de red', type: 'error' })
    }
  }

  const sectionLabelSx = { color: '#64748b', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', mb: 0.75, display: 'block' }
  const sectionSx = { p: 1.25, borderRadius: 2, bgcolor: 'rgba(30,41,59,0.45)', border: '1px solid rgba(148,163,184,0.12)' }
  const accountsCount = accountSelectionMeta?.selectable?.length || 0

  return (
    <Box sx={{ mb: 3, p: 2, borderRadius: 3, border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(10px)' }}>
      <input ref={scpPickerRef} type="file" style={{ display: 'none' }} onChange={handleScpPick} />

      {/* ─── FILA 1: FLUJO (① Origen → ② IA → ③ Cuentas) ─── */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems="stretch">

        {/* ① ORIGEN */}
        <Box sx={{ ...sectionSx, flex: 1, minWidth: 0 }}>
          <Typography sx={sectionLabelSx}>① Origen</Typography>
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={useTelegramSource ? 'telegram' : 'scp'}
              onChange={(_, v) => { if (v) setUseTelegramSource(v === 'telegram') }}
              sx={{
                '& .MuiToggleButton-root': {
                  color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', textTransform: 'none', fontWeight: 700, fontSize: 12, px: 1.5, height: 34, gap: 0.5,
                },
                '& .MuiToggleButton-root.Mui-selected': { color: '#f8fafc', bgcolor: 'rgba(56,189,248,0.22)' },
                '& .MuiToggleButton-root.Mui-selected:hover': { bgcolor: 'rgba(56,189,248,0.3)' },
              }}
            >
              <ToggleButton value="scp"><CloudUploadIcon sx={{ fontSize: 16 }} />SCP</ToggleButton>
              <ToggleButton value="telegram"><TelegramIcon sx={{ fontSize: 16 }} />Telegram</ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Buscar nuevas carpetas y agregarlas a la cola">
              <span>
                <Button
                  variant="contained"
                  onClick={async () => {
                    const sourceLabel = useTelegramSource ? 'Telegram Organizer' : 'carpetas locales (SCP)'
                    if (await confirmAlert('¿Escanear carpetas?', `¿Estás seguro de escanear ${sourceLabel} en busca de nuevos assets?`)) {
                      handleScanLocal()
                    }
                  }}
                  disabled={isScanning || isApplyingAiMetadata || isRetryingAi}
                  startIcon={<SearchIcon />}
                  sx={{
                    ...compactActionBtnSx,
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)',
                    '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }
                  }}
                >
                  {isScanning ? 'Escaneando...' : 'Escanear'}
                </Button>
              </span>
            </Tooltip>

            {/* El archivo pesado solo aplica a la fuente SCP */}
            {!useTelegramSource && (
              <Box
                onClick={() => scpPickerRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(true) }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(false) }}
                onDrop={handleScpDrop}
                sx={{
                  flex: 1,
                  minWidth: 220,
                  maxWidth: 360,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  borderRadius: 2,
                  px: 1.5,
                  height: 34,
                  border: '1px dashed',
                  borderColor: scpDropActive ? '#38bdf8' : 'rgba(148,163,184,0.4)',
                  background: scpDropActive ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.5)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#38bdf8', background: 'rgba(56,189,248,0.05)' }
                }}
              >
                <CloudUploadIcon sx={{ color: scpDropActive ? '#38bdf8' : '#94a3b8', fontSize: 20 }} />
                <Typography variant="caption" noWrap sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                  {scpIndexedFile?.name ? `${scpIndexedFile.name} · ${formatBytes(scpIndexedFile.size)}` : 'Arrastra o elige el archivo pesado'}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        {/* ② IA */}
        <Box sx={sectionSx}>
          <Typography sx={sectionLabelSx}>② IA</Typography>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Tooltip title="Generar Metadatos con IA">
              <span>
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
              </span>
            </Tooltip>

            {aiRetryCandidateIds?.length > 0 && (
              <Tooltip title={`Reintentar ${aiRetryCandidateIds.length} fallidos`}>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReplayIcon />}
                    onClick={handleRetryFailedAi}
                    disabled={isRetryingAi || isScanning || isApplyingAiMetadata}
                    sx={{ ...compactActionBtnSx, borderColor: '#fbbf24', color: '#fbbf24' }}
                  >
                    Reintentar ({aiRetryCandidateIds.length})
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        </Box>

        {/* ③ CUENTAS */}
        <Box sx={sectionSx}>
          <Typography sx={sectionLabelSx}>③ Cuentas</Typography>
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <Select
                multiple
                displayEmpty
                value={distributionAccountIds || []}
                onChange={handleDistributionAccountsChange}
                onOpen={handleDistributionSelectorOpen}
                onClose={handleDistributionSelectorClose}
                renderValue={(selected) => {
                  const ids = Array.isArray(selected) ? selected.map(Number) : []
                  if (!ids.length) return <Typography variant="caption" sx={{ color: '#94a3b8' }}>Cuentas destino: todas</Typography>
                  return <Typography variant="caption" noWrap>Cuentas destino: {ids.length}</Typography>
                }}
                sx={{
                  height: 34,
                  color: '#f8fafc',
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.3)' },
                  '& .MuiSvgIcon-root': { color: '#94a3b8' },
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
                  const usableGb = (Math.max(0, Number(c.usableFreeMb || 0)) / 1024).toFixed(1)
                  const pct = c.totalMB > 0 ? Math.floor((c.usedMb / c.totalMB) * 100) : 0
                  return (
                    <MenuItem key={c.id} value={c.id} sx={{ color: '#e2e8f0', '&:hover': { bgcolor: '#1e293b' } }}>
                      <Checkbox checked={checked} size="small" sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }} />
                      <ListItemText
                        primary={c.alias}
                        secondary={`${usableGb} GB utilizables · ${pct}% usado`}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: checked ? 700 : 500 }}
                        secondaryTypographyProps={{ fontSize: 11, color: '#4ade80' }}
                      />
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            <Tooltip title="Espacio utilizable total y cuentas con sitio para al menos el asset pendiente más chico">
              <Stack spacing={0} sx={{ lineHeight: 1.1 }}>
                <Typography noWrap sx={{ color: '#38bdf8', fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
                  {formatBytes(totalAvailableSpaceBytes)}
                </Typography>
                <Typography noWrap sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
                  {accountsCount} cuentas disponibles
                </Typography>
              </Stack>
            </Tooltip>

            <Tooltip title="Repartir los assets pendientes entre todas las cuentas disponibles, llenando primero las que tienen menos espacio libre">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  disabled={isProcessing}
                  onClick={async () => {
                    if (await confirmAlert('¿Auto distribuir?', 'Se reasignará la cuenta de todos los assets pendientes usando todas las cuentas disponibles, empezando por las que tienen menos espacio libre. Los que no quepan quedarán sin asignar.')) {
                      handleAutoDistribute({ selectUsedAccounts: true })
                    }
                  }}
                  sx={{
                    ...compactActionBtnSx,
                    borderColor: 'rgba(56,189,248,0.5)',
                    color: '#7dd3fc',
                    '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56,189,248,0.1)' }
                  }}
                >
                  Auto distribuir
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="Quitar todas las cuentas asignadas a los assets y deseleccionarlas">
              <Button
                variant="outlined"
                size="small"
                onClick={async () => {
                  if (await confirmAlert('¿Deseleccionar cuentas?', '¿Quitar todas las cuentas asignadas a los assets y desmarcar las cuentas de destino?')) {
                    handleClearAccounts()
                  }
                }}
                sx={{
                  ...compactActionBtnSx,
                  borderColor: 'rgba(148,163,184,0.35)',
                  color: '#cbd5e1',
                  '&:hover': { borderColor: '#94a3b8', bgcolor: 'rgba(148,163,184,0.1)' }
                }}
              >
                Quitar cuentas
              </Button>
            </Tooltip>
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ my: 1.5, borderColor: 'rgba(148,163,184,0.15)' }} />

      {/* ─── FILA 2: VISTA, SUBIDA Y LIMPIEZA ─── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Vista</Typography>
            <FormControlLabel
              control={<Switch checked={reviewMode} onChange={(e) => setReviewMode(Boolean(e?.target?.checked))} color="info" size="small" />}
              label={<Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600, fontSize: 13 }}>Modo Revisión</Typography>}
              sx={{ m: 0, pr: 1.25, height: 34, borderRadius: 2, border: '1px solid rgba(56,189,248,0.3)', bgcolor: 'rgba(14,116,144,0.1)' }}
            />
            <FormControlLabel
              control={<Switch checked={semanticSort} onChange={(e) => setSemanticSort(Boolean(e?.target?.checked))} color="secondary" size="small" />}
              label={<Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600, fontSize: 13 }}>Agrupar similares</Typography>}
              sx={{ m: 0, pr: 1.25, height: 34, borderRadius: 2, border: '1px solid rgba(168,85,247,0.3)', bgcolor: 'rgba(168,85,247,0.05)' }}
            />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Subida</Typography>
            <Tooltip title={activeUploadingRow ? 'Rotar Proxy de la fila en subida' : 'Solo disponible mientras hay una fila subiendo'}>
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
                  sx={compactActionBtnSx}
                >
                  Rotar proxy
                </Button>
              </span>
            </Tooltip>

            {(() => {
              const nothingToStop = (rows || []).every((r) => String(r?.estado || '').toLowerCase() === 'borrador')
              return (
                <Tooltip title={nothingToStop ? 'No hay nada en proceso para detener' : 'Detener proceso activo y pasar todo a borrador'}>
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
                      disabled={isStoppingAll || nothingToStop}
                      sx={compactActionBtnSx}
                    >
                      Detener todo
                    </Button>
                  </span>
                </Tooltip>
              )
            })()}
          </Stack>
        </Stack>

        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteForeverIcon />}
          endIcon={<ArrowDropDownIcon />}
          onClick={(e) => setCleanupAnchor(e.currentTarget)}
          sx={{
            ...compactActionBtnSx,
            borderColor: 'rgba(239,68,68,0.5)',
            color: '#fca5a5',
            '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)', color: '#fee2e2' }
          }}
        >
          Limpieza
        </Button>
        <Menu
          anchorEl={cleanupAnchor}
          open={Boolean(cleanupAnchor)}
          onClose={() => setCleanupAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid rgba(71,85,105,0.55)', mt: 0.5 } }}
        >
          <MenuItem onClick={handleCleanCompleted} sx={{ color: '#e2e8f0', gap: 1, fontSize: 13 }}>
            <DeleteSweepIcon fontSize="small" sx={{ color: '#94a3b8' }} />
            Limpiar completados
          </MenuItem>
          {useTelegramSource && (
            <MenuItem onClick={handlePurgeOrganized} sx={{ color: '#7dd3fc', gap: 1, fontSize: 13 }}>
              <TelegramIcon fontSize="small" />
              Purgar Organized (telegram_downloads_organized)
            </MenuItem>
          )}
          <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)' }} />
          <MenuItem onClick={handlePurgeAll} sx={{ color: '#fca5a5', gap: 1, fontSize: 13, fontWeight: 700 }}>
            <DeleteForeverIcon fontSize="small" />
            Purgar todo el batch
          </MenuItem>
        </Menu>
      </Stack>
    </Box>
  )
}
