import React from 'react'
import { CAMPANAS, ETIQUETAS_ESTADO } from '../demoData'

const TANDAS = [
  { dia: 'Día 1', cantidad: 100, estado: 'Pendiente' },
  { dia: 'Día 2', cantidad: 200, estado: 'Pendiente' },
  { dia: 'Día 3', cantidad: 240, estado: 'Pendiente' },
]

export default function MarketingCampanas() {
  return (
    <>
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Campañas</h2>
          <button type="button" className="mk-btn is-primary" disabled>Crear campaña</button>
        </div>

        <table className="mk-table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Tipo</th>
              <th>Audiencia</th>
              <th className="num">Destinatarios</th>
              <th className="num">Enviados</th>
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
                    <div style={{ color: '#a0aec0', fontSize: '0.78rem', marginTop: 2 }}>{c.nota}</div>
                  </td>
                  <td>{c.tipo}</td>
                  <td>{c.audiencia}</td>
                  <td className="num">{c.destinatarios}</td>
                  <td className="num">{c.enviados}</td>
                  <td><span className={`mk-tag ${estado.clase}`}>{estado.texto}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mk-grid-2">
        <article className="mk-card">
          <div className="mk-card-title">
            <h2>Reenganche · plan de envío</h2>
            <small>540 destinatarios</small>
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
              {TANDAS.map((t) => (
                <tr key={t.dia}>
                  <td>{t.dia}</td>
                  <td className="num">{t.cantidad}</td>
                  <td><span className="mk-tag t-wait">{t.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mk-note is-warn" style={{ marginTop: '1rem' }}>
            <span aria-hidden>!</span>
            <div>
              Se reparte en tandas crecientes porque el dominio es nuevo. Soltar 540 correos de
              golpe es la forma más rápida de acabar en spam.
            </div>
          </div>
        </article>

        <article className="mk-card">
          <div className="mk-card-title"><h2>Qué pasa después del reenganche</h2></div>

          <div className="mk-lifecycle" style={{ flexDirection: 'column', gap: 10 }}>
            <article className="mk-stage s-active">
              <div className="stage-name">Reaccionó</div>
              <div className="stage-count">?</div>
              <p className="stage-rule">Abrió o hizo clic. Vuelve a Activos y entra en las novedades.</p>
            </article>

            <article className="mk-stage s-out">
              <div className="stage-name">No reaccionó</div>
              <div className="stage-count">?</div>
              <p className="stage-rule">Pasa a bloqueado tras 10 días. Deja de contar en las estadísticas.</p>
            </article>
          </div>

          <p style={{ color: '#a0aec0', fontSize: '0.82rem', marginTop: '1rem', lineHeight: 1.6 }}>
            Las campañas no gastan cupos de automatización, así que este envío no acerca la cuenta
            al límite de 2.000.
          </p>
        </article>
      </section>
    </>
  )
}
