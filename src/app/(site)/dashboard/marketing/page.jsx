import React from 'react'
import { RESUMEN, CICLO } from './demoData'

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)

export default function MarketingResumen() {
  const usoDiario = pct(RESUMEN.enviadosHoy, RESUMEN.limiteDiario)

  return (
    <>
      {/* ---------- Métricas ---------- */}
      <section className="mk-stats">
        <article className="mk-stat">
          <span className="label">Contactos</span>
          <span className="value">{RESUMEN.contactos}</span>
          <span className="hint">Usuarios de la web con marketing activo</span>
        </article>

        <article className="mk-stat is-warn">
          <span className="label">Envíos hoy</span>
          <span className="value">
            {RESUMEN.enviadosHoy}
            <small style={{ fontSize: '1rem', color: '#a0aec0' }}> / {RESUMEN.limiteDiario}</small>
          </span>
          <div className="mk-bar is-good"><i style={{ width: `${usoDiario}%` }} /></div>
        </article>

        <article className="mk-stat">
          <span className="label">En cola</span>
          <span className="value">{RESUMEN.enCola}</span>
          <span className="hint">Correos esperando turno · próximo envío: {RESUMEN.proximoEnvio}</span>
        </article>

        <article className="mk-stat is-bad">
          <span className="label">Apertura media</span>
          <span className="value">{RESUMEN.aperturaMedia}%</span>
          <span className="hint">Objetivo tras la limpieza: 25%</span>
        </article>

        <article className="mk-stat">
          <span className="label">Clics</span>
          <span className="value">{RESUMEN.clicMedio}%</span>
          <span className="hint">{RESUMEN.bajas} bajas · {RESUMEN.quejasSpam} quejas de spam</span>
        </article>
      </section>

      {/* ---------- Ciclo de vida ---------- */}
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Ciclo de vida del contacto</h2>
          <small>Cada persona está en una sola etapa</small>
        </div>

        <div className="mk-lifecycle">
          {CICLO.map((etapa, i) => (
            <React.Fragment key={etapa.key}>
              <article className={`mk-stage ${etapa.clase}`}>
                <div className="stage-name">{etapa.nombre}</div>
                <div className="stage-count">{etapa.cantidad}</div>
                <p className="stage-rule">{etapa.regla}</p>
              </article>
              {i < CICLO.length - 1 && <span className="mk-arrow" aria-hidden>→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="mk-note" style={{ marginTop: '1.25rem' }}>
          <span aria-hidden>↩</span>
          <div>
            Quien reacciona al reenganche <b>vuelve a Activos</b>. Nadie se borra: salir del
            marketing solo significa dejar de recibir promociones, la cuenta y los correos de
            activación siguen funcionando.
          </div>
        </div>
      </section>

      <div className="mk-note" style={{ marginBottom: '1.5rem' }}>
        <span aria-hidden>⚙</span>
        <div>
          <b>Las automatizaciones corren en nuestro servidor.</b> Brevo solo entrega los correos
          y nos avisa de aperturas, clics y rebotes. Sin tope de contactos en automatizaciones:
          el único límite es el cupo diario de envío, y lo que no cabe queda en cola para el
          día siguiente.
        </div>
      </div>

      {/* ---------- Qué decide cada cosa ---------- */}
      <section className="mk-grid-2">
        <article className="mk-card">
          <div className="mk-card-title"><h2>Señales que usamos</h2></div>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Señal</th>
                <th>Origen</th>
                <th>Fiable</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Abrió un correo</td>
                <td>Brevo</td>
                <td><span className="mk-tag t-wait">A medias</span></td>
              </tr>
              <tr>
                <td>Hizo clic</td>
                <td>Brevo</td>
                <td><span className="mk-tag t-on">Sí</span></td>
              </tr>
              <tr>
                <td>Inició sesión</td>
                <td>STL Gratis</td>
                <td><span className="mk-tag t-on">Sí</span></td>
              </tr>
              <tr>
                <td>Descargó un modelo</td>
                <td>STL Gratis</td>
                <td><span className="mk-tag t-on">Sí</span></td>
              </tr>
              <tr>
                <td>Compró Premium</td>
                <td>STL Gratis</td>
                <td><span className="mk-tag t-on">Sí</span></td>
              </tr>
            </tbody>
          </table>
          <div className="mk-note is-warn" style={{ marginTop: '1rem' }}>
            <span aria-hidden>!</span>
            <div>
              La apertura falla cuando el lector bloquea imágenes y se dispara sola en Apple Mail.
              Por eso un contacto solo cuenta como dormido si <b>tampoco entra ni descarga</b>.
            </div>
          </div>
        </article>

        <article className="mk-card">
          <div className="mk-card-title"><h2>Próximos pasos</h2></div>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Paso</th>
                <th>Cuándo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Webhook de Brevo a este panel</td>
                <td>Primero</td>
                <td><span className="mk-tag t-wait">Pendiente</span></td>
              </tr>
              <tr>
                <td>Motor de envíos propio (cola + cupo diario)</td>
                <td>Después</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
              <tr>
                <td>Embudo de bienvenida desde el servidor</td>
                <td>Al migrar y apagar el de Brevo</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
              <tr>
                <td>Reenganche y limpieza de dormidos</td>
                <td>Con el motor propio</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
              <tr>
                <td>Novedades periódicas</td>
                <td>Tras la limpieza</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </>
  )
}
