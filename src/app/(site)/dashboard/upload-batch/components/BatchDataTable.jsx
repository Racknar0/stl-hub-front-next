// ╔══════════════════════════════════════════════════════════════╗
// ║ BatchDataTable.jsx                                          ║
// ║ La tabla principal con:                                      ║
// ║  - TableContainer con scroll y sticky headers                ║
// ║  - Columnas: # / Acciones, Asset Info, Descripción, etc     ║
// ║  - Virtualización con @tanstack/react-virtual                ║
// ║  - Renderiza BatchRow por cada fila virtual                   ║
// ╚══════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material'
import BatchRow from '../BatchRow'
import { REVIEW_VIEWPORT_HEIGHT } from '../constants'

export default function BatchDataTable({
  // ─── Virtualización ───
  reviewScrollRef,
  reviewMode,
  virtualizer,
  virtualItems,
  visibleEntries,
  visibleColumnCount,
  // ─── Datos y catálogos ───
  categoriesCatalog,
  tagsCatalog,
  cuentas,
  similaritySelectedId,
  // ─── Handlers de BatchRow ───
  handleNombreChange,
  handleNombreEnChange,
  handleDescriptionChange,
  handleDescriptionEnChange,
  handleCategoriasChange,
  handleTagsChange,
  handleCuentaChange,
  openCreateModal,
  handleOpenPerfilModal,
  setPreviewImage,
  handleSetPrimaryImage,
  handleOpenSimilar,
  handleRemoverFila,
}) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      variant="outlined"
      ref={reviewScrollRef}
      sx={{
        maxHeight: reviewMode ? REVIEW_VIEWPORT_HEIGHT : 'calc(100vh - 280px)',
        overflowY: 'scroll',
        overflowAnchor: 'none',
        borderRadius: 2,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.82), rgba(17,24,39,0.78))',
        borderColor: 'rgba(148,163,184,0.32)',
        boxShadow: '0 10px 24px rgba(2,6,23,0.35)',
        '& .MuiTableCell-root': {
          color: '#edf3ff',
          borderBottom: '1px solid rgba(148,163,184,0.24)',
        },
        '& .MuiTableCell-head': {
          backgroundColor: '#0f172a',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        },
      }}
    >
      <Table size="medium" stickyHeader>
        {/* ── Headers ── */}
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}># / Acciones</TableCell>
            <TableCell sx={{ minWidth: 500, fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Asset Info (Nombre, Cat, Tags)</TableCell>
            {!reviewMode && (
              <>
                <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Descripción (ES / EN)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Cuenta / Perfil</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Subida (M / B)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Estado</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>

        {/* ── Body con virtualización ── */}
        <TableBody>
          {visibleEntries.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} align="center" sx={{ py: 6 }}>
                <Typography variant="h6" sx={{ color: 'rgba(226,232,240,0.95)', fontWeight: 600 }}>
                  {reviewMode ? 'No hay items en fase de revisión (borrador/error).' : 'No hay assets en /uploads/batch_imports/'}
                </Typography>
              </TableCell>
            </TableRow>
          )}

          {/* Spacer superior (virtualización) */}
          {virtualItems.length > 0 && virtualItems[0].start > 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} sx={{ p: 0, borderBottom: 'none', height: `${virtualItems[0].start}px` }} />
            </TableRow>
          )}

          {/* Filas virtualizadas */}
          {virtualItems.map((virtualRow) => {
            const { row, rowIndex, visibleIndex } = visibleEntries[virtualRow.index];
            return (
              <BatchRow
                key={row.id || `${rowIndex}-${virtualRow.index}`}
                row={row}
                idx={rowIndex}
                measureElement={virtualizer.measureElement}
                virtualIndex={virtualRow.index}
                sequenceLabel={`${visibleIndex + 1}/${visibleEntries.length}`}
                reviewMode={reviewMode}
                isSimilarityFocused={Number(row?.id || 0) > 0 && Number(row?.id || 0) === Number(similaritySelectedId || 0)}
                categoriesCatalog={categoriesCatalog}
                tagsCatalog={tagsCatalog}
                cuentas={cuentas}
                onNombreChange={handleNombreChange}
                onNombreEnChange={handleNombreEnChange}
                onDescriptionChange={handleDescriptionChange}
                onDescriptionEnChange={handleDescriptionEnChange}
                onCategoriasChange={handleCategoriasChange}
                onTagsChange={handleTagsChange}
                onCuentaChange={handleCuentaChange}
                onOpenCreateModal={openCreateModal}
                onOpenProfiles={handleOpenPerfilModal}
                onOpenImagePreview={setPreviewImage}
                onSetPrimaryImage={handleSetPrimaryImage}
                onOpenSimilar={handleOpenSimilar}
                onRemoverFila={handleRemoverFila}
              />
            )
          })}

          {/* Spacer inferior (virtualización) */}
          {virtualItems.length > 0 && virtualItems[virtualItems.length - 1].end < virtualizer.getTotalSize() && (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} sx={{ p: 0, borderBottom: 'none', height: `${virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end}px` }} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
