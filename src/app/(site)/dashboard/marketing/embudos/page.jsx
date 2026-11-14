'use client'

import React from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import { ASUNTOS_EMBUDO } from '../demoData'

export default function MarketingEmbudos() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.flows(), [])

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  return (
    <>
      <MarketingStatus loading={loading} error={error} onRetry={reload} />

      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>{data.name}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mk-tag t-on">Activo</span>
            <span className="mk-tag t-off">Corre en Brevo</span>
          </div>
        </div>

        <p style={{ color: '#a0aec0', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Entra quien se registra en la web. Sale al terminar el último correo o en cuanto compra
          Premium. Nadie entra dos veces. Cuando el motor propio tome el control, lo ejecutará
          nuestro servidor con un proceso diario.
        </p>

        <div className="mk-flow">
          {data.steps.map((paso, i) => (
            <React.Fragment key={paso.kind}>
              {i > 0 && (
                <span className="mk-wait">
                  esperar {paso.delayDays - data.steps[i - 1].delayDays} días
                </span>
              )}

              <article className="mk-step">
                <div className="step-day">
                  <b>{paso.delayDays === 0 ? '1 h' : paso.delayDays}</b>
                  {paso.delayDays === 0 ? 'tras registro' : 'día'}
                </div>

                <div className="step-body">
                  <div className="step-subject">{ASUNTOS_EMBUDO[paso.templateId] || paso.name}</div>
                  <div className="step-meta">Plantilla #{paso.templateId} · {paso.name}</div>
                </div>

                <div className="step-kpis">
                  <div>
                    <span>Enviados</span>
                    <b>{paso.sent}</b>
                  </div>
                  <div>
                    <span>Aperturas</span>
                    <b>{paso.opened}</b>
                  </div>
                  <div>
                    <span>Clics</span>
                    <b>{paso.clicked}</b>
                  </div>
                </div>
              </article>
            </React.Fragment>
          ))}

          <span className="mk-wait">fin del embudo</span>

          <article className="mk-step" style={{ borderStyle: 'dashed' }}>
            <div className="step-day"><b>→</b>salida</div>
            <div className="step-body">
              <div className="step-subject">Pasa a Activos o a Dormidos</div>
              <div className="step-meta">Según si abrió, entró o descargó algo durante los 12 días</div>
            </div>
          </article>
        </div>
      </section>

      <div className="mk-note is-warn">
        <span aria-hidden>!</span>
        <div>
          Los contadores están a cero porque los envíos de Brevo todavía no se registran aquí: se
          llenarán cuando el motor propio envíe los correos. Los contactos actuales no entran al
          embudo; a ellos llega el reenganche.
        </div>
      </div>
    </>
  )
}
