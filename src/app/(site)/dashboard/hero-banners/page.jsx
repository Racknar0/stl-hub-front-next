'use client'

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import AddOutlined from '@mui/icons-material/AddOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import PanoramaOutlined from '@mui/icons-material/PanoramaOutlined'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import DesktopWindowsOutlined from '@mui/icons-material/DesktopWindowsOutlined'
import SmartphoneOutlined from '@mui/icons-material/SmartphoneOutlined'
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined'
import UnarchiveOutlined from '@mui/icons-material/UnarchiveOutlined'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import axios from '@/services/AxiosInterceptor'
import styles from './hero-banners.module.scss'

const SLOTS = [
  { key: 'esDesktop', language: 'ES', label: 'Español · Escritorio', mobile: false, width: 1024, height: 384, ratio: 8 / 3 },
  { key: 'enDesktop', language: 'EN', label: 'Inglés · Escritorio', mobile: false, width: 1024, height: 384, ratio: 8 / 3 },
  { key: 'esMobile', language: 'ES', label: 'Español · Móvil', mobile: true, width: 600, height: 750, ratio: 4 / 5 },
  { key: 'enMobile', language: 'EN', label: 'Inglés · Móvil', mobile: true, width: 600, height: 750, ratio: 4 / 5 },
]
const ACCEPT = 'image/png,image/jpeg,image/webp,image/avif'
const MAX_FILE_BYTES = 10 * 1024 * 1024

