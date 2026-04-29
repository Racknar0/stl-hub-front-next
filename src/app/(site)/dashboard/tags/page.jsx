'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Grid, IconButton, TextField, Tooltip, Button, Checkbox, Stack, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CloseIcon from '@mui/icons-material/Close'
import HttpService from '@/services/HttpService'
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts'
import '../taxonomy.scss'

const http = new HttpService()

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)

export default function TagsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  
  // Create/Edit form
  const [form, setForm] = useState({ name: '', slug: '', nameEn: '', slugEn: '' })
  
  // Merge form
  const [mergeDestType, setMergeDestType] = useState('new') // 'new' | 'existing'
  const [mergeForm, setMergeForm] = useState({ name: '', slug: '', nameEn: '', slugEn: '', targetId: '' })
  
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return (items || []).filter(it => !qq || it.name.toLowerCase().includes(qq) || it.slug.toLowerCase().includes(qq))
  }, [items, q])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await http.getData('/tags')
      setItems(res.data?.items || [])
    } catch (e) {
      console.error('load tags failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  // Sync form when exactly 1 item is selected
  useEffect(() => {
    if (selectedItems.length === 1) {
      const it = selectedItems[0]
      setForm({ name: it.name, slug: it.slug, nameEn: it.nameEn || '', slugEn: it.slugEn || '' })
    } else {
      setForm({ name: '', slug: '', nameEn: '', slugEn: '' })
    }
  }, [selectedItems])

  const toggleSelect = (it) => {
    setSelectedItems(prev => {
      const exists = prev.find(p => p.id === it.id)
      if (exists) return prev.filter(p => p.id !== it.id)
      return [...prev, it]
    })
  }

  const selectOnly = (it) => {
    setSelectedItems([it])
  }

  const clearSelection = () => {
    setSelectedItems([])
  }

  const save = async () => {
    if (!form.name?.trim() || !form.nameEn?.trim()) return
    const isEdit = selectedItems.length === 1
    const selected = isEdit ? selectedItems[0] : null

    const ok = await confirmAlert(isEdit ? 'Actualizar tag' : 'Crear tag', isEdit ? `¿Deseas actualizar "${form.name}"?` : `¿Deseas crear "${form.name}"?`, isEdit ? 'Sí, actualizar' : 'Sí, crear', 'Cancelar', 'question')
    if (!ok) return
    const nameEs = form.name.trim().toLowerCase()
    const nameEn = form.nameEn.trim().toLowerCase()
    const payload = {
      name: nameEs,
      slug: (form.slug?.trim() || slugify(nameEs)).toLowerCase(),
      nameEn: nameEn,
      slugEn: (form.slugEn?.trim() || slugify(nameEn)).toLowerCase(),
    }
    try {
      setSaving(true)
      if (isEdit) {
        const res = await http.putData('/tags', selected.id, payload)
        const updated = res.data
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        await successAlert('Actualizado', 'El tag fue actualizado')
      } else {
        const res = await http.postData('/tags', payload)
        const created = res.data
        setItems(prev => [...prev, created].sort((a,b)=>a.name.localeCompare(b.name)))
        await successAlert('Creado', 'El tag fue creado')
      }
      clearSelection()
    } catch (e) {
      console.error('save tag failed', e)
      await errorAlert('Error', 'No se pudo guardar el tag')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (selectedItems.length !== 1) return
    const selected = selectedItems[0]
    const ok = await confirmAlert('Eliminar tag', `¿Eliminar el tag "${selected.name}"?`, 'Sí, eliminar', 'Cancelar', 'warning')
    if (!ok) return
    try {
      setSaving(true)
      await http.deleteData('/tags', selected.id)
      setItems(prev => prev.filter(i => i.id !== selected.id))
      await successAlert('Eliminado', 'El tag fue eliminado')
      clearSelection()
    } catch (e) {
      console.error('delete tag failed', e)
      await errorAlert('Error', 'No se pudo eliminar el tag')
    } finally { setSaving(false) }
  }

  const simulateMerge = async () => {
    let msg = `Se fusionarían ${selectedItems.length} tags `
    if (mergeDestType === 'new') {
      if (!mergeForm.name.trim() || !mergeForm.nameEn.trim()) {
        await errorAlert('Error', 'Debes indicar el nombre en ES y EN para el nuevo tag.')
        return
      }
      msg += `en un NUEVO tag llamado "${mergeForm.name}".\n\n(Solo UI por ahora - Simulación)`
    } else {
      const target = items.find(i => i.id === mergeForm.targetId)
      if (!target) {
        await errorAlert('Error', 'Debes elegir un tag destino válido.')
        return
      }
      msg += `dentro del tag EXISTENTE "${target.name}".\n\n(Solo UI por ahora - Simulación)`
    }
    await successAlert('Fusión Simulada', msg)
    clearSelection()
  }

  const mode = selectedItems.length === 0 ? 'create' : (selectedItems.length === 1 ? 'edit' : 'merge')

  return (
    <div className="dashboard-content p-3 taxonomy-container">
      <div className="header-actions">
        <Typography variant="h5" fontWeight={700} sx={{ color: '#f7f7fb' }}>Gestión de Tags</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" placeholder="Buscar tag..." value={q} onChange={(e)=>setQ(e.target.value)} sx={{ background: 'rgba(255,255,255,0.05)', borderRadius: 1, input: { color: '#f7f7fb' } }} />
          <Tooltip title="Recargar">
            <IconButton onClick={fetchItems} disabled={loading} sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#f7f7fb', boxShadow: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={clearSelection} sx={{ borderRadius: 8, px: 3 }}>
            Nuevo Tag
          </Button>
        </Stack>
      </div>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Lado Izquierdo: Lista Moderna */}
        <Grid item xs={12} md={5} lg={4}>
          <div className="tax-card glass">
            {loading && <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '30%', background: '#6c5ce7', animation: 'progress 1s infinite' }} />
            </div>}
            
            <ul className="tax-list">
              {filtered.map(it => {
                const isSelected = selectedItems.some(s => s.id === it.id)
                return (
                  <li key={it.id} className={`tax-item ${isSelected ? 'selected' : ''}`}>
                    <Checkbox 
                      checked={isSelected} 
                      onChange={() => toggleSelect(it)}
                      size="small"
                      sx={{ color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: '#6c5ce7' } }}
                    />
                    <div className="tax-info" onClick={() => selectOnly(it)}>
                      <div className="tax-name">
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginRight: 4, fontWeight: 'normal' }}>ES:</span>
                        {it.name || 'Sin nombre'}
                        {it.nameEn && (
                          <span className="tax-name-en">
                            <span style={{ opacity: 0.7, marginRight: 2, fontWeight: 'normal' }}>EN:</span>
                            {it.nameEn}
                          </span>
                        )}
                      </div>
                      <div className="tax-slug">
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: 4 }}>Slug:</span>
                        {it.slug || '-'}
                      </div>
                    </div>
                  </li>
                )
              })}
              {!filtered.length && !loading && <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No se encontraron tags.</div>}
            </ul>
          </div>
        </Grid>

        {/* Lado Derecho: Panel Dinámico */}
        <Grid item xs={12} md={7} lg={8}>
          <div className="tax-card glass tax-panel">
            
            {mode === 'create' && (
              <>
                <h3 className="panel-title"><AddIcon color="primary"/> Crear Nuevo Tag</h3>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (ES)" value={form.name} onChange={(e)=>{
                        const name = e.target.value
                        setForm(f=>({ ...f, name, slug: slugify(name) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (EN)" value={form.nameEn} onChange={(e)=>{
                        const nameEn = e.target.value
                        setForm(f=>({ ...f, nameEn, slugEn: slugify(nameEn) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                  </Grid>
                  
                  <div>
                    <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={save} disabled={saving || !form.name.trim() || !form.nameEn.trim()} sx={{ borderRadius: 8, px: 4 }}>
                      Guardar Tag
                    </Button>
                  </div>
                </Stack>
              </>
            )}

            {mode === 'edit' && (
              <>
                <h3 className="panel-title" style={{ color: '#a29bfe' }}>Editar Tag</h3>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (ES)" value={form.name} onChange={(e)=>{
                        const name = e.target.value
                        setForm(f=>({ ...f, name, slug: slugify(name) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Nombre (EN)" value={form.nameEn} onChange={(e)=>{
                        const nameEn = e.target.value
                        setForm(f=>({ ...f, nameEn, slugEn: slugify(nameEn) }))
                      }} fullWidth required variant="filled" />
                    </Grid>
                  </Grid>
                  
                  <Stack direction="row" spacing={2}>
                    <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={save} disabled={saving || !form.name.trim() || !form.nameEn.trim()} sx={{ borderRadius: 8, px: 4 }}>
                      Actualizar
                    </Button>
                    <Button color="error" variant="outlined" size="large" startIcon={<DeleteIcon />} onClick={remove} disabled={saving} sx={{ borderRadius: 8 }}>
                      Eliminar
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}

            {mode === 'merge' && (
              <>
                <h3 className="panel-title" style={{ color: '#a29bfe' }}><CallMergeIcon /> Fusionar {selectedItems.length} Tags</h3>
                
                <div className="merge-alert">
                  <WarningAmberIcon fontSize="small" />
                  <div>
                    <strong>Atención:</strong> Los assets pertenecientes a estos tags serán transferidos al destino seleccionado. Los tags originales serán eliminados. Esta acción es irreversible.
                  </div>
                </div>

                <div className="selected-chips">
                  {selectedItems.map(it => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(108, 92, 231, 0.2)', border: '1px solid rgba(108, 92, 231, 0.4)', borderRadius: 16, padding: '4px 10px', fontSize: '0.85rem', color: '#f7f7fb' }}>
                      <span>{it.name}</span>
                      <IconButton size="small" onClick={() => toggleSelect(it)} sx={{ ml: 0.5, p: 0.25, color: '#f7f7fb' }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </div>
                  ))}
                </div>

                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <Button variant={mergeDestType === 'new' ? 'contained' : 'outlined'} color="primary" onClick={() => setMergeDestType('new')} sx={{ borderRadius: 8 }}>
                    Fusionar en uno NUEVO
                  </Button>
                  <Button variant={mergeDestType === 'existing' ? 'contained' : 'outlined'} color="primary" onClick={() => setMergeDestType('existing')} sx={{ borderRadius: 8 }}>
                    Fusionar en EXISTENTE
                  </Button>
                </Stack>

                <div style={{ padding: '20px', border: '1px solid rgba(108, 92, 231, 0.2)', borderRadius: 12, marginTop: 16, background: 'rgba(255,255,255,0.02)' }}>
                  {mergeDestType === 'new' ? (
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">Define el nombre del nuevo tag que agrupará a todos los seleccionados:</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Nombre Nuevo (ES)" value={mergeForm.name} onChange={(e) => setMergeForm({...mergeForm, name: e.target.value, slug: slugify(e.target.value)})} fullWidth variant="filled" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Nombre Nuevo (EN)" value={mergeForm.nameEn} onChange={(e) => setMergeForm({...mergeForm, nameEn: e.target.value, slugEn: slugify(e.target.value)})} fullWidth variant="filled" />
                        </Grid>
                      </Grid>
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">Selecciona un tag existente de la lista para que absorba a los seleccionados:</Typography>
                      <FormControl fullWidth variant="filled">
                        <InputLabel>Tag Destino</InputLabel>
                        <Select
                          value={mergeForm.targetId}
                          onChange={(e) => setMergeForm({...mergeForm, targetId: e.target.value})}
                        >
                          {items.filter(i => !selectedItems.some(s => s.id === i.id)).map(i => (
                            <MenuItem key={i.id} value={i.id}>{i.name} ({i.nameEn})</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                  <Button variant="contained" color="primary" size="large" startIcon={<CallMergeIcon />} onClick={simulateMerge} sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 'bold' }}>
                    Confirmar Fusión
                  </Button>
                </div>
              </>
            )}
            
          </div>
        </Grid>

      </Grid>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(330%); }
        }
      `}} />
    </div>
  )
}
