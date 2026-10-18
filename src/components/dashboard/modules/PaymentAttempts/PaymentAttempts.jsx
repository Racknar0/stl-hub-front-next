'use client'

import React from 'react'
import './PaymentAttempts.scss'
import HttpService from '@/services/HttpService'
import UserDetailModal from '../UserDetailModal/UserDetailModal'
import {
  FUNNEL_LABELS,
  OUTCOMES,
  eventText,
  funnelStages,
  isChargedUnsaved,
  methodText,
  outcomeOf,
  reasonText,
} from './paymentAttemptLabels'

const RANGES = [
  { days: 1, label: 'Hoy' },
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
]
const PROVIDERS = [
  { value: '', label: 'Todas' },
  { value: 'MERCADOPAGO', label: 'MercadoPago' },
  { value: 'PAYPAL', label: 'PayPal' },
]
const PROVIDER_LABEL = { MERCADOPAGO: 'MercadoPago', PAYPAL: 'PayPal' }

const ymd = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const fmtMoney = (amount, currency) => (amount ? `${currency || ''} ${Number(amount).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`.trim() : '—')
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0)

function buildFunnel(items) {
  const counts = FUNNEL_LABELS.map(() => 0)
  for (const a of items) funnelStages(a).forEach((reached, i) => { if (reached) counts[i] += 1 })
  return counts
}

