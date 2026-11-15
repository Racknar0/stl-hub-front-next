'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'
import Reenganche from './Reenganche'

const AUDIENCIAS = [
  { key: 'ACTIVE', nombre: 'Activos', ayuda: 'Dieron alguna señal en los últimos 60 días.' },
  { key: 'DORMANT', nombre: 'Dormidos', ayuda: 'Llevan tiempo sin dar señales. Mejor usa el reenganche, que está pensado para ellos.' },
  { key: 'NEW', nombre: 'Nuevos', ayuda: 'Se registraron hace poco.' },
  { key: 'ALL', nombre: 'Todos', ayuda: 'Nuevos, activos y dormidos. Nunca incluye a quien se dio de baja.' },
]
const PLANES = [
  { key: 'all', nombre: 'Gratis y Premium' },
  { key: 'free', nombre: 'Solo gratis' },
  { key: 'premium', nombre: 'Solo Premium' },
]

const ESTADOS = {
  DRAFT: { texto: 'Borrador', clase: 't-off' },
  SCHEDULED: { texto: 'Programada', clase: 't-wait' },
  LAUNCHED: { texto: 'Lanzada', clase: 't-on' },
  CANCELLED: { texto: 'Cancelada', clase: 't-fail' },
}

const VACIA = { name: '', templateId: '', audience: 'ACTIVE', plan: 'all', dailyCap: 100 }

const fecha = (v) =>
  v ? new Date(v).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

const mensajeError = (e, defecto) => e?.response?.data?.error || defecto

