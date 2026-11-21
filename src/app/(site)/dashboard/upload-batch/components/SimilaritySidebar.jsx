// ╔════════════════════════════════════════════════════════════╗
// ║ SimilaritySidebar.jsx                                      ║
// ║ Sidebar lateral de búsqueda de similares:                   ║
// ║  - Línea compacta con el ítem que se compara                ║
// ║  - Tarjetas: %, título, 3 fotos (vista grande en hover)     ║
// ║  - Botones: cambiar lado, cerrar, revalidar                 ║
// ║  - Botón eliminar asset similar (🗑️)                        ║
// ║  - Visualización de tags y categorías con chips premium     ║
// ║  - Eliminación de imágenes individuales de assets similares ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Button, Stack, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import RefreshIcon from '@mui/icons-material/Refresh'
import RightSidebar from '../../assets/componentes/RightSidebar'
import { RIGHT_SIDEBAR_WIDTH } from '../constants'

export default function SimilaritySidebar({
  searchSidebarOpen,
  setSearchSidebarOpen,
  searchSidebarSide,
  toggleSearchSidebarSide,
  similaritySelectedId,
  setSimilaritySelectedId,
  similarityMap,
  rows,
  startSimilarityCheck,
  makeUploadsUrl,
  setPreviewImage,
  onDeleteAsset,
  deletingAssetIds,
  onDeleteImageFromSimilar,
  precalcStatus,
  onStartPrecalculate,
  onStopPrecalculate,
}) {
  // Similares con todas sus fotos desplegadas (clic en "+N")
  const [expandedAssetIds, setExpandedAssetIds] = React.useState(() => new Set())

  // Contraído: botón flotante pequeño arriba (expandir + cambiar de lado), sin robar espacio.
  if (!searchSidebarOpen) {
    const isLeft = searchSidebarSide === 'left'
    const pillBtnSx = { color: '#e2e8f0', p: 0.6, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' } }
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.25}
        sx={{
          position: 'fixed',
          top: 12,
          // A la derecha deja sitio al botón rojo de salir del modo revisión.
          ...(isLeft ? { left: 12 } : { right: 72 }),
          zIndex: 9998,
          bgcolor: 'rgba(29, 30, 38, 0.95)',
          border: '1px solid rgba(0,180,216,0.55)',
          borderRadius: 3,
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
          p: 0.4,
        }}
      >
        <Tooltip title="Abrir búsqueda de similares">
          <Button
            size="small"
            onClick={() => setSearchSidebarOpen(true)}
            startIcon={precalcStatus?.running ? <CircularProgress size={14} sx={{ color: '#60a5fa' }} /> : <TravelExploreIcon sx={{ fontSize: 18 }} />}
            sx={{ color: '#e2e8f0', textTransform: 'none', fontWeight: 700, fontSize: 12, px: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' } }}
          >
            {precalcStatus?.running ? `Similares ${precalcStatus.processed}/${precalcStatus.total}` : 'Similares'}
          </Button>
        </Tooltip>
        <Tooltip title={isLeft ? 'Mover a Derecha' : 'Mover a Izquierda'}>
          <IconButton size="small" onClick={toggleSearchSidebarSide} sx={pillBtnSx}>
            <SwapHorizIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    )
  }

  const isLeftSide = searchSidebarSide === 'left'
  const tagKey = (t) => String(typeof t === 'string' ? t : (t?.slug || t?.name || '')).trim().toLowerCase()
  const tagLabel = (t) => (typeof t === 'string' ? t : (t?.name || t?.slug || ''))
  const cleanTitle = (title) => String(title || '').replace(/^\s*STL\s*-\s*/i, '')
  const scoreColors = (percent) => percent > 85
    ? { bg: 'rgba(22, 163, 74, 0.92)', fg: '#f0fdf4' }
    : percent >= 50
      ? { bg: 'rgba(234, 179, 8, 0.92)', fg: '#1c1917' }
      : { bg: 'rgba(71, 85, 105, 0.92)', fg: '#f1f5f9' }

  const chipSx = { px: 0.6, py: 0.1, borderRadius: 0.75, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.5 }

  return (
    <RightSidebar
      side={searchSidebarSide}
      collapsedWidth={52}
      collapsible={true}
      open={searchSidebarOpen}
      onToggle={() => setSearchSidebarOpen(!searchSidebarOpen)}
      inFlow={false}
      width={RIGHT_SIDEBAR_WIDTH}
      title="Similares"
      hideHeaderActionUntilHover={true}
      headerAction={
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={isLeftSide ? 'Mover a Derecha' : 'Mover a Izquierda'}>
            <IconButton size="small" onClick={toggleSearchSidebarSide} sx={{ border: '1px solid rgba(173,175,184,0.35)', color: '#adafb8', p: 0.5, borderRadius: 2 }}>
              <SwapHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              precalcStatus?.running
                ? `Calculando similares (${precalcStatus.processed}/${precalcStatus.total}) • Click para detener`
                : "Pre-calcular similares del lote en segundo plano"
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={precalcStatus?.running ? onStopPrecalculate : onStartPrecalculate}
                sx={{
                  border: precalcStatus?.running
                    ? '1px solid rgba(59, 130, 246, 0.6)'
                    : '1px solid rgba(173, 175, 184, 0.35)',
                  color: precalcStatus?.running ? '#60a5fa' : '#adafb8',
                  p: 0.5,
                  borderRadius: 2,
                  bgcolor: precalcStatus?.running ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  '&:hover': {
                    bgcolor: precalcStatus?.running ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    color: precalcStatus?.running ? '#ef4444' : '#fff',
                    borderColor: precalcStatus?.running ? '#ef4444' : '#fff',
                  },
                }}
              >
                {precalcStatus?.running ? (
                  <CircularProgress size={16} sx={{ color: '#60a5fa' }} />
                ) : (
                  <TravelExploreIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cerrar Búsqueda">
            <IconButton size="small" color="error" onClick={() => setSimilaritySelectedId(null)} sx={{ border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', p: 0.5, borderRadius: 2 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {/* Progreso del pre-cálculo siempre visible (los botones de arriba se ocultan sin hover) */}
      {precalcStatus?.running && (
        <Typography variant="caption" sx={{ display: 'block', px: 1, mb: 0.75, color: '#60a5fa', fontWeight: 700 }}>
          Calculando similares del lote: {precalcStatus.processed}/{precalcStatus.total}
        </Typography>
      )}

      {!similaritySelectedId ? (
        <Typography variant="body2" sx={{ opacity: 0.8, px: 1 }}>Selecciona un ítem para ver similares.</Typography>
      ) : (
        <Box sx={{ px: 0.5, position: 'relative' }}>
          {/* Skeleton indicator if selection exists but is not mapped yet */}
          {similaritySelectedId && !similarityMap?.[similaritySelectedId] && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={24} sx={{ mb: 2 }} />
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Buscando similares…</Typography>
            </Box>
          )}

          {/* Render ONLY the currently selected item to prevent DOM bloat and memory leaks */}
          {(() => {
            const currentId = Number(similaritySelectedId)
            if (!currentId) return null
            const itemSimilarity = similarityMap?.[currentId]
            const queueItem = rows.find(r => r.id === currentId)

            if (!queueItem || !itemSimilarity) return null

            const draftTagKeys = new Set((Array.isArray(queueItem?.tags) ? queueItem.tags : []).map(tagKey).filter(Boolean))
            const items = itemSimilarity?.items || []

            return (
              <Box key={currentId}>
                {/* ── Una línea: qué se compara + resumen + revalidar ── */}
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap title={queueItem?.nombre || ''} sx={{ fontSize: 12, color: '#e2e8f0' }}>
                      <Box component="span" sx={{ color: '#94a3b8' }}>Comparando: </Box>
                      <b>{queueItem?.nombre || '(sin nombre)'}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: itemSimilarity?.status === 'error' ? '#f87171' : '#94a3b8' }}>
                      {itemSimilarity?.status === 'loading' && (itemSimilarity?.phase || 'Buscando similares…')}
                      {itemSimilarity?.status === 'done' && `${items.length} similares`}
                      {itemSimilarity?.status === 'error' && (itemSimilarity?.error || 'No se pudo buscar similares')}
                    </Typography>
                  </Box>
                  <Tooltip title="Revalidar búsqueda">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => { if (queueItem) void startSimilarityCheck(queueItem) }}
                        disabled={itemSimilarity?.status === 'loading'}
                        sx={{ color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 2, p: 0.5 }}
                      >
                        {itemSimilarity?.status === 'loading'
                          ? <CircularProgress size={16} />
                          : <RefreshIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>

                {/* ── Lista de resultados ── */}
                {itemSimilarity?.status === 'done' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {items.map((a) => {
                      const scoreValue = Number(a?._score || a?._similarity?.score || 0);
                      const percent = Math.round(scoreValue * 100);
                      const colors = scoreColors(percent);
                      const isDeleting = deletingAssetIds?.has?.(a.id) || false;
                      const images = (a.images || []).filter(Boolean);
                      const isExpanded = expandedAssetIds.has(a.id);
                      const visibleImages = isExpanded ? images : images.slice(0, 3);
                      const hiddenCount = images.length - 3;
                      const allTags = Array.isArray(a.tags) ? a.tags.filter((t) => tagLabel(t)) : [];
                      const commonTags = allTags.filter((t) => draftTagKeys.has(tagKey(t)));
                      const firstCategory = Array.isArray(a.categories) ? a.categories[0] : null;
                      const restCount = allTags.length - commonTags.length + Math.max(0, (a.categories || []).length - 1);
                      return (
                        <Box
                          key={a.id}
                          sx={{
                            p: 0.75,
                            borderRadius: 2,
                            border: '1px solid rgba(148, 163, 184, 0.22)',
                            background: 'rgba(255,255,255,0.03)',
                            opacity: isDeleting ? 0.45 : 1,
                            transition: 'opacity 0.3s ease, border-color 0.2s ease',
                            '&:hover': { borderColor: 'rgba(88, 214, 141, 0.55)' },
                            '&:hover .sim-del-asset': { opacity: 1 },
                          }}
                        >
                          {/* Línea 1: %, título, borrar */}
                          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.6 }}>
                            <Box sx={{ ...chipSx, fontSize: 11, fontWeight: 800, bgcolor: colors.bg, color: colors.fg, flexShrink: 0 }}>
                              {percent}%
                            </Box>
                            <Tooltip
                              placement="top"
                              title={<Box><b>{a.title}</b><br />{a.archiveName}</Box>}
                            >
                              <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                                {cleanTitle(a.title)}
                              </Typography>
                            </Tooltip>
                            <Tooltip title={isDeleting ? 'Eliminando…' : 'Eliminar asset'}>
                              <span>
                                <IconButton
                                  className="sim-del-asset"
                                  size="small"
                                  disabled={isDeleting}
                                  onClick={() => onDeleteAsset?.(a.id, a.title || a.archiveName || `ID ${a.id}`)}
                                  sx={{
                                    color: '#ef4444',
                                    p: 0.3,
                                    opacity: isDeleting ? 1 : 0,
                                    transition: 'opacity 0.2s ease',
                                    '&:hover': { background: 'rgba(239, 68, 68, 0.15)' },
                                    '&.Mui-disabled': { color: 'rgba(239, 68, 68, 0.3)' },
                                  }}
                                >
                                  {isDeleting
                                    ? <CircularProgress size={16} sx={{ color: '#ef4444' }} />
                                    : <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                  }
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>

                          {/* Fotos: 3 visibles a la vez, vista grande al pasar el ratón */}
                          {images.length > 0 && (
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.6 }}>
                              {visibleImages.map((src, i) => {
                                const safeSrc = makeUploadsUrl(src)
                                if (!safeSrc) return null
                                const isMoreTile = !isExpanded && i === 2 && hiddenCount > 0
                                return (
                                  <Tooltip
                                    key={i}
                                    placement={isLeftSide ? 'right' : 'left'}
                                    enterDelay={120}
                                    disableInteractive
                                    title={
                                      <Box
                                        component="img"
                                        src={safeSrc}
                                        alt=""
                                        sx={{ display: 'block', width: 400, height: 400, objectFit: 'contain', bgcolor: '#0b1020', borderRadius: 1 }}
                                      />
                                    }
                                    slotProps={{
                                      popper: { sx: { zIndex: 10000 } },
                                      tooltip: { sx: { maxWidth: 'none', p: 0.5, bgcolor: '#0b1020', border: '1px solid rgba(148,163,184,0.35)' } },
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        position: 'relative',
                                        aspectRatio: '1 / 1',
                                        borderRadius: 1.25,
                                        overflow: 'hidden',
                                        border: '1px solid rgba(148,163,184,0.3)',
                                        cursor: 'pointer',
                                        '&:hover .del-img-btn': { opacity: 1 },
                                      }}
                                      onClick={() => {
                                        if (isMoreTile) {
                                          setExpandedAssetIds((prev) => new Set(prev).add(a.id))
                                        } else {
                                          setPreviewImage(safeSrc)
                                        }
                                      }}
                                    >
                                      <Box
                                        component="img"
                                        src={safeSrc}
                                        loading="lazy"
                                        decoding="async"
                                        alt=""
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      />
                                      {isMoreTile ? (
                                        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(2,6,23,0.6)', color: '#fff', fontSize: 18, fontWeight: 800 }}>
                                          +{hiddenCount}
                                        </Box>
                                      ) : (
                                        <Tooltip title="Eliminar imagen de este asset">
                                          <IconButton
                                            className="del-img-btn"
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteImageFromSimilar?.(a.id, src);
                                            }}
                                            sx={{
                                              position: 'absolute',
                                              top: 3,
                                              right: 3,
                                              bgcolor: 'rgba(15,23,42,0.85)',
                                              border: '1px solid rgba(239,68,68,0.5)',
                                              color: '#f87171',
                                              opacity: 0,
                                              transition: 'opacity 0.2s ease',
                                              p: 0.25,
                                              '&:hover': {
                                                bgcolor: '#ef4444',
                                                color: '#fff'
                                              }
                                            }}
                                          >
                                            <CloseIcon sx={{ fontSize: 10 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </Tooltip>
                                )
                              })}
                            </Box>
                          )}
                          {isExpanded && hiddenCount > 0 && (
                            <Button
                              size="small"
                              onClick={() => setExpandedAssetIds((prev) => { const next = new Set(prev); next.delete(a.id); return next })}
                              sx={{ mt: 0.4, fontSize: 11, textTransform: 'none', color: '#94a3b8', py: 0 }}
                            >
                              Ver menos
                            </Button>
                          )}

                          {/* Línea de tags: categoría + solo los tags en común con el borrador */}
                          {(firstCategory || allTags.length > 0) && (
                            <Tooltip
                              placement="top"
                              title={[
                                ...(a.categories || []).map((c) => (c.name || c.slug || '').toUpperCase()),
                                ...allTags.map((t) => `#${tagLabel(t)}`),
                              ].join('  ')}
                            >
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.6, overflow: 'hidden' }}>
                                {firstCategory && (
                                  <Box sx={{ ...chipSx, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.35)', color: '#86efac', textTransform: 'uppercase' }}>
                                    {firstCategory.name || firstCategory.slug}
                                  </Box>
                                )}
                                {commonTags.map((t, i) => (
                                  <Box key={i} sx={{ ...chipSx, background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.45)', color: '#7dd3fc' }}>
                                    #{tagLabel(t)}
                                  </Box>
                                ))}
                                {restCount > 0 && (
                                  <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>+{restCount}</Typography>
                                )}
                              </Stack>
                            </Tooltip>
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                )}

                {itemSimilarity?.status === 'done' && items.length === 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        bgcolor: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4ade80',
                      }}
                    >
                      <CheckCircleOutlineIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#86efac', fontSize: '0.88rem' }}>
                      Modelo Único / Sin Similares
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                      No se encontraron modelos duplicados en la base de datos (coincidencia &lt; 30%). Listo para publicar sin conflicto.
                    </Typography>
                  </Box>
                )}
              </Box>
            )
          })()}
        </Box>
      )}
    </RightSidebar>
  )
}
