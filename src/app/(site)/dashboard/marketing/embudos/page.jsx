'use client'

import React, { useState } from 'react'
import MotorAjustes from './MotorAjustes'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'
import { ASUNTOS_EMBUDO } from '../demoData'

export default function MarketingEmbudos() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.flows(), [])
  const [motorOn, setMotorOn] = useState(false)

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  return (
    <>
      <MarketingStatus loading={loading} error={error} onRetry={reload} />

      <MotorAjustes onChange={(m) => setMotorOn(m.enabled)} />

      <section className="mk-card">
        <div className="mk-card-title">
          <h2>
            {data.name}
            <Ayuda texto="Serie de 4 correos que recibe cada persona que se registra. Sale al terminar el último o en cuanto compra Premium. Nadie entra dos veces, y los contactos que ya existían no entran: a ellos les llega el reenganche." />
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {motorOn ? (
              <span className="mk-tag t-on">
                Motor propio
                <Ayuda texto="Nuestro servidor envía este embudo. Los contadores salen de los envíos reales." />
              </span>
            ) : (
              <span className="mk-tag t-off">
                Corre en Brevo
                <Ayuda texto="Mientras el motor propio esté apagado, el embudo lo ejecuta Brevo y los contadores de enviados, aperturas y clics aparecen en cero. Se llenarán cuando enciendas el motor." />
              </span>
            )}
          </div>
        </div>

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
                  <div className="step-meta">
                    Plantilla #{paso.templateId} · {paso.name}
                    <Ayuda texto="Es la plantilla de Brevo que se envía en este paso. Se edita en Brevo y el cambio aplica a todos los que la reciban desde ahora." />
                  </div>
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
              <div className="step-subject">
                Pasa a Activos o a Dormidos
                <Ayuda texto="Al terminar los 12 días, la etapa se decide según si abrió, entró a la web o descargó algo durante ese tiempo." />
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  )
}