export default function MarketingCampanas() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.campaigns(), [])
  const [plantillas, setPlantillas] = useState([])
  const [editando, setEditando] = useState(null) // null = cerrado; { id?, ...campos }
  const [alcance, setAlcance] = useState(null)
  const [programar, setProgramar] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    emailMarketingService
      .templates()
      .then((r) => setPlantillas(r.items || []))
      .catch(() => setPlantillas([]))
  }, [])

  // Al cambiar audiencia o plan se recalcula a cuántos llegaría.
  useEffect(() => {
    if (!editando) return
    let vivo = true
    setAlcance(null)
    emailMarketingService
      .campaignAudience(editando.audience, editando.plan)
      .then((r) => vivo && setAlcance(r.count))
      .catch(() => vivo && setAlcance(null))
    return () => {
      vivo = false
    }
  }, [editando?.audience, editando?.plan]) // eslint-disable-line react-hooks/exhaustive-deps

  const nombrePlantilla = (id) => plantillas.find((p) => p.id === id)?.name || `Plantilla ${id}`

  const abrir = (campana) => {
    setAviso('')
    setProgramar('')
    setEditando(campana ? { ...campana } : { ...VACIA })
  }

  const cambiar = (campo) => (e) => setEditando((c) => ({ ...c, [campo]: e.target.value }))

  const cuerpo = () => ({
    name: editando.name,
    templateId: Number(editando.templateId),
    audience: editando.audience,
    plan: editando.plan,
    dailyCap: Number(editando.dailyCap),
  })

  // Ejecuta una acción mostrando el estado y el error si falla.
  const ejecutar = async (accion, errorPorDefecto, alTerminar) => {
    setOcupado(true)
    setAviso('')
    try {
      const r = await accion()
      if (alTerminar) alTerminar(r)
      await reload()
    } catch (e) {
      setAviso(mensajeError(e, errorPorDefecto))
    } finally {
      setOcupado(false)
    }
  }

  const guardar = () =>
    ejecutar(
      () => (editando.id ? emailMarketingService.updateCampaign(editando.id, cuerpo()) : emailMarketingService.createCampaign(cuerpo())),
      'No se pudo guardar la campaña',
      (r) => {
        setEditando(null)
        setAviso(`Campaña «${r.campaign.name}» guardada como borrador.`)
      }
    )

  const probar = (id) =>
    ejecutar(() => emailMarketingService.testCampaign(id), 'No se pudo enviar la prueba', (r) =>
      setAviso(`Prueba enviada a ${r.to}.`)
    )

  const lanzar = (campana, cuando = null) => {
    const destino = cuando ? `programarla para ${fecha(cuando)}` : 'lanzarla ahora'
    const total = campana.id === editando?.id && alcance !== null ? ` a unos ${alcance} contactos` : ''
    if (!window.confirm(`Vas a ${destino}${total}. Los correos salen al ritmo de ${campana.dailyCap} por día, dentro del cupo del motor. ¿Continuar?`)) return
    ejecutar(() => emailMarketingService.launchCampaign(campana.id, cuando), 'No se pudo lanzar la campaña', (r) => {
      setEditando(null)
      setAviso(
        r.campaign.status === 'SCHEDULED'
          ? `Programada para ${fecha(r.campaign.scheduledAt)}. Se lanzará sola con el motor encendido.`
          : `${r.campaign.queued} correos en cola.` +
              (r.engineEnabled ? '' : ' El motor está apagado: no saldrán hasta que lo enciendas.')
      )
    })
  }

  const cancelar = (campana) => {
    if (!window.confirm(`Se descartan los correos que sigan en cola de «${campana.name}». Lo ya enviado no se puede deshacer. ¿Cancelar la campaña?`)) return
    ejecutar(() => emailMarketingService.cancelCampaign(campana.id), 'No se pudo cancelar la campaña', (r) =>
      setAviso(`Campaña cancelada. ${r.dropped ?? 0} correos descartados.`)
    )
  }

  const borrar = (campana) => {
    if (!window.confirm(`¿Borrar «${campana.name}»? No se puede deshacer.`)) return
    ejecutar(() => emailMarketingService.deleteCampaign(campana.id), 'No se pudo borrar la campaña')
  }

  const programada = programar ? new Date(programar).toISOString() : null
  const formValido = editando && editando.name.trim() && editando.templateId

  return (
    <>
      <MarketingStatus loading={loading && !data} error={error} onRetry={reload} />

      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>
            Campañas manuales
            <Ayuda texto="Un correo puntual que tú eliges: escoges la plantilla de Brevo, a quién va y a qué ritmo. Entra a la misma cola del motor, así que respeta el cupo diario y la ventana horaria, y nunca llega a quien se dio de baja ni dos veces a la misma persona." />
          </h2>
          <button type="button" className="mk-btn is-primary" onClick={() => abrir(null)} disabled={ocupado}>
            Nueva campaña
          </button>
        </div>

        {aviso && <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: '0 0 1rem' }}>{aviso}</p>}

        {editando && (
          <div className="mk-engine-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: '1.5rem' }}>
            <label>
              Nombre
              <input
                className="mk-btn"
                style={{ width: '100%' }}
                maxLength={80}
                value={editando.name}
                onChange={cambiar('name')}
                placeholder="Ej. Oferta de fin de mes"
              />
            </label>
            <label>
              Plantilla de Brevo
              <Ayuda texto="El diseño del correo. Se arma en Brevo; recibe el idioma y el enlace de baja. Mándate una prueba antes de lanzar." />
              <select className="mk-btn" style={{ width: '100%' }} value={editando.templateId} onChange={cambiar('templateId')}>
                <option value="">Elige una plantilla…</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label>
                Audiencia
                <Ayuda texto={AUDIENCIAS.find((a) => a.key === editando.audience)?.ayuda} />
                <select className="mk-btn" style={{ display: 'block' }} value={editando.audience} onChange={cambiar('audience')}>
                  {AUDIENCIAS.map((a) => (
                    <option key={a.key} value={a.key}>{a.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                Plan
                <select className="mk-btn" style={{ display: 'block' }} value={editando.plan} onChange={cambiar('plan')}>
                  {PLANES.map((p) => (
                    <option key={p.key} value={p.key}>{p.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                Ritmo (por día)
                <Ayuda texto="Cuántos correos de esta campaña salen cada día. Poco al principio cuida la reputación del dominio y deja pasar el embudo." />
                <input
                  className="mk-btn"
                  style={{ display: 'block', width: 120 }}
                  type="number"
                  min={1}
                  max={500}
                  value={editando.dailyCap}
                  onChange={cambiar('dailyCap')}
                />
              </label>
            </div>
            <small style={{ color: '#a0aec0' }}>
              {alcance === null ? 'Calculando destinatarios…' : `Llegaría a unos ${alcance} contactos`}
              {alcance ? ` · terminaría en ${Math.ceil(alcance / Math.max(1, Number(editando.dailyCap) || 1))} día(s)` : ''}
            </small>

            <div className="mk-engine-actions">
              <button type="button" className="mk-btn is-primary" disabled={ocupado || !formValido || (editando.status && editando.status !== 'DRAFT')} onClick={guardar}>
                Guardar borrador
              </button>
              {editando.id && (
                <>
                  <button type="button" className="mk-btn" disabled={ocupado} onClick={() => probar(editando.id)}>
                    Enviarme prueba
                  </button>
                  <button type="button" className="mk-btn" disabled={ocupado || !formValido} onClick={() => lanzar(editando)}>
                    Lanzar ahora
                  </button>
                  <input
                    type="datetime-local"
                    className="mk-btn"
                    value={programar}
                    onChange={(e) => setProgramar(e.target.value)}
                  />
                  <button
                    type="button"
                    className="mk-btn"
                    disabled={ocupado || !programada}
                    onClick={() => lanzar(editando, programada)}
                  >
                    Programar
                  </button>
                </>
              )}
              <button type="button" className="mk-btn" onClick={() => setEditando(null)}>
                Cerrar
              </button>
            </div>
            {!editando.id && (
              <small style={{ color: '#a0aec0' }}>Guarda el borrador para poder probarlo, lanzarlo o programarlo.</small>
            )}
          </div>
        )}

        {data && (
          <table className="mk-table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Audiencia</th>
                <th>Estado</th>
                <th className="num">Enviados</th>
                <th className="num">En cola</th>
                <th className="num">Abrieron</th>
                <th className="num">Clic</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => {
                const estado = ESTADOS[c.status]
                const r = c.results
                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.name}</b>
                      <br />
                      <small style={{ color: '#a0aec0' }}>{nombrePlantilla(c.templateId)}</small>
                    </td>
                    <td>
                      {AUDIENCIAS.find((a) => a.key === c.audience)?.nombre} · {PLANES.find((p) => p.key === c.plan)?.nombre}
                    </td>
                    <td>
                      <span className={`mk-tag ${estado.clase}`}>{estado.texto}</span>
                      {c.status === 'SCHEDULED' && <small style={{ color: '#a0aec0' }}> {fecha(c.scheduledAt)}</small>}
                    </td>
                    <td className="num">{r ? r.sent : '—'}</td>
                    <td className="num">{r ? r.queued : '—'}</td>
                    <td className="num">{r ? r.opened : '—'}</td>
                    <td className="num">{r ? r.clicked : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {['DRAFT', 'SCHEDULED'].includes(c.status) && (
                        <button type="button" className="mk-btn" disabled={ocupado} onClick={() => abrir(c)}>
                          {c.status === 'DRAFT' ? 'Abrir' : 'Ver'}
                        </button>
                      )}
                      {c.status === 'LAUNCHED' && (
                        <>
                          <Link className="mk-btn" href={`/dashboard/marketing/envios?campaign=${c.id}`}>
                            Ver envíos
                          </Link>{' '}
                          <button type="button" className="mk-btn" disabled={ocupado} onClick={() => cancelar(c)}>
                            Cancelar
                          </button>
                        </>
                      )}
                      {c.status === 'SCHEDULED' && (
                        <button type="button" className="mk-btn" disabled={ocupado} onClick={() => cancelar(c)}>
                          Cancelar
                        </button>
                      )}
                      {['DRAFT', 'CANCELLED'].includes(c.status) && (
                        <button type="button" className="mk-btn" disabled={ocupado} onClick={() => borrar(c)}>
                          Borrar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ color: '#a0aec0' }}>Aún no hay campañas. Crea la primera con «Nueva campaña».</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <Reenganche />
    </>
  )
}
