import React from 'react';
import './PricingInline.scss';

const plans = [
  { id: '3m', name: '3 meses', monthly: 9.99, total: 29.97, save: null },
  { id: '6m', name: '6 meses', monthly: 8.99, total: 53.94, save: 'Ahorra 10%', tag:'Recomendado', highlight: true },
  { id: '12m', name: '12 meses', monthly: 7.99, total: 95.88, save: 'Ahorra 20%', tag:'Mejor precio' },
];

const currency = (n) => n.toLocaleString('es-CO', { style: 'currency', currency: 'USD' }).replace(',','.')

const PricingInline = () => {
  return (
    <section className="pricing-inline">
      <div className="container-narrow">
        <header className="p-header">
          <h3>Elige tu plan</h3>
          <p>Planes de 3, 6 y 12 meses con uso razonable.</p>
        </header>
        <div className="p-grid">
          {plans.map(p => (
            <article key={p.id} className={`p-card ${p.highlight ? 'highlight' : ''}`}>
              {p.tag && <span className="p-badge">{p.tag}</span>}
              <h4 className="p-name">{p.name}</h4>
              <div className="p-price">
                <span className="amount">{currency(p.monthly)}</span>
                <span className="per">/mes</span>
              </div>
              <div className="p-note">Total {currency(p.total)}</div>
              {p.save && <div className="p-save">{p.save}</div>}
              <button className={`btn-pill ${p.highlight ? 'fill' : 'outline'}`}>
                Elegir {p.name}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingInline;