function buildAlerts(items) {
  const now = Date.now()
  const alerts = []
  const charged = items.filter(isChargedUnsaved)
  if (charged.length) {
    alerts.push({ tone: 'bad', text: `${charged.length} pago(s) de PayPal se cobraron pero falló activar la suscripción. Revisa a mano: ${charged.map((a) => a.email || `#${a.id}`).join(', ')}` })
  }
  const ourErrors = items.filter((a) => outcomeOf(a) === 'ERROR' && !isChargedUnsaved(a))
  if (ourErrors.length) alerts.push({ tone: 'bad', text: `${ourErrors.length} intento(s) con error (orden que no se creó o confirmación que falló).` })
  const oldPending = items.filter((a) => outcomeOf(a) === 'PENDING' && now - new Date(a.createdAt).getTime() > 24 * 3600e3)
  if (oldPending.length) alerts.push({ tone: 'wait', text: `${oldPending.length} pago(s) pendiente(s) hace más de 24 h (PSE o efectivo sin confirmar).` })
  const rejectedByUser = new Map()
  for (const a of items) {
    if (outcomeOf(a) !== 'REJECTED' || !a.userId) continue
    rejectedByUser.set(a.userId, (rejectedByUser.get(a.userId) || 0) + 1)
  }
  const repeat = [...rejectedByUser.values()].filter((n) => n >= 2).length
  if (repeat) alerts.push({ tone: 'wait', text: `${repeat} usuario(s) con 2 o más rechazos: quizá necesitan ayuda u otro medio de pago.` })
  return alerts
}

const PaymentAttempts = () => {
  const http = React.useMemo(() => new HttpService(), [])
  const [days, setDays] = React.useState(7)
  const [provider, setProvider] = React.useState('')
  const [outcomeFilter, setOutcomeFilter] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [items, setItems] = React.useState([])
  const [expanded, setExpanded] = React.useState(null)
  const [selectedUserId, setSelectedUserId] = React.useState(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - (days - 1) * 24 * 3600e3)
      const qs = new URLSearchParams({ from: ymd(from), to: ymd(to), limit: '500' })
      if (provider) qs.set('provider', provider)
      const res = await http.getData(`/payments/attempts?${qs.toString()}`)
      setItems(res?.data?.items || [])
    } catch (e) {
      console.error('PaymentAttempts fetch error', e)
      setError('No se pudieron cargar los intentos de pago.')
    } finally {
      setLoading(false)
    }
  }, [http, days, provider])

  React.useEffect(() => { load() }, [load])

  const counts = React.useMemo(() => {
    const c = {}
    for (const a of items) { const o = outcomeOf(a); c[o] = (c[o] || 0) + 1 }
    return c
  }, [items])

  const funnels = React.useMemo(() => {
    const groups = provider ? [provider] : ['MERCADOPAGO', 'PAYPAL']
    return groups.map((p) => ({ provider: p, counts: buildFunnel(items.filter((a) => a.provider === p)) }))
  }, [items, provider])

  const alerts = React.useMemo(() => buildAlerts(items), [items])
  const visible = outcomeFilter ? items.filter((a) => outcomeOf(a) === outcomeFilter) : items
  const total = items.length
  const paid = counts.APPROVED || 0

  const kpis = [
    { key: '', label: 'Intentos', value: total },
    { key: 'APPROVED', label: 'Pagados', value: paid, tone: 'ok', sub: `${pct(paid, total)}% de conversión` },
    { key: 'REJECTED', label: 'Rechazados', value: counts.REJECTED || 0, tone: 'bad' },
    { key: 'PENDING', label: 'Pendientes', value: counts.PENDING || 0, tone: 'wait' },
    { key: 'ABANDONED', label: 'Abandonaron', value: counts.ABANDONED || 0, tone: 'gone' },
    { key: 'ERROR', label: 'Errores', value: counts.ERROR || 0, tone: 'bad' },
    { key: 'IN_PROGRESS', label: 'En curso (<1 h)', value: counts.IN_PROGRESS || 0, tone: 'info' },
  ]

  return (
    <section className="payment-attempts">
      <header className="pa-header">
        <div>
          <h3>Intentos de pago</h3>
          <p>Cada vez que alguien elige PayPal o MercadoPago: hasta dónde llegó y por qué no terminó.</p>
        </div>
        <div className="pa-controls">
          <div className="pa-seg" role="group" aria-label="Rango">
            {RANGES.map((r) => (
              <button key={r.days} type="button" className={days === r.days ? 'is-active' : ''} onClick={() => setDays(r.days)}>{r.label}</button>
            ))}
          </div>
          <div className="pa-seg" role="group" aria-label="Pasarela">
            {PROVIDERS.map((p) => (
              <button key={p.value} type="button" className={provider === p.value ? 'is-active' : ''} onClick={() => setProvider(p.value)}>{p.label}</button>
            ))}
          </div>
          <button type="button" className="pa-refresh" onClick={load} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button>
        </div>
      </header>

      {error && <div className="pa-alert bad">{error}</div>}

      <div className="pa-kpis">
        {kpis.map((k) => (
          <button
            type="button"
            key={k.label}
            className={`pa-kpi ${k.tone || ''} ${outcomeFilter === k.key ? 'is-active' : ''}`}
            onClick={() => setOutcomeFilter(outcomeFilter === k.key ? '' : k.key)}
            title="Filtrar la lista"
          >
            <span className="pa-kpi-label">{k.label}</span>
            <span className="pa-kpi-value">{loading ? '…' : k.value}</span>
            {k.sub && <span className="pa-kpi-sub">{k.sub}</span>}
          </button>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="pa-alerts">
          {alerts.map((a, i) => <div key={i} className={`pa-alert ${a.tone}`}>{a.text}</div>)}
        </div>
      )}

      <div className="pa-funnels">
        {funnels.map((f) => (
          <div key={f.provider} className="pa-funnel">
            <h4>Embudo {PROVIDER_LABEL[f.provider]}</h4>
            {FUNNEL_LABELS.map((label, i) => {
              const n = f.counts[i]
              const base = f.counts[0]
              const prev = i > 0 ? f.counts[i - 1] : n
              return (
                <div key={label} className="pa-funnel-row">
                  <span className="pa-funnel-label">{label}</span>
                  <div className="pa-funnel-track">
                    <div className={`pa-funnel-bar ${i === FUNNEL_LABELS.length - 1 ? 'ok' : ''}`} style={{ width: `${base ? Math.max((n / base) * 100, n ? 2 : 0) : 0}%` }} />
                  </div>
                  <span className="pa-funnel-num">{n}</span>
                  <span className="pa-funnel-drop">{i > 0 && prev > n ? `−${prev - n}` : ''}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="pa-list">
        <div className="pa-list-head">
          <h4>Intentos {outcomeFilter ? `· ${OUTCOMES[outcomeFilter]?.label || ''}` : ''}</h4>
          <span>{visible.length} de {total}</span>
        </div>
        {!loading && visible.length === 0 && <div className="pa-empty">No hay intentos en este rango.</div>}
        <ul>
          {visible.map((a) => {
            const outcome = outcomeOf(a)
            const o = OUTCOMES[outcome]
            const isOpen = expanded === a.id
            return (
              <li key={a.id} className={isOpen ? 'is-open' : ''}>
                <button type="button" className="pa-row" onClick={() => setExpanded(isOpen ? null : a.id)} aria-expanded={isOpen}>
                  <span className="pa-col-date">{fmtDate(a.createdAt)}</span>
                  <span className="pa-col-user">
                    <strong>{a.email || 'sin correo'}</strong>
                    <small>{PROVIDER_LABEL[a.provider]} · plan {a.planId} · {fmtMoney(a.amount, a.currency)}</small>
                  </span>
                  <span className={`pa-pill ${o.tone}`}>{isChargedUnsaved(a) ? 'Cobrado · revisar' : o.label}</span>
                  <span className="pa-col-reason">{reasonText(a)}</span>
                </button>
                {isOpen && (
                  <div className="pa-detail">
                    <div className="pa-meta">
                      <span>Intento #{a.id}</span>
                      {methodText(a.paymentMethod) && <span>Medio: {methodText(a.paymentMethod)}</span>}
                      {a.deviceType && <span>Dispositivo: {a.deviceType}</span>}
                      {(a.utmSource || a.utmCampaign) && <span>Origen: {[a.utmSource, a.utmCampaign].filter(Boolean).join(' / ')}</span>}
                      {a.externalPaymentId && <span>ID pago: {a.externalPaymentId}</span>}
                      {a.userId && (
                        <button type="button" className="pa-link" onClick={() => setSelectedUserId(a.userId)}>Ver usuario</button>
                      )}
                    </div>
                    <ol className="pa-timeline">
                      {(a.events || []).map((ev) => {
                        const t = eventText(ev)
                        const tone = ev.status === 'ERROR' || ev.status === 'REJECTED' || ['rejected', 'declined'].includes(String(ev.status).toLowerCase()) ? 'bad' : ['approved', 'completed'].includes(String(ev.status).toLowerCase()) ? 'ok' : ''
                        return (
                          <li key={ev.id} className={tone}>
                            <span className="pa-tl-time">{fmtTime(ev.createdAt)}</span>
                            <span className="pa-tl-text">{t.text}</span>
                            <span className="pa-tl-src">{t.source}</span>
                          </li>
                        )
                      })}
                    </ol>
                    {a.lastError && <pre className="pa-error">{a.lastError}</pre>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <UserDetailModal open={Boolean(selectedUserId)} onClose={() => setSelectedUserId(null)} userId={selectedUserId} />
    </section>
  )
}

export default PaymentAttempts
