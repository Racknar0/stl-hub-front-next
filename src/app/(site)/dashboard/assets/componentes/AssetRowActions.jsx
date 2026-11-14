'use client'

import { useState } from 'react'
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import Cached from '@mui/icons-material/Cached'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import OpenInNew from '@mui/icons-material/OpenInNew'

export default function AssetRowActions({ asset, onView, onEdit, onDelete, onRestore }) {
  const [anchor, setAnchor] = useState(null)
  const run = (callback) => { setAnchor(null); callback(asset) }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: .5, whiteSpace: 'nowrap' }}>
      <Tooltip title="Ver detalle interno"><IconButton size="small" aria-label={`Ver detalle del modelo ${asset.id}`} onClick={() => onView(asset)}><VisibilityOutlined sx={{ fontSize: 18 }} /></IconButton></Tooltip>
      <Tooltip title="Editar modelo"><IconButton size="small" aria-label={`Editar modelo ${asset.id}`} onClick={() => onEdit(asset)}><EditOutlined sx={{ fontSize: 18 }} /></IconButton></Tooltip>
      <Tooltip title={asset.slug ? 'Ficha pública' : 'Sin ficha pública'}><span><IconButton component="a" href={asset.slug ? `/asset/${encodeURIComponent(asset.slug)}` : undefined} target="_blank" rel="noopener noreferrer" disabled={!asset.slug} size="small" aria-label={`Ficha pública del modelo ${asset.id}`}><OpenInNew sx={{ fontSize: 17 }} /></IconButton></span></Tooltip>
      <Tooltip title="Más acciones"><IconButton size="small" aria-label={`Más acciones del modelo ${asset.id}`} aria-haspopup="menu" aria-expanded={Boolean(anchor)} onClick={event => setAnchor(event.currentTarget)}><MoreHoriz sx={{ fontSize: 20 }} /></IconButton></Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {asset.megaLink && <MenuItem component="a" href={asset.megaLink} target="_blank" rel="noopener noreferrer" onClick={() => setAnchor(null)}><ListItemIcon><OpenInNew fontSize="small" /></ListItemIcon><ListItemText>Abrir en MEGA</ListItemText></MenuItem>}
        <MenuItem onClick={() => run(onRestore)}><ListItemIcon><Cached fontSize="small" /></ListItemIcon><ListItemText>Verificar y restaurar enlace</ListItemText></MenuItem>
        <MenuItem onClick={() => run(onDelete)} sx={{ color: '#f08080' }}><ListItemIcon><DeleteOutline fontSize="small" sx={{ color: '#f08080' }} /></ListItemIcon><ListItemText>Eliminar modelo</ListItemText></MenuItem>
      </Menu>
    </Box>
  )
}
