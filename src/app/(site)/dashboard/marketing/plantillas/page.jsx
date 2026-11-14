import React from 'react'
import { PLANTILLAS, ETIQUETAS_ESTADO } from '../demoData'

export default function MarketingPlantillas() {
  return (
    <>
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Plantillas de correo</h2>
          <small>Bilingües: cada contacto la recibe en su idioma</small>
        </div>

        <div className="mk-grid-2" style={{ marginBottom: 0 }}>
          {PLANTILLAS.map((t) => {
            const estado = ETIQUETAS_ESTADO[t.estado]
            return (
              <article className="mk-tpl" key={t.id}>
                <div className="tpl-thumb">
                  {t.imagen ? (
                    <img src={`/marketing/${t.imagen}.jpg`} alt="" loading="lazy" />
                  ) : (
                    <span>Sin banner · solo cabecera</span>
                  )}
                </div>

                <div className="tpl-body">
                  <div className="tpl-name">{t.nombre}</div>
                  <div className="tpl-subject">{t.asunto}</div>
                </div>

                <div className="tpl-foot">
                  <span style={{ color: '#a0aec0', fontSize: '0.78rem' }}>{t.uso}</span>
                  <span className={`mk-tag ${estado.clase}`}>{estado.texto}</span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="mk-note">
        <span aria-hidden>i</span>
        <div>
          Las plantillas viven en Brevo y están enlazadas a los pasos del embudo: al cambiar una,
          cambia en todos los correos donde se usa. Una plantilla <b>inactiva no envía nada</b>,
          aunque el embudo esté encendido.
        </div>
      </div>
    </>
  )
}