function fileSize(bytes = 0) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`
}

function imageUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '').replace(/\/api$/, '')
  return `${base}/${url.replace(/^\/+/, '')}`
}

function errorMessage(error) {
  return error?.response?.data?.error || error?.message || 'No se pudo completar la operación. Inténtalo de nuevo.'
}

function PreviewImage({ src, alt, ...props }) {
  // Original image dimensions and file size are part of the management workflow.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} {...props} />
}

function FileSlot({ slot, value, onSelect, onRemove, disabled }) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const Icon = slot.mobile ? SmartphoneOutlined : DesktopWindowsOutlined
  return (
    <div className={`${styles.fileSlot} ${value?.error ? styles.invalid : ''} ${value?.file ? styles.filled : ''} ${dragging ? styles.dragging : ''}`}>
      <div className={styles.slotHeading}>
        <span><Icon fontSize="small" /> {slot.label}</span>
        <span className={styles.language}>{slot.language}</span>
      </div>
      <label
        htmlFor={inputId}
        className={`${styles.dropArea} ${slot.mobile ? styles.mobileDrop : ''}`}
        onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) onSelect(slot, event.dataTransfer.files.length === 1 ? event.dataTransfer.files[0] : null, 'Arrastra un solo archivo para este formato.')
        }}
      >
        <input id={inputId} type="file" accept={ACCEPT} disabled={disabled} onChange={event => {
          const file = event.target.files?.[0]
          if (file) onSelect(slot, file)
          event.target.value = ''
        }} aria-describedby={`${inputId}-help`} />
        {value?.url ? (
          <PreviewImage src={value.url} alt={`Vista previa: ${slot.label}`} />
        ) : (
          <span className={styles.dropPlaceholder}>
            <UploadFileOutlined />
            <strong>{value?.checking ? 'Revisando imagen…' : 'Arrastra una imagen'}</strong>
            <span>o haz clic para seleccionarla</span>
          </span>
        )}
        {value?.url && <span className={styles.changeImage}>Cambiar imagen</span>}
      </label>
      <div className={styles.slotFooter} id={`${inputId}-help`}>
        {value?.file ? (
          <>
            <span className={styles.fileDetails} title={value.file.name}>
              <strong>{value.file.name}</strong>
              <span>{value.width} × {value.height} · {fileSize(value.file.size)}</span>
            </span>
            <button className={styles.iconButton} type="button" onClick={() => onRemove(slot.key)} disabled={disabled} aria-label={`Quitar ${slot.label}`}><CloseOutlined fontSize="small" /></button>
          </>
        ) : <span>{slot.mobile ? '4:5' : '8:3'} · mín. {slot.width} × {slot.height} px</span>}
      </div>
      {value?.error && <p className={styles.slotError} role="alert">{value.error}</p>}
    </div>
  )
}

function VariantCard({ variant, onUpdate, onArchive, busy }) {
  const [selectedSlot, setSelectedSlot] = useState('esDesktop')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(variant.name)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const slot = SLOTS.find(item => item.key === selectedSlot)
  const image = variant.images?.[selectedSlot]
  const complete = SLOTS.every(item => variant.images?.[item.key]?.url)
  const archived = !!variant.archived
  const totalBytes = SLOTS.reduce((total, item) => total + (Number(variant.images?.[item.key]?.bytes) || 0), 0)

  async function saveName(event) {
    event.preventDefault()
    if (name.trim() && await onUpdate(variant.id, { name: name.trim() })) setEditing(false)
  }

  return (
    <article className={`${styles.variantCard} ${archived ? styles.archived : ''}`}>
      <header className={styles.cardHeader}>
        {editing ? (
          <form className={styles.renameForm} onSubmit={saveName}>
            <input value={name} maxLength={120} onChange={event => setName(event.target.value)} aria-label="Nombre de la variante" autoFocus disabled={busy} />
            <button type="submit" disabled={busy || !name.trim()} className={styles.smallButton}>Guardar</button>
            <button type="button" className={styles.iconButton} onClick={() => { setName(variant.name); setEditing(false) }} aria-label="Cancelar edición" disabled={busy}><CloseOutlined fontSize="small" /></button>
          </form>
        ) : (
          <div className={styles.cardTitle}>
            <h2>{variant.name}</h2>
            <button type="button" className={styles.iconButton} onClick={() => { setName(variant.name); setEditing(true) }} aria-label={`Cambiar nombre de ${variant.name}`} disabled={busy}><EditOutlined sx={{ fontSize: 17 }} /></button>
          </div>
        )}
        <span className={`${styles.status} ${variant.active && !archived ? styles.activeStatus : ''}`}>{archived ? 'Archivada' : variant.active ? 'En rotación' : 'Pausada'}</span>
      </header>
      <div className={`${styles.cardPreview} ${slot.mobile ? styles.mobilePreview : ''}`}>
        {image?.url ? <PreviewImage src={imageUrl(image.url)} alt={`${(slot.language === 'EN' ? variant.altEn : variant.altEs) || variant.name}, ${slot.label}`} loading="lazy" decoding="async" /> : <span>Imagen no disponible</span>}
        {image?.url && <a href={imageUrl(image.url)} target="_blank" rel="noreferrer" className={styles.previewLink} aria-label={`Abrir ${slot.label} de ${variant.name} en tamaño completo`}><OpenInNewOutlined sx={{ fontSize: 17 }} /></a>}
      </div>
      <div className={styles.slotSelector} aria-label={`Versiones de ${variant.name}`}>
        {SLOTS.map(item => {
          const media = variant.images?.[item.key]
          const Icon = item.mobile ? SmartphoneOutlined : DesktopWindowsOutlined
          return <button type="button" key={item.key} aria-pressed={selectedSlot === item.key} className={selectedSlot === item.key ? styles.selectedSlot : ''} onClick={() => setSelectedSlot(item.key)}>
            <span><Icon sx={{ fontSize: 17 }} /> {item.language}</span>
            <small>{item.mobile ? 'Móvil' : 'Escritorio'}</small>
            <strong>{media?.url ? fileSize(media.bytes) : 'Falta archivo'}</strong>
          </button>
        })}
      </div>
      <div className={styles.cardMeta}>
        <span><CheckCircleOutline sx={{ fontSize: 15 }} /> {complete ? '4 de 4 formatos' : 'Formatos incompletos'}</span>
        <span>{image?.width} × {image?.height} px · {fileSize(totalBytes)} en total</span>
      </div>
      <footer className={styles.cardActions}>
        {archived ? <button className={styles.secondaryButton} type="button" disabled={busy} onClick={() => onUpdate(variant.id, { archived: false })}><UnarchiveOutlined fontSize="small" /> Restaurar</button> : (
          <>
            <button type="button" role="switch" aria-checked={!!variant.active} aria-label={`Incluir ${variant.name} en la rotación`} disabled={busy || !complete} onClick={() => onUpdate(variant.id, { active: !variant.active })} className={styles.toggleButton}>
              <span className={`${styles.switch} ${variant.active ? styles.switchOn : ''}`} aria-hidden="true"><i /></span>
              {variant.active ? 'Activa en el home' : 'Activar en el home'}
            </button>
            <button className={styles.archiveButton} type="button" onClick={() => setConfirmArchive(true)} disabled={busy}><ArchiveOutlined sx={{ fontSize: 17 }} /> Archivar</button>
          </>
        )}
      </footer>
      {confirmArchive && <div className={styles.archiveConfirmation} role="group" aria-label={`Confirmar archivo de ${variant.name}`}>
        <span>Se retirará de la rotación. Podrás restaurarla después.</span>
        <div><button className={styles.smallButton} type="button" disabled={busy} onClick={async () => { if (await onArchive(variant.id)) setConfirmArchive(false) }}>Archivar variante</button><button className={styles.textButton} type="button" onClick={() => setConfirmArchive(false)} disabled={busy}>Cancelar</button></div>
      </div>}
    </article>
  )
}

export default function HeroBannersPage() {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [altEs, setAltEs] = useState('')
  const [altEn, setAltEn] = useState('')
  const [active, setActive] = useState(true)
  const [files, setFiles] = useState({})
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('all')
  const urls = useRef(new Set())
  const sequences = useRef({})
  const nameInput = useRef(null)

  const loadVariants = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/admin/hero-banners')
      setVariants(Array.isArray(response.data?.variants) ? response.data.variants : [])
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadVariants() }, [loadVariants])
  useEffect(() => {
    const allocatedUrls = urls.current
    return () => { for (const url of allocatedUrls) URL.revokeObjectURL(url) }
  }, [])
  useEffect(() => { if (formOpen) nameInput.current?.focus() }, [formOpen])

  function clearUrl(url) {
    if (url) { URL.revokeObjectURL(url); urls.current.delete(url) }
  }

  function removeFile(key) {
    sequences.current[key] = (sequences.current[key] || 0) + 1
    setFiles(current => {
      clearUrl(current[key]?.url)
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function selectFile(slot, file, missingMessage) {
    const sequence = (sequences.current[slot.key] || 0) + 1
    sequences.current[slot.key] = sequence
    const setResult = result => {
      if (sequences.current[slot.key] !== sequence) { clearUrl(result.url); return }
      setFiles(current => { clearUrl(current[slot.key]?.url); return { ...current, [slot.key]: result } })
    }
    if (!file) { setResult({ error: missingMessage || 'Selecciona una imagen.' }); return }
    if (!/\.(png|jpe?g|webp|avif)$/i.test(file.name) || (file.type && !/^image\/(png|jpeg|webp|avif)$/.test(file.type))) {
      setResult({ error: 'Usa una imagen PNG, JPG, WebP o AVIF.' }); return
    }
    if (file.size > MAX_FILE_BYTES) { setResult({ error: 'La imagen supera el máximo de 10 MB.' }); return }
    setResult({ checking: true })
    const url = URL.createObjectURL(file)
    urls.current.add(url)
    try {
      const dimensions = await new Promise((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
        image.onerror = () => reject(new Error('No se pudo abrir la imagen. Prueba con otro archivo.'))
        image.src = url
      })
      const { width, height } = dimensions
      if (width * height > 40_000_000) throw new Error('La imagen supera los 40 megapíxeles permitidos.')
      if (width < slot.width || height < slot.height) throw new Error(`Necesitas al menos ${slot.width} × ${slot.height} px para este formato.`)
      if (Math.abs((width / height) / slot.ratio - 1) > 0.03) throw new Error(`La proporción debe ser ${slot.mobile ? '4:5 (vertical)' : '8:3 (panorámica)'}. Ajusta el diseño antes de subirlo.`)
      setResult({ file, url, width, height })
    } catch (validationError) { clearUrl(url); setResult({ error: validationError.message }) }
  }

  const completeCount = SLOTS.filter(slot => files[slot.key]?.file && !files[slot.key]?.error).length
  const readyToSave = !!name.trim() && completeCount === 4 && !uploading
  const available = variants.filter(variant => !variant.archived)
  const activeCount = available.filter(variant => variant.active).length
  const visible = variants.filter(variant => filter === 'archived' ? variant.archived : !variant.archived && (filter === 'all' || (filter === 'active' ? variant.active : !variant.active)))

  async function submit(event) {
    event.preventDefault()
    if (!readyToSave) return
    setUploading(true)
    setProgress(0)
    setError('')
    setNotice('')
    try {
      const data = new FormData()
      data.append('name', name.trim())
      data.append('active', String(active))
      data.append('altEs', altEs.trim())
      data.append('altEn', altEn.trim())
      SLOTS.forEach(slot => data.append(slot.key, files[slot.key].file))
      const response = await axios.post('/admin/hero-banners', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: event => { if (event.total) setProgress(Math.round((event.loaded / event.total) * 100)) },
        timeout: 180000,
      })
      if (response.data?.variant) setVariants(current => [response.data.variant, ...current])
      else await loadVariants()
      for (const url of urls.current) URL.revokeObjectURL(url)
      urls.current.clear()
      setFiles({})
      setName('')
      setAltEs('')
      setAltEn('')
      setActive(true)
      setFormOpen(false)
      setFilter('all')
      setNotice(active ? 'Variante creada con sus cuatro imágenes y añadida a la rotación.' : 'Variante creada con sus cuatro imágenes. Está pausada hasta que la actives.')
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setUploading(false) }
  }

  async function updateVariant(id, data) {
    setBusyId(id)
    setError('')
    setNotice('')
    try {
      const response = await axios.patch(`/admin/hero-banners/${encodeURIComponent(id)}`, data)
      if (response.data?.variant) setVariants(current => current.map(variant => variant.id === id ? response.data.variant : variant))
      else await loadVariants()
      setNotice(data.archived === false ? 'Variante restaurada. Puedes activarla cuando quieras.' : 'Variante actualizada.')
      return true
    } catch (requestError) { setError(errorMessage(requestError)); return false }
    finally { setBusyId(null) }
  }

  async function archiveVariant(id) {
    setBusyId(id)
    setError('')
    setNotice('')
    try {
      const response = await axios.delete(`/admin/hero-banners/${encodeURIComponent(id)}`)
      setVariants(current => current.map(variant => variant.id === id ? (response.data?.variant || { ...variant, archived: true, active: false }) : variant))
      setNotice('Variante archivada y retirada de la rotación.')
      return true
    } catch (requestError) { setError(errorMessage(requestError)); return false }
    finally { setBusyId(null) }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}><PanoramaOutlined sx={{ fontSize: 18 }} /> PUBLICACIONES / HOME</span>
          <h1>Banners del home</h1>
          <p>Gestiona los diseños que aparecen al visitar la portada, en cada idioma y pantalla.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button" onClick={loadVariants} disabled={loading || uploading || !!busyId} aria-label="Actualizar variantes"><RefreshOutlined fontSize="small" /> Actualizar</button>
          <button className={styles.primaryButton} type="button" onClick={() => setFormOpen(current => !current)} disabled={uploading} aria-expanded={formOpen} aria-controls="hero-banner-create"><AddOutlined fontSize="small" /> {formOpen ? 'Cerrar formulario' : 'Nueva variante'}</button>
        </div>
      </header>

      <div className={styles.overview}>
        <div><span className={styles.liveDot} /><strong>{activeCount}</strong><span>en rotación</span></div>
        <div><strong>{available.length}</strong><span>variantes disponibles</span></div>
        <p>Cada variante necesita <strong>4 imágenes</strong>: ES y EN, en escritorio y móvil.</p>
      </div>

      {error && <div className={styles.errorMessage} role="alert"><span>{error}</span><button type="button" className={styles.iconButton} aria-label="Cerrar mensaje de error" onClick={() => setError('')}><CloseOutlined fontSize="small" /></button></div>}
      {notice && <div className={styles.notice} role="status"><CheckCircleOutline fontSize="small" />{notice}</div>}

      {formOpen && <form id="hero-banner-create" className={styles.createForm} onSubmit={submit} aria-busy={uploading}>
        <div className={styles.formHeader}>
          <div><span className={styles.eyebrow}>NUEVO DISEÑO</span><h2>Las cuatro versiones, juntas</h2><p>Sube el mismo diseño adaptado a cada idioma y formato. Se optimizará al guardarlo.</p></div>
          <span className={`${styles.completion} ${completeCount === 4 ? styles.allComplete : ''}`}><CheckCircleOutline fontSize="small" /> {completeCount} / 4 completas</span>
        </div>
        <div className={styles.nameRow}>
          <label className={styles.nameField}>Nombre de la variante<input ref={nameInput} value={name} onChange={event => setName(event.target.value)} placeholder="Ej. Casa, cocina y jardín" maxLength={120} required disabled={uploading} /></label>
          <label className={styles.activeField}><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} disabled={uploading} /><span>Activar al guardar<small>Incluir el diseño en la rotación del home.</small></span></label>
        </div>
        <div className={styles.uploadGrid}>{SLOTS.map(slot => <FileSlot key={slot.key} slot={slot} value={files[slot.key]} onSelect={selectFile} onRemove={removeFile} disabled={uploading} />)}</div>
        <details className={styles.accessibilityFields}>
          <summary>Descripción de las imágenes para lectores de pantalla <span>Opcional</span></summary>
          <p>Describe brevemente los objetos que aparecen. Si lo dejas vacío, se usará una descripción a partir del nombre.</p>
          <div>
            <label className={styles.nameField}>Español<textarea value={altEs} onChange={event => setAltEs(event.target.value)} maxLength={240} rows={2} disabled={uploading} placeholder="Ej. Maceta con autoriego y accesorios impresos para casa y cocina." /></label>
            <label className={styles.nameField}>Inglés<textarea value={altEn} onChange={event => setAltEn(event.target.value)} maxLength={240} rows={2} disabled={uploading} placeholder="E.g. Self-watering planter and 3D-printed home and kitchen accessories." /></label>
          </div>
        </details>
        <div className={styles.formFooter}>
          <span>PNG, JPG, WebP o AVIF · Hasta 10 MB por archivo.<br />Escritorio 8:3 · Móvil 4:5. Los cuatro archivos son obligatorios.</span>
          <button className={styles.primaryButton} type="submit" disabled={!readyToSave}><UploadFileOutlined fontSize="small" /> {uploading ? progress < 100 ? `Subiendo ${progress}%…` : 'Optimizando imágenes…' : `Guardar variante${completeCount < 4 ? ` (${completeCount}/4)` : ''}`}</button>
        </div>
        {uploading && <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Subida de las cuatro imágenes"><span style={{ width: `${progress}%` }} /></div>}
      </form>}

      <div className={styles.galleryHeader}>
        <h2>Biblioteca de diseños</h2>
        <div className={styles.filters} aria-label="Filtrar variantes">{[['all', 'Todas'], ['active', 'En rotación'], ['paused', 'Pausadas'], ['archived', 'Archivadas']].map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={filter === key ? styles.activeFilter : ''}>{label}</button>)}</div>
      </div>

      {loading ? <div className={styles.emptyState} role="status"><span className={styles.spinner} /><h3>Cargando variantes…</h3></div> : visible.length ? <div className={styles.gallery}>{visible.map(variant => <VariantCard key={variant.id} variant={variant} onUpdate={updateVariant} onArchive={archiveVariant} busy={!!busyId} />)}</div> : <div className={styles.emptyState}><PanoramaOutlined /><h3>{filter === 'all' ? 'Tu próxima portada empieza aquí' : 'No hay variantes en este apartado'}</h3><p>{filter === 'all' ? 'Añade un diseño con sus cuatro versiones para empezar a rotarlo en el home.' : 'Puedes cambiar el filtro para ver los demás diseños.'}</p>{filter === 'all' && <button type="button" className={styles.primaryButton} onClick={() => setFormOpen(true)}><AddOutlined fontSize="small" /> Crear primera variante</button>}</div>}
    </div>
  )
}
