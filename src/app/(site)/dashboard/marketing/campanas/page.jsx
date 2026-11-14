'use client'

import React from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'
import { CAMPANAS, ETIQUETAS_ESTADO } from '../demoData'

// Reparto del reenganche en tandas crecientes: 100, 200 y el resto.
const repartirTandas = (total) => {
  const tandas = []
  let restante = total
  for (const tope of [100, 200, Infinity]) {
    if (restante <= 0) break
    const cantidad = Math.min(restante, tope)
    tandas.push({ dia: `Día ${tandas.length + 1}`, cantidad })
    restante -= cantidad
  }
  return tandas
}

export default function MarketingCampanas() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.audiences(), [])

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  const destinatarios = {
    Dormidos: data.stages.DORMANT,
    Activos: data.stages.ACTIVE,
  }
  const tandas = repartirTandas(data.stages.DORMANT)

  return (
    <>
      <MarketingStatus loading={loading} error={error} onRetry={reload} />

      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>
            Campañas
            <Ayuda texto="Envíos a una audiencia concreta, distintos del embudo de bienvenida. Están planificadas: se activarán cuando exista el motor de envíos propio." />
          </h2>
        </div>

        <table className="mk-table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>
                Tipo
                <Ayuda texto="Única: se envía una sola vez. Recurrente: se repite cada cierto tiempo." />
              </th>
              <th>Audiencia</th>
              <th className="num">Destinatarios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {CAMPANAS.map((c) => {
              const estado = ETIQUETAS_ESTADO[c.estado]
              return (
                <tr key={c.nombre}>
                  <td>
                    <b>{c.nombre}</b>
                    <Ayuda texto={c.nota} />
                  </td>
                  <td>{c.tipo}</td>
                  <td>{c.audiencia}</td>
                  <td className="num">{destinatarios[c.audiencia] ?? 0}</td>
                  <td><span className={`mk-tag ${estado.clase}`}>{estado.texto}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mk-card">
        <div className="mk-card-title">
          <h2>
            Reenganche · plan de envío
            <Ayuda texto={`Correo para los dormidos que intenta recuperarlos. Quien abre o hace clic vuelve a Activos; quien no reacciona en ${data.windows.REENGAGE_GRACE_DAYS} días pasa a Bloqueado. Se reparte en tandas crecientes porque el dominio es nuevo: soltar todo de golpe es la forma más rápida de acabar en spam.`} />
          </h2>
          <small>{data.stages.DORMANT} destinatarios</small>
        </div>

        <table className="mk-table">
          <thead>
            <tr>
              <th>Tanda</th>
              <th className="num">Correos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {tandas.map((t) => (
              <tr key={t.dia}>
                <td>{t.dia}</td>
                <td className="num">{t.cantidad}</td>
                <td><span className="mk-tag t-wait">Pendiente</span></td>
              </tr>
            ))}
            {tandas.length === 0 && (
              <tr><td colSpan={3} style={{ color: '#a0aec0' }}>No hay contactos dormidos.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}
