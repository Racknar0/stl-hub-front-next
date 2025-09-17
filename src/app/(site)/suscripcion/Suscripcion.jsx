'use client';
import React from 'react';
import './Suscripcion.scss';

const plans = [
    {
        id: '3m',
        name: '3 meses',
        monthly: 9.99,
        total: 29.97,
        save: null,
        features: [
            'Descargas razonables (hasta 20/día)',
            'Soporte estándar',
            'Acceso a todo el catálogo',
            'Previews grandes y visor 3D (próx.)',
        ],
    },
    {
        id: '6m',
        name: '6 meses',
        monthly: 8.99,
        total: 53.94,
        save: 'Ahorra 10%',
        tag: 'Recomendado',
        highlight: true,
        features: [
            'Todo del plan 3 meses',
            'Prioridad ligera en soporte',
            'Cupones en campañas especiales',
        ],
    },
    {
        id: '12m',
        name: '12 meses',
        monthly: 7.99,
        total: 95.88,
        save: 'Ahorra 20%',
        tag: 'Mejor precio',
        features: [
            'Todo del plan 6 meses',
            'Beneficios anticipados',
            'Precio más bajo garantizado en el año',
        ],
    },
];

const currency = (n) =>
    n
        .toLocaleString('es-CO', { style: 'currency', currency: 'USD' })
        .replace(',', '.');

const Suscripcion = () => {
    return (
        <section className="pricing container-narrow">
            <header className="pricing-header">
                <h1>Elige tu plan</h1>
                <p>
                    Planes de 3, 6 y 12 meses con política de uso razonable.
                    Cancela cuando quieras.
                </p>
            </header>

            <div className="plan-grid">
                {plans.map((p) => (
                    <article
                        key={p.id}
                        className={`plan-card ${
                            p.highlight ? 'highlight' : ''
                        }`}
                    >
                        {p.tag && <span className="plan-badge">{p.tag}</span>}
                        <h3 className="plan-name">{p.name}</h3>

                        <div className="price-row">
                            <div className="price">
                                <span className="amount">
                                    {currency(p.monthly)}
                                </span>
                                <span className="per">/mes</span>
                            </div>
                            <div className="bill-note">
                                Facturación total {currency(p.total)}
                            </div>
                            {p.save && <div className="save">{p.save}</div>}
                        </div>

                        <ul className="features">
                            {p.features.map((f, i) => (
                                <li key={i}>{f}</li>
                            ))}
                        </ul>

                        <button
                            className={`btn-pill ${
                                p.highlight ? 'fill' : 'outline'
                            }`}
                            onClick={() => alert(`Mock checkout: ${p.name}`)}
                        >
                            Elegir {p.name}
                        </button>
                    </article>
                ))}
            </div>

            <p className="fine-print">
                * Uso razonable: límites dinámicos por usuario e IP para
                prevenir abuso (ej. 10–20 assets/día). Precios mostrados en USD
                (mock).
            </p>
        </section>
    );
};

export default Suscripcion;
