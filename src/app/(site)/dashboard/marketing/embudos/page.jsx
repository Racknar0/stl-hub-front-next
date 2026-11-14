import React from 'react'
import { EMBUDO } from '../demoData'

export default function MarketingEmbudos() {
  return (
    <>
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Bienvenida a nuevos registros</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mk-tag t-on">Activo</span>
            <button type="button" className="mk-btn" disabled>Pausar</button>
          </div>
        </div>

        <p style={{ color: '#a0aec0', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Lo ejecuta nuestro servidor: entra quien se registra en la web, y un proceso diario
          decide qué correo toca según los días transcurridos. Sale al terminar el último correo
          o en cuanto compra Premium. Nadie entra dos veces.
        </p>

        <div className="mk-flow">
          {EMBUDO.map((paso, i) => (
            <React.Fragment key={paso.dia}>
              {i > 0 && <span className="mk-wait">esperar {paso.espera}</span>}

              <article className="mk-step">
                <div className="step-day">
                  <b>{paso.etiqueta.replace('Día ', '')}</b>
                  {paso.dia === 1 ? 'tras registro' : 'día'}
                </div>

                <div className="step-body">
                  <div className="step-subject">{paso.asunto}</div>
                  <div className="step-meta">{paso.plantilla}</div>
                </div>

                <div className="step-kpis">
                  <div>
                    <span>Enviados</span>
                    <b>{paso.enviados}</b>
                  </div>
                  <div>
                    <span>Aperturas</span>
                    <b>{paso.aperturas}</b>
                  </div>
                  <div>
                    <span>Clics</span>
                    <b>{paso.clics}</b>
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
          Los contadores están a cero porque el embudo solo cuenta a quien se registre a partir de
          ahora. Los <b>597 contactos actuales no entran</b>: a esos llega el reenganche.
        </div>
      </div>
    </>
  )
}
