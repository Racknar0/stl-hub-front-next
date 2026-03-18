'use client'

import React from 'react'
import { TableRow, TableCell, TextField, Box, Autocomplete, Chip, IconButton, Avatar, Stack, Checkbox, Select, MenuItem, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

export default function BatchRow({
  row,
  idx,
  categoriesCatalog = [],
  tagsCatalog = [],
  cuentas = [],
  onNombreChange = () => {},
  onCategoriasChange = () => {},
  onTagsChange = () => {},
  onCuentaChange = () => {},
  onAprobarChange = () => {},
  onOpenProfiles = () => {},
  onOpenCreateModal = () => {},
}) {
  return (
    <TableRow key={idx}>
      <TableCell>
        <TextField
          value={row.nombre}
          size="small"
          onChange={e => onNombreChange(idx, e.target.value)}
          variant="outlined"
          fullWidth
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Autocomplete
            multiple
            options={categoriesCatalog}
            getOptionLabel={o => o.name || o.slug || ''}
            value={row.categorias}
            onChange={(_, v) => onCategoriasChange(idx, v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const tagProps = getTagProps({ index })
                return <Chip label={option.name || option.slug} key={index} {...tagProps} />
              })
            }
            renderInput={params => (
              <TextField {...params} size="small" placeholder="Categorías" />
            )}
            sx={{ flex: 1 }}
          />
          <IconButton size="small" color="primary" sx={{ ml: 1 }} onClick={() => onOpenCreateModal('cat', idx)}><AddIcon /></IconButton>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Autocomplete
            multiple
            freeSolo
            options={tagsCatalog}
            getOptionLabel={o => o.name || o.slug || ''}
            value={row.tags}
            onChange={(_, v) => onTagsChange(idx, v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip key={index} label={option.name || option.slug || option} {...getTagProps({ index })} />
              ))
            }
            renderInput={params => (
              <TextField {...params} size="small" placeholder="Tags" />
            )}
            sx={{ flex: 1 }}
          />
          <IconButton size="small" color="primary" sx={{ ml: 1 }} onClick={() => onOpenCreateModal('tag', idx)}><AddIcon /></IconButton>
        </Box>
      </TableCell>
      <TableCell>
        <Button variant="outlined" size="small" onClick={() => onOpenProfiles(idx)}>
          {row.perfiles || 'Perfiles'}
        </Button>
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5}>
          {Array.isArray(row.imagenes) && row.imagenes.slice(0, 4).map((img, i) => (
            <Avatar key={i} src={img} sx={{ width: 32, height: 32 }} />
          ))}
        </Stack>
      </TableCell>
      <TableCell>
        <Checkbox checked={row.aprobado} onChange={e => onAprobarChange(idx, e.target.checked)} />
      </TableCell>
      <TableCell>
        <Select
          value={row.cuenta}
          onChange={e => onCuentaChange(idx, e.target.value)}
          size="small"
        >
          {cuentas.map(c => (
            <MenuItem key={c.id} value={c.id}>{c.alias}</MenuItem>
          ))}
        </Select>
      </TableCell>
    </TableRow>
  )
}
