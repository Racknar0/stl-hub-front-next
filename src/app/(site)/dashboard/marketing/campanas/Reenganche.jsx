'use client'

import React, { useState } from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'

// Tandas sugeridas: crecientes, porque el dominio es nuevo.
const TANDAS = [100, 200]

export default function Reenganche() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.reengage(), [])
  const [lanzando, setLanzando] = useState(false)
  const [aviso, setAviso] = useState('')

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  const lanzar = async (cantidad) => {
    const real = Math.min(cantidad, data.available)
    if (!window.confirm(`Se pondrán en cola ${real} correos de reenganche. Salen al ritmo del motor, dentro del cupo diario. ¿Lanzar la tanda?`)) return
    setLanzando(true)
    setAviso('')
    try {
      const r = await emailMarketingService.launchReengage(cantidad)
      setAviso(
        `${r.queued} correos en cola.` +
          (r.engineEnabled ? '' : ' El motor está apagado: no saldrán hasta que lo enciendas.')
      )
      await reload()
    } catch (e) {
      setAviso(e?.response?.data?.error || 'No se pudo lanzar la tanda')
    } finally {
      setLanzando(false)
    }
  }

  const botones = [...TANDAS.filter((n) => n < data.available), data.available].filter((n, i, a) => n > 0 && a.indexOf(n) === i)

  return (
    <section className="mk-card">
      <div className="mk-card-title">
        <h2>
          Reenganche de dormidos
          <Ayuda texto={`Un correo para quienes llevan tiempo sin dar señales. Quien abre, hace clic, entra o descarga vuelve a Activos. Quien no reacciona en ${data.graceDays} días sale del marketing (no se borra). Se lanza por tandas porque el dominio es nuevo: soltar todo de golpe es la forma más rápida de acabar en spam. Empieza por los más recientes, que son los que más responden.`} />
        </h2>
        <small>{data.dormant} dormidos</small>
      </div>

      <table className="mk-table">
        <tbody>
          <tr>
            <td>
              Por enviar
              <Ayuda texto="Dormidos activos que aún no recibieron el reenganche. No incluye Premium ni a quien ya se dio de baja." />
            </td>
            <td className="num">{data.available}</td>
          </tr>
          <tr>
            <td>En cola<Ayuda texto="Ya lanzados y esperando su turno, según el cupo diario del motor." /></td>
            <td className="num">{data.queued}</td>
          </tr>
          <tr>
            <td>Enviados</td>
            <td className="num">{data.sent}</td>
          </tr>
          <tr>
            <td>Esperando respuesta<Ayuda texto={`Recibieron el correo y aún están dentro de los ${data.graceDays} días para reaccionar.`} /></td>
            <td className="num">{data.waiting}</td>
          </tr>
          <tr>
            <td>Reaccionaron<Ayuda texto="Recibieron el reenganche y ya dieron alguna señal: volvieron a Activos." /></td>
            <td className="num">{data.reacted}</td>
          </tr>
          <tr>
            <td>Salieron del marketing<Ayuda texto="No reaccionaron dentro del plazo. Conservan su cuenta y siguen recibiendo los correos de activación y contraseña." /></td>
            <td className="num">{data.closed}</td>
          </tr>
          {data.failed > 0 && (
            <tr>
              <td>Fallidos</td>
              <td className="num">{data.failed}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mk-engine-actions" style={{ marginTop: '1rem' }}>
        {botones.length === 0 ? (
          <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>No quedan dormidos por contactar.</span>
        ) : (
          botones.map((n) => (
            <button key={n} className="mk-btn is-primary" disabled={lanzando} onClick={() => lanzar(n)}>
              {n === data.available && n > TANDAS[TANDAS.length - 1] ? `Lanzar el resto (${n})` : `Lanzar tanda de ${n}`}
            </button>
          ))
        )}
        {aviso && <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>{aviso}</span>}
      </div>
    </section>
  )
}
