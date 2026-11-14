import React from 'react'
import { AUDIENCIAS, ETIQUETAS_ESTADO } from '../demoData'

const ORIGEN = {
  propia: { texto: 'Web + correo', clase: 't-on' },
  web: { texto: 'Solo web', clase: 't-draft' },
  brevo: { texto: 'Solo Brevo', clase: 't-off' },
}

export default function MarketingAudiencias() {
  return (
    <>
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Audiencias</h2>
          <button type="button" className="mk-btn" disabled>Nueva audiencia</button>
        </div>

        <table className="mk-table">
          <thead>
            <tr>
              <th>Audiencia</th>
              <th>Regla</th>
              <th>Datos</th>
              <th className="num">Contactos</th>
              <th className="num">Apertura</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {AUDIENCIAS.map((a) => {
              const estado = ETIQUETAS_ESTADO[a.estado]
              const origen = ORIGEN[a.senal]
              return (
                <tr key={a.nombre}>
                  <td><b>{a.nombre}</b></td>
                  <td style={{ color: '#a0aec0' }}>{a.regla}</td>
                  <td><span className={`mk-tag ${origen.clase}`}>{origen.texto}</span></td>
                  <td className="num">{a.contactos}</td>
                  <td className="num">{a.apertura > 0 ? `${a.apertura}%` : '—'}</td>
                  <td><span className={`mk-tag ${estado.clase}`}>{estado.texto}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mk-grid-2">
        <article className="mk-card">
          <div className="mk-card-title"><h2>Cuándo pasa a Dormido</h2></div>
          <p style={{ color: '#a0aec0', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Tienen que cumplirse <b style={{ color: '#fff' }}>todas</b> a la vez durante 60 días:
          </p>
          <ul style={{ color: '#cbd5e0', fontSize: '0.88rem', lineHeight: 1.9, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li>No abrió ningún correo</li>
            <li>No hizo clic en ningún enlace</li>
            <li>No inició sesión en la web</li>
            <li>No descargó ningún modelo</li>
          </ul>
          <p style={{ color: '#a0aec0', fontSize: '0.82rem', marginTop: '0.75rem' }}>
            Además tiene que llevar más de 45 días registrado, para no perseguir a quien acaba de
            llegar.
          </p>
        </article>

        <article className="mk-card">
          <div className="mk-card-title"><h2>Cuándo sale del marketing</h2></div>
          <p style={{ color: '#a0aec0', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Solo después de haber recibido el reenganche y no haber reaccionado en 10 días. También
            sale al instante si:
          </p>
          <ul style={{ color: '#cbd5e0', fontSize: '0.88rem', lineHeight: 1.9, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li>Pulsa «darme de baja»</li>
            <li>Marca el correo como spam</li>
            <li>Su dirección rebota de forma permanente</li>
          </ul>
          <div className="mk-note" style={{ marginTop: '1rem' }}>
            <span aria-hidden>i</span>
            <div>Sigue teniendo cuenta y recibiendo activación y contraseña. Solo deja de recibir promociones.</div>
          </div>
        </article>
      </section>
    </>
  )
}
