'use client'

import React, { useEffect, useState } from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'

const PAGE_SIZE = 25

const ESTADOS = [
  { key: '', nombre: 'Todos' },
  { key: 'QUEUED', nombre: 'En cola' },
  { key: 'SENT', nombre: 'Enviados' },
  { key: 'FAILED', nombre: 'Fallidos' },
  { key: 'SKIPPED', nombre: 'Descartados' },
]

const CLASE_ESTADO = { QUEUED: 't-wait', SENT: 't-on', FAILED: 't-fail', SKIPPED: 't-off' }
const TEXTO_ESTADO = { QUEUED: 'En cola', SENT: 'Enviado', FAILED: 'Fallido', SKIPPED: 'Descartado' }

const TIPOS = [
  { key: '', nombre: 'Todos los tipos' },
  { key: 'WELCOME_1', nombre: '1 · Bienvenida' },
  { key: 'WELCOME_2', nombre: '2 · Premium' },
  { key: 'WELCOME_3', nombre: '3 · Top descargas' },
  { key: 'WELCOME_4', nombre: '4 · Planes' },
  { key: 'REENGAGE', nombre: 'Reenganche' },
  { key: 'PREMIUM_EXPIRING', nombre: 'Premium vence' },
  { key: 'PREMIUM_EXPIRED', nombre: 'Premium venció' },
  { key: 'NEWSLETTER', nombre: 'Novedades' },
  { key: 'CAMPAIGN', nombre: 'Campañas' },
]

const nombreTipo = (envio) =>
  envio.campaignId ? `Campaña ${envio.campaignId}` : TIPOS.find((t) => t.key === envio.kind)?.nombre || envio.kind

const hora = (valor) =>
  valor
    ? new Date(valor).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

export default function MarketingEnvios() {
  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')
  const [campana, setCampana] = useState('')
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  // Se puede llegar desde una campaña con ?campaign=<id>.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('campaign')
    if (id) setCampana(id)
  }, [])

  const { data, error, loading, reload } = useMarketingData(
    () =>
      emailMarketingService.sends({
        status: estado,
        kind: tipo,
        q: busqueda,
        campaign: campana,
        page: pagina,
        pageSize: PAGE_SIZE,
      }),
    [estado, tipo, busqueda, campana, pagina]
  )

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const elegir = (setter) => (valor) => {
    setter(valor)
    setPagina(1)
  }

  const buscar = (e) => {
    e.preventDefault()
    setBusqueda(texto.trim())
    setPagina(1)
  }

  return (
    <section className="mk-card">
      <div className="mk-card-title">
        <h2>
          Envíos
          <Ayuda texto="Cada correo que el motor programó: los que esperan su turno, los enviados, los que fallaron y los descartados (por baja, cuenta inactiva o porque ya no aplicaban). Apertura y clic llegan desde Brevo." />
        </h2>
        <button type="button" className="mk-btn" onClick={reload} disabled={loading}>Actualizar</button>
      </div>

      <div className="mk-engine-actions" style={{ marginBottom: '1rem' }}>
        {ESTADOS.map((e) => (
          <button
            key={e.key || 'todos'}
            type="button"
            className={`mk-btn${estado === e.key ? ' is-primary' : ''}`}
            onClick={() => elegir(setEstado)(e.key)}
          >
            {e.nombre}
            {e.key && data ? ` (${data.counts[e.key] ?? 0})` : ''}
          </button>
        ))}
      </div>

      <form className="mk-engine-actions" style={{ marginBottom: '1rem' }} onSubmit={buscar}>
        <select className="mk-btn" value={tipo} onChange={(e) => elegir(setTipo)(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.key || 'todos'} value={t.key}>{t.nombre}</option>
          ))}
        </select>
        <input
          type="search"
          className="mk-btn"
          placeholder="Buscar por correo"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <button type="submit" className="mk-btn">Buscar</button>
        {campana && (
          <button type="button" className="mk-btn" onClick={() => elegir(setCampana)('')}>
            Campaña {campana} ✕
          </button>
        )}
      </form>

      <MarketingStatus loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>
                  Hora
                  <Ayuda texto="Cuándo se envió; si aún está en cola, cuándo le toca salir." />
                </th>
                <th>Abrió</th>
                <th>Clic</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id}>
                  <td>{s.email || '—'}</td>
                  <td>{nombreTipo(s)}</td>
                  <td><span className={`mk-tag ${CLASE_ESTADO[s.status]}`}>{TEXTO_ESTADO[s.status]}</span></td>
                  <td>{hora(s.sentAt || s.scheduledFor)}</td>
                  <td>{s.openedAt ? 'Sí' : '—'}</td>
                  <td>{s.clickedAt ? 'Sí' : '—'}</td>
                  <td style={{ color: '#a0aec0', maxWidth: 260 }}>
                    {s.bouncedAt ? 'Rebotó' : s.error || (s.attempts > 1 ? `${s.attempts} intentos` : '')}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={7} style={{ color: '#a0aec0' }}>No hay envíos con estos filtros.</td></tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <small style={{ color: '#a0aec0' }}>
              {data.total} envíos · página {pagina} de {totalPaginas}
            </small>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="mk-btn" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                Anterior
              </button>
              <button type="button" className="mk-btn" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
