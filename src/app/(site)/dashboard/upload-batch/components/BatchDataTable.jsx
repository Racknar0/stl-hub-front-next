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
  distributionAccountIds,
  similaritySelectedId,
  // ─── Handlers de BatchRow ───
  handleNombreChange,
  handleNombreEnChange,
  handleDescriptionChange,
  handleDescriptionEnChange,
  handleCategoriasChange,
  handleTagsChange,
  handleCuentaChange,
  handleSaveRow,
  handleQuickAdultos,
  handleGenerateSingleDescription,
  openCreateModal,
  handleOpenPerfilModal,
  setPreviewImage,
  handleSetPrimaryImage,
  handleDeleteImage,
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
        maxHeight: reviewMode ? 'calc(100vh - 24px)' : 'calc(100vh - 280px)',
        minHeight: '350px',
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
        {!reviewMode && (
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: 100, minWidth: 100, fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}># / Acciones</TableCell>
              <TableCell sx={{ minWidth: 500, width: '100%', fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Asset Info (Nombre, Cat, Tags)</TableCell>
              <TableCell sx={{ minWidth: 400, width: 400, maxWidth: 400, fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Descripción (ES / EN)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Cuenta / Perfil</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Subida (M / B)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Estado</TableCell>
            </TableRow>
          </TableHead>
        )}

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
                distributionAccountIds={distributionAccountIds}
                onNombreChange={handleNombreChange}
                onNombreEnChange={handleNombreEnChange}
                onDescriptionChange={handleDescriptionChange}
                onDescriptionEnChange={handleDescriptionEnChange}
                onCategoriasChange={handleCategoriasChange}
                onTagsChange={handleTagsChange}
                onCuentaChange={handleCuentaChange}
                onSaveRow={handleSaveRow}
                onQuickAdultos={handleQuickAdultos}
                onGenerateSingleDescription={handleGenerateSingleDescription}
                onOpenCreateModal={openCreateModal}
                onOpenProfiles={handleOpenPerfilModal}
                onOpenImagePreview={setPreviewImage}
                onSetPrimaryImage={handleSetPrimaryImage}
                onDeleteImage={handleDeleteImage}
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
