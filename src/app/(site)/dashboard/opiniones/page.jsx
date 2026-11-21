'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { IconButton, LinearProgress, Tooltip, Rating, TextField } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline'
import BlockOutlined from '@mui/icons-material/BlockOutlined'
import StarOutline from '@mui/icons-material/StarOutline'
import Star from '@mui/icons-material/Star'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import UndoOutlined from '@mui/icons-material/UndoOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { adminListReviews, adminUpdateReview, adminDeleteReview } from '@/services/ReviewService'
import { errorAlert } from '@/helpers/alerts'
import styles from './opiniones.module.scss'

const TABS = [
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'APPROVED', label: 'Aprobadas' },
  { key: 'REJECTED', label: 'Rechazadas' },
]

// Solo las aprobadas con 4-5 estrellas, texto y consentimiento salen en la portada
const isPublishable = r => r.rating >= 4 && r.consent && Boolean(r.text)

function ReviewRow({ review: r, busy, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(r.text || '')
  const [name, setName] = useState(r.displayName || '')
  const date = new Date(r.createdAt)
  const publishable = isPublishable(r)
  const reasons = [r.rating < 4 && 'menos de 4 ★', !r.consent && 'sin consentimiento', !r.text && 'sin texto'].filter(Boolean)

  const save = async () => {
    const ok = await onUpdate(r.id, { text, displayName: name })
    if (ok) setEditing(false)
  }

  return <article className={`${styles.row} ${publishable ? '' : styles.private}`}>
    <div className={styles.rowMain}>
      <div className={styles.content}>
        <div className={styles.titleLine}>
          <Rating value={r.rating} readOnly size="small" />
          <span className={styles.name}>{r.displayName}</span>
          {r.featured && <span className={styles.badgeFeatured}>Destacada</span>}
          {!publishable && <span className={styles.badgePrivate} title={reasons.join(', ')}>Feedback privado · {reasons.join(', ')}</span>}
        </div>
        {editing
          ? <div className={styles.editor}>
            <TextField size="small" label="Nombre" value={name} onChange={e => setName(e.target.value.slice(0, 60))} />
            <TextField size="small" label="Texto" value={text} multiline minRows={2} onChange={e => setText(e.target.value.slice(0, 500))} />
          </div>
          : <p className={styles.text}>{r.text || <em>(sin texto)</em>}</p>}
        <span className={styles.meta}>
          {r.user?.email || `usuario ${r.userId}`} · {r.downloads} descargas · {r.language?.toUpperCase()}{r.user?.registerCountry ? ` · ${r.user.registerCountry}` : ''}
        </span>
      </div>
      <div className={styles.actions}>
        {!Number.isNaN(date.getTime()) && <time dateTime={date.toISOString()} className={styles.date}>{date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</time>}
        {editing
          ? <>
            <Tooltip title="Guardar"><span><IconButton size="small" aria-label="Guardar cambios" disabled={busy} onClick={save}><SaveOutlined fontSize="small" /></IconButton></span></Tooltip>
            <Tooltip title="Cancelar"><span><IconButton size="small" aria-label="Cancelar edición" disabled={busy} onClick={() => { setEditing(false); setText(r.text || ''); setName(r.displayName || '') }}><CloseIcon fontSize="small" /></IconButton></span></Tooltip>
          </>
          : <Tooltip title="Corregir erratas"><span><IconButton size="small" aria-label="Editar opinión" disabled={busy} onClick={() => setEditing(true)}><EditOutlined fontSize="small" /></IconButton></span></Tooltip>}
        {r.status !== 'APPROVED' && <Tooltip title="Aprobar"><span><IconButton size="small" className={styles.approve} aria-label="Aprobar opinión" disabled={busy} onClick={() => onUpdate(r.id, { status: 'APPROVED' })}><CheckCircleOutline fontSize="small" /></IconButton></span></Tooltip>}
        {r.status !== 'REJECTED' && <Tooltip title="Rechazar"><span><IconButton size="small" className={styles.reject} aria-label="Rechazar opinión" disabled={busy} onClick={() => onUpdate(r.id, { status: 'REJECTED', featured: false })}><BlockOutlined fontSize="small" /></IconButton></span></Tooltip>}
        {r.status !== 'PENDING' && <Tooltip title="Devolver a pendientes"><span><IconButton size="small" aria-label="Devolver a pendientes" disabled={busy} onClick={() => onUpdate(r.id, { status: 'PENDING' })}><UndoOutlined fontSize="small" /></IconButton></span></Tooltip>}
        {r.status === 'APPROVED' && <Tooltip title={r.featured ? 'Quitar de destacadas' : 'Destacar en portada'}><span><IconButton size="small" className={styles.feature} aria-label={r.featured ? 'Quitar de destacadas' : 'Destacar en portada'} disabled={busy} onClick={() => onUpdate(r.id, { featured: !r.featured })}>{r.featured ? <Star fontSize="small" /> : <StarOutline fontSize="small" />}</IconButton></span></Tooltip>}
        <Tooltip title="Eliminar"><span><IconButton size="small" aria-label="Eliminar opinión" disabled={busy} onClick={() => onDelete(r.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
      </div>
    </div>
  </article>
}

export default function ReviewsPage() {
  const [tab, setTab] = useState('PENDING')
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminListReviews(tab)
      setItems(res.data?.items || [])
      setCounts(res.data?.counts || {})
    } catch { await errorAlert('Error', 'No se pudieron cargar las opiniones') }
    finally { setLoading(false) }
  }, [tab])
  useEffect(() => { fetchAll() }, [fetchAll])

  const update = async (id, data) => {
    setSaving(true)
    try { await adminUpdateReview(id, data); await fetchAll(); return true }
    catch { await errorAlert('Error', 'No se pudo actualizar la opinión'); return false }
    finally { setSaving(false) }
  }
  const remove = async id => {
    if (!window.confirm('¿Eliminar esta opinión? El usuario podrá volver a opinar.')) return
    setSaving(true)
    try { await adminDeleteReview(id); await fetchAll() }
    catch { await errorAlert('Error', 'No se pudo eliminar la opinión') }
    finally { setSaving(false) }
  }

  const busy = loading || saving
  return <section className={styles.page} aria-label="Opiniones">
    <nav className={styles.tabs} role="tablist" aria-label="Estado de las opiniones">
      {TABS.map(({ key, label }) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={`${styles.tabButton} ${tab === key ? styles.activeTab : ''}`} onClick={() => setTab(key)}>
        {label}<span className={key === 'PENDING' && counts[key] ? styles.tabPending : styles.tabCount}>{counts[key] || 0}</span>
      </button>)}
    </nav>
    <div className={styles.toolbar}>
      <p className={styles.help}>Salen en «Lo que dicen los makers» las aprobadas con 4-5 ★, texto y consentimiento (las destacadas primero). Las demás quedan como feedback privado.</p>
      <Tooltip title="Actualizar"><span><IconButton size="small" aria-label="Actualizar opiniones" onClick={fetchAll} disabled={busy}><RefreshIcon fontSize="small" /></IconButton></span></Tooltip>
    </div>
    {loading && <LinearProgress sx={{ height: 2, bgcolor: 'transparent' }} />}
    <div className={styles.list} role="tabpanel" aria-busy={busy}>
      {!loading && !items.length && <div className={styles.empty}>No hay opiniones en este estado.</div>}
      {items.map(review => <ReviewRow key={`${review.id}-${review.updatedAt}`} review={review} busy={busy} onUpdate={update} onDelete={remove} />)}
    </div>
  </section>
}
