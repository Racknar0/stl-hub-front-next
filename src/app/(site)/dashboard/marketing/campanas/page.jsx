'use client'

import React from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'
import Reenganche from './Reenganche'
import { CAMPANAS, ETIQUETAS_ESTADO } from '../demoData'

export default function MarketingCampanas() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.audiences(), [])

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  const destinatarios = {
    Dormidos: data.stages.DORMANT,
    Activos: data.stages.ACTIVE,
  }

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

      <Reenganche />
    </>
  )
}
