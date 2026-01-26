import React from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

export default function RightSidebar({
  open,
  onToggle,
  width = 380,
  collapsedWidth = 44,
  side = 'right',
  collapsible = true,
  inFlow = false,
  title = 'Panel',
  children,
}) {
  const isLeft = String(side || 'right').toLowerCase() === 'left'
  const effectiveOpen = collapsible ? !!open : true
  const w = effectiveOpen ? width : collapsedWidth

  return (
    <Box
      sx={{
        position: inFlow ? 'sticky' : 'fixed',
        top: inFlow ? 16 : 0,
        right: inFlow ? 'auto' : (isLeft ? 'auto' : 0),
        left: inFlow ? 'auto' : (isLeft ? 0 : 'auto'),
        height: inFlow ? 'auto' : '100%',
        maxHeight: inFlow ? 'calc(100vh - 16px)' : '100%',
        width: inFlow ? '100%' : w,
        zIndex: inFlow ? 1 : 9998,
        transition: inFlow ? 'none' : 'width 180ms ease',
        alignSelf: 'start',
        borderLeft: isLeft ? 'none' : '1px solid rgba(255,255,255,0.14)',
        borderRight: isLeft ? '1px solid rgba(255,255,255,0.14)' : 'none',
        background: 'rgba(16, 16, 22, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: isLeft
          ? '0 0 0 1px rgba(0,0,0,0.25), 8px 0 24px rgba(0,0,0,0.35)'
          : '0 0 0 1px rgba(0,0,0,0.25), -8px 0 24px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}
      aria-label={isLeft ? 'Panel lateral izquierdo' : 'Panel lateral derecho'}
    >
      <Box
        sx={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          gap: 1,
        }}
      >
        {effectiveOpen ? (
          <Typography variant="subtitle2" sx={{ px: 1, opacity: 0.9, whiteSpace: 'nowrap' }}>
            {title}
          </Typography>
        ) : (
          <Box />
        )}

        {collapsible ? (
          <IconButton
            size="small"
            onClick={onToggle}
            aria-label={effectiveOpen ? 'Contraer panel' : 'Expandir panel'}
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              '&:hover': { background: 'rgba(255,255,255,0.10)' },
            }}
          >
            {effectiveOpen
              ? (isLeft ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />)
              : (isLeft ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />)
            }
          </IconButton>
        ) : (
          <Box />
        )}
      </Box>

      <Box
        sx={{
          height: 'calc(100% - 56px)',
          display: effectiveOpen ? 'block' : 'none',
          px: 1,
          pb: 2,
          overflowY: 'auto',
        }}
      >
        {children || (
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            (Vacío por ahora) Aquí irá la lógica especial de búsqueda.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
