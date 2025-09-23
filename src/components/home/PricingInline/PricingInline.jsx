'use client';
import React from 'react';
import './PricingInline.scss';
import { useI18n } from '../../../i18n';
import useStore from '../../../store/useStore';

const plans = [
  { id: '3m', name: '3', monthly: 9.99, total: 29.97 },
  { id: '6m', name: '6', monthly: 8.99, total: 53.94, savePercent: '10%', tag: 'recommended', highlight: true },
  { id: '12m', name: '12', monthly: 7.99, total: 95.88, savePercent: '20%', tag: 'bestValue' },
];

const currency = (n, locale) => n.toLocaleString(locale || 'es-CO', { style: 'currency', currency: 'USD' }).replace(',','.')

const PricingInline = () => {
  const { t } = useI18n?.() || { t: () => undefined };
  const language = useStore((s) => s.language);
  const isEn = String(language || 'es').toLowerCase() === 'en';
  const locale = isEn ? 'en-US' : 'es-CO';
  const monthsSing = (typeof t === 'function' && t('pricing.months.singular')) || (isEn ? 'month' : 'mes');
  const monthsPlur = (typeof t === 'function' && t('pricing.months.plural')) || (isEn ? 'months' : 'meses');
  const perMonth = (typeof t === 'function' && t('pricing.perMonth')) || (isEn ? '/month' : '/mes');
  const totalTpl = (typeof t === 'function' && t('pricing.total')) || (isEn ? 'Total {amount}' : 'Total {amount}');
  const savePercentTpl = (typeof t === 'function' && t('pricing.savePercent')) || (isEn ? 'Save {percent}' : 'Ahorra {percent}');
  const chooseTpl = (typeof t === 'function' && t('pricing.buttons.choose')) || (isEn ? 'Choose {name}' : 'Elegir {name}');

  return (
    <section className="pricing-inline">
      <div className="container-narrow">
        <header className="p-header">
          <h3>{(typeof t === 'function' && t('pricing.title')) || (isEn ? 'Choose your plan' : 'Elige tu plan')}</h3>
          <p>{(typeof t === 'function' && t('pricing.subtitle')) || (isEn ? '1, 3, 6 and 12 month plans with full access. Cancel anytime.' : 'Planes de 1, 3, 6 y 12 meses con acceso completo. Cancela cuando quieras.')}</p>
        </header>
        <div className="p-grid">
          {plans.map(p => (
            <article key={p.id} className={`p-card ${p.highlight ? 'highlight' : ''}`}>
              {p.tag && (
                <span className="p-badge">
                  {typeof t === 'function' ? t(`pricing.tags.${p.tag}`) : (p.tag === 'recommended' ? (isEn ? 'Recommended' : 'Recomendado') : (isEn ? 'Best value' : 'Mejor precio'))}
                </span>
              )}
              <h4 className="p-name">{p.name} {p.name === '1' ? monthsSing : monthsPlur}</h4>
              <div className="p-price">
                <span className="amount">{currency(p.monthly, locale)}</span>
                <span className="per">{perMonth}</span>
              </div>
              <div className="p-note">{totalTpl.replace('{amount}', currency(p.total, locale))}</div>
              {p.savePercent && (
                <div className="p-save">
                  {savePercentTpl.replace('{percent}', p.savePercent)}
                </div>
              )}
              <a className={`btn-pill ${p.highlight ? 'fill' : 'outline'}`} href="/suscripcion">
                {chooseTpl.replace('{name}', `${p.name} ${p.name === '1' ? monthsSing : monthsPlur}`)}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingInline;
