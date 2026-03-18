// Tabla de ejemplo para Upload Batch
'use client'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Chip, Select, MenuItem, Checkbox, Avatar, Stack, Box, IconButton } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import HttpService from '@/services/HttpService';
import BatchRow from './BatchRow';
import ProfilesModal from './ProfilesModal';
import MetaCreateDialog from './MetaCreateDialog';

const cuentas = [
  { id: 1, alias: 'Cuenta 1' },
  { id: 2, alias: 'Cuenta 2' },
];

const data = [
  {
    nombre: 'Asset 1',
    categorias: [],
    tags: [],
    perfiles: 'Perfil 1',
    imagenes: ['/img1.jpg', '/img2.jpg', '/img3.jpg', '/img4.jpg'],
    aprobado: false,
    cuenta: 1,
  },
  {
    nombre: 'Asset 2',
    categorias: [],
    tags: [],
    perfiles: 'Perfil 2',
    imagenes: ['/img1.jpg', '/img2.jpg'],
    aprobado: true,
    cuenta: 2,
  },
]

export default function BatchTable() {
  const [rows, setRows] = useState(data)
  const debounceTimeout = useRef([])

  // Estados y handlers para modales pequeños
  const [profilesModalOpen, setProfilesModalOpen] = useState(false)
  const [selectedRowIdxPerfil, setSelectedRowIdxPerfil] = useState(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalType, setCreateModalType] = useState('')
  const [createModalRowIdx, setCreateModalRowIdx] = useState(null)

  const handleOpenPerfilModal = (rowIdx) => {
    setSelectedRowIdxPerfil(rowIdx)
    setProfilesModalOpen(true)
  }

  const handleApplyProfileToRow = (profile) => {
    if (selectedRowIdxPerfil === null) return
    const updated = [...rows]
    updated[selectedRowIdxPerfil].categorias = (profile.categories || []).map(slug => {
      return categoriesCatalog.find(c => c.slug === slug) || { slug, name: slug }
    })
    updated[selectedRowIdxPerfil].tags = (profile.tags || []).map(slug => {
      return tagsCatalog.find(t => t.slug === slug) || { slug, name: slug }
    })
    updated[selectedRowIdxPerfil].perfiles = profile.name
    setRows(updated)
    setProfilesModalOpen(false)
    setSelectedRowIdxPerfil(null)
  }

  const openCreateModal = (type, rowIdx) => {
    setCreateModalType(type)
    setCreateModalRowIdx(rowIdx)
    setCreateModalOpen(true)
  }

  const handleMetaCreated = (item) => {
    if (!item) return
    if (createModalType === 'cat') {
      setCategoriesCatalog(prev => [...prev, item])
      if (createModalRowIdx !== null && Number.isFinite(createModalRowIdx)) {
        const updated = [...rows]
        updated[createModalRowIdx].categorias = [...(updated[createModalRowIdx].categorias || []), item]
        setRows(updated)
      }
    } else {
      setTagsCatalog(prev => [...prev, item])
      if (createModalRowIdx !== null && Number.isFinite(createModalRowIdx)) {
        const updated = [...rows]
        updated[createModalRowIdx].tags = [...(updated[createModalRowIdx].tags || []), item]
        setRows(updated)
      }
    }
    setCreateModalOpen(false)
    setCreateModalRowIdx(null)
    setCreateModalType('')
  }

const http = new HttpService()

useEffect(() => {
  async function fetchCatalogs() {
    try {
      const cats = await http.getData('/categories')
      setCategoriesCatalog(cats.data?.items || [])
      const tgs = await http.getData('/tags')
      setTagsCatalog(tgs.data?.items || [])
    } catch {}
  }
  fetchCatalogs()
}, [])

const [categoriesCatalog, setCategoriesCatalog] = useState([])
const [tagsCatalog, setTagsCatalog] = useState([])

const handleCuentaChange = (idx, value) => {
  const updated = [...rows]
  updated[idx].cuenta = value
  setRows(updated)
}

const handleAprobarChange = (idx, value) => {
  const updated = [...rows]
  updated[idx].aprobado = value
  setRows(updated)
}

const handleNombreChange = (idx, value) => {
  // Actualiza el valor en tiempo real
  const updated = [...rows]
  updated[idx].nombre = value
  setRows(updated)
  // Debounced para guardar o enviar a backend (solo si se implementa)
  if (debounceTimeout.current[idx]) {
    clearTimeout(debounceTimeout.current[idx])
  }
  debounceTimeout.current[idx] = setTimeout(() => {
    // Aquí iría la lógica de guardado en backend si se requiere
  }, 400)
}


const handleCategoriasChange = (idx, value) => {
  const updated = [...rows]
  updated[idx].categorias = value
  setRows(updated)
}
const handleTagsChange = (idx, value) => {
  const updated = [...rows]
  updated[idx].tags = value
  setRows(updated)
}

return (
  <>
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre del asset</TableCell>
            <TableCell>Categorías</TableCell>
            <TableCell>Tags</TableCell>
            <TableCell>Perfiles</TableCell>
            <TableCell>Imágenes</TableCell>
            <TableCell>Aprobar</TableCell>
            <TableCell>Cuenta</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <BatchRow
              key={idx}
              row={row}
              idx={idx}
              categoriesCatalog={categoriesCatalog}
              tagsCatalog={tagsCatalog}
              cuentas={cuentas}
              onNombreChange={handleNombreChange}
              onCategoriasChange={handleCategoriasChange}
              onTagsChange={handleTagsChange}
              onOpenProfiles={handleOpenPerfilModal}
              onAprobarChange={handleAprobarChange}
              onCuentaChange={handleCuentaChange}
              onOpenCreateModal={openCreateModal}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <ProfilesModal
      open={profilesModalOpen}
      onClose={() => { setProfilesModalOpen(false); setSelectedRowIdxPerfil(null); }}
      selectedRow={selectedRowIdxPerfil !== null ? rows[selectedRowIdxPerfil] : null}
      onApply={handleApplyProfileToRow}
    />
    <MetaCreateDialog
      open={createModalOpen}
      type={createModalType}
      onClose={() => setCreateModalOpen(false)}
      onCreated={handleMetaCreated}
    />
  </>
);
}
