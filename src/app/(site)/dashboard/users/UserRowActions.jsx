import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import DeleteOutline from '@mui/icons-material/DeleteOutline';

export default function UserRowActions({ row, onView, onEdit, onDelete }) {
  const [anchor, setAnchor] = useState(null);
  return <Box sx={{ display: 'flex', gap: .5, justifyContent: 'flex-end' }} onClick={event => event.stopPropagation()}>
    <Tooltip title="Ver usuario"><IconButton size="small" aria-label="Ver usuario" onClick={() => onView(row.original.id)}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="Editar usuario"><IconButton size="small" aria-label="Editar usuario" onClick={() => onEdit(row)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
    {row.original.roleId !== 2 && <>
      <Tooltip title="Más acciones"><IconButton size="small" aria-label="Más acciones del usuario" aria-haspopup="menu" aria-expanded={Boolean(anchor)} onClick={event => setAnchor(event.currentTarget)}><MoreHoriz fontSize="small" /></IconButton></Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem onClick={() => { setAnchor(null); onDelete(row); }} sx={{ color: '#fb7185', gap: 1, fontSize: 13 }}><DeleteOutline fontSize="small" />Eliminar usuario</MenuItem></Menu>
    </>}
  </Box>;
}
