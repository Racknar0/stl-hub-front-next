'use client'

import React from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'
import { PLANTILLAS_META, ETIQUETAS_ESTADO } from '../demoData'

export default function MarketingPlantillas() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.templates(), [])

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  return (
    <>
      <MarketingStatus loading={loading} error={error} onRetry={reload} />

      <section className="mk-card">
        <div className="mk-card-title">
          <h2>
            Plantillas de correo
            <Ayuda texto="Los diseños de los correos, que viven en Brevo. Son bilingües: cada contacto recibe la plantilla en su idioma. Están enlazadas a los pasos del embudo, así que al cambiar una cambia en todos los correos donde se usa." />
          </h2>
        </div>

        <div className="mk-grid-2" style={{ marginBottom: 0 }}>
          {data.items.map((t) => {
            const meta = PLANTILLAS_META[t.id] || {}
            const estado = ETIQUETAS_ESTADO[t.isActive ? 'on' : 'off']
            return (
              <article className="mk-tpl" key={t.id}>
                <div className="tpl-thumb">
                  {meta.imagen ? (
                    <img src={`/marketing/${meta.imagen}.jpg`} alt="" loading="lazy" />
                  ) : (
                    <span>Sin banner · solo cabecera</span>
                  )}
                </div>

                <div className="tpl-body">
                  <div className="tpl-name">{t.name}</div>
                  <div className="tpl-subject">{t.subject}</div>
                </div>

                <div className="tpl-foot">
                  <span style={{ color: '#a0aec0', fontSize: '0.78rem' }}>
                    {meta.uso || `Plantilla #${t.id}`}
                  </span>
                  <span className={`mk-tag ${estado.clase}`}>
                    {estado.texto}
                    <Ayuda
                      texto={
                        t.isActive
                          ? 'Activa: el embudo la puede enviar.'
                          : 'Inactiva: no envía nada, aunque el embudo o la campaña que la usa esté encendida. Hay que activarla en Brevo.'
                      }
                    />
                  </span>
                </div>
              </article>
            )
          })}
          {data.items.length === 0 && (
            <div style={{ color: '#a0aec0' }}>Brevo no devolvió plantillas.</div>
          )}
        </div>
      </section>
    </>
  )
}
