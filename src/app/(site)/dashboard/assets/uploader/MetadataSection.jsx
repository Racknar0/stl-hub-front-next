import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent, Stack, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Chip, Switch, FormControlLabel, IconButton, Tooltip, Box } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import HttpService from '@/services/HttpService'

const http = new HttpService()

export default function MetadataSection({ title, setTitle, category, setCategory, tags, setTags, isPremium, setIsPremium, disabled = false }) {
  const [categories, setCategories] = useState([])
  const [allTags, setAllTags] = useState([])
  const [newCat, setNewCat] = useState('')
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)

  const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)

  const fetchMeta = async () => {
    try {
      setLoading(true)
      const [cats, tgs] = await Promise.all([
        http.getData('/categories'),
        http.getData('/tags')
      ])
      setCategories((cats.data?.items || []).map(c => ({ id: c.id, name: c.name, slug: c.slug })))
      setAllTags((tgs.data?.items || []).map(t => t.name))
    } catch (e) {
      console.error('fetch meta error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMeta() }, [])

  const quickCreateCategory = async () => {
    const name = newCat.trim()
    if (!name) return
    try {
      const body = { name, slug: slugify(name) }
      const res = await http.postData('/categories', body)
      const c = res.data
      const list = [...categories, { id: c.id, name: c.name, slug: c.slug }].sort((a,b)=>a.name.localeCompare(b.name))
      setCategories(list)
      setCategory(c.name)
      setNewCat('')
    } catch (e) { console.error('create category failed', e) }
  }

  const quickCreateTag = async () => {
    const name = newTag.trim()
    if (!name) return
    try {
      const body = { name, slug: slugify(name) }
      const res = await http.postData('/tags', body)
      const t = res.data
      const list = [...new Set([...(allTags||[]), t.name])].sort((a,b)=>a.localeCompare(b))
      setAllTags(list)
      setTags([...(tags||[]), t.name])
      setNewTag('')
    } catch (e) { console.error('create tag failed', e) }
  }

  return (
    <Card className="glass" sx={{ opacity: disabled ? 0.6 : 1 }}>
      <CardHeader title="Metadatos" />
      <CardContent>
        <Stack spacing={2}>
          <TextField label="Nombre del stl" value={title} onChange={(e)=>setTitle(e.target.value)} fullWidth disabled={disabled} />

          {/* Categoría dinámica + crear rápido (alineados y mismo alto) */}
          <Stack direction="row" spacing={1} alignItems="stretch">
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel id="cat">Categoría</InputLabel>
              <Select labelId="cat" label="Categoría" value={category} onChange={(e)=>setCategory(e.target.value)}>
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" placeholder="Nueva categoría" value={newCat} onChange={(e)=>setNewCat(e.target.value)} disabled={disabled} sx={{ minWidth: 200 }} />
            <Tooltip title="Crear categoría">
              <span>
                <IconButton color="primary" size="small" onClick={quickCreateCategory} disabled={disabled || !newCat.trim()} sx={{ height: 40, width: 40 }}>
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          {/* Tags dinámicos + crear rápido (alineados y mismo alto) */}
          <Stack direction="row" spacing={1} alignItems="stretch">
            <Box sx={{ flex: 1, minWidth: 260 }}>
              <Autocomplete
                multiple
                freeSolo
                disabled={disabled}
                options={allTags}
                value={tags}
                onChange={(_, v) => setTags(v)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option+index} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Tags" placeholder="Añadir tag" disabled={disabled} />
                )}
              />
            </Box>
            <TextField size="small" placeholder="Nuevo tag" value={newTag} onChange={(e)=>setNewTag(e.target.value)} disabled={disabled} sx={{ minWidth: 200 }} />
            <Tooltip title="Crear tag">
              <span>
                <IconButton color="primary" size="small" onClick={quickCreateTag} disabled={disabled || !newTag.trim()} sx={{ height: 40, width: 40 }}>
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <FormControlLabel control={<Switch checked={isPremium} onChange={(e)=>setIsPremium(e.target.checked)} disabled={disabled} />} label={isPremium ? 'Premium' : 'Free'} />
        </Stack>
      </CardContent>
    </Card>
  )
}
