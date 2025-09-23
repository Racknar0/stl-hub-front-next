'use client';
import React from 'react';
import './PricingSection.scss';
import { useI18n } from '../../../i18n';
import useStore from '../../../store/useStore';

const getFeatures = (t, isEn) => {
    if (typeof t === 'function') {
        return [
            t('pricing.features.unlimitedDownloads'),
            t('pricing.features.fullCatalogAccess'),
            t('pricing.features.downloadPreview'),
            t('pricing.features.megaDownload'),
            t('pricing.features.multipleFormats'),
            t('pricing.features.constantUpdates'),
        ];
    }
    
    // Fallback si no hay traducción
    return isEn ? [
        'Unlimited downloads',
        'Full catalog access',
        'Download preview',
        'Download via Mega',
        'Multiple formats (STL, OBJ, 3MF)',
        'Constant updates',
    ] : [
        'Descargas ilimitadas',
        'Acceso completo al catálogo',
        'Vista previa de tus descargas',
        'Descarga via mega',
        'Formatos múltiples (STL, OBJ, 3MF)',
        'Actualización constante',
    ];
};

const plans = [
    {
        id: '1m',
        name: '1',
        monthly: 5.00,
        total: 5.00,
        save: null,
    },
    {
        id: '3m',
        name: '3',
        monthly: 3.33,
        total: 10.00,
        save: { amount: '$5' },
    },
    {
        id: '6m',
        name: '6',
        monthly: 2.83,
        total: 17.00,
        save: { amount: '$13' },
        tag: 'recommended',
        highlight: true,
    },
    {
        id: '12m',
        name: '12',
        monthly: 2.08,
        total: 25.00,
        save: { amount: '$35' },
        tag: 'bestValue',
    },
];

const currency = (n, locale) =>
    n.toLocaleString(locale || 'es-CO', { style: 'currency', currency: 'USD' }).replace(',', '.');

const PricingSection = ({ showHeader = true, showFinePrint = true, containerClass = 'container-narrow' }) => {
    const { t } = useI18n?.() || { t: () => undefined };
    const language = useStore((s) => s.language);
    const isEn = String(language || 'es').toLowerCase() === 'en';
    const locale = isEn ? 'en-US' : 'es-CO';
    const features = getFeatures(t, isEn);
    
    const title = (typeof t === 'function' && t('pricing.title')) || 
        (isEn ? 'Choose your plan' : 'Elige tu plan');
    const subtitle = (typeof t === 'function' && t('pricing.subtitle')) || 
        (isEn ? '1, 3, 6 and 12 month plans with full access. Cancel anytime.' : 'Planes de 1, 3, 6 y 12 meses con acceso completo. Cancela cuando quieras.');
    const finePrint = (typeof t === 'function' && t('pricing.finePrint')) || 
        (isEn ? '* Full access to over 10,000 premium 3D models. Cancel anytime, no commitments. Prices in USD.' : '* Acceso completo a más de 10,000 modelos 3D premium. Cancela cuando quieras, sin compromisos. Precios en USD.');
    const perMonth = (typeof t === 'function' && t('pricing.perMonth')) || (isEn ? '/month' : '/mes');
    const monthsSing = (typeof t === 'function' && t('pricing.months.singular')) || (isEn ? 'month' : 'mes');
    const monthsPlur = (typeof t === 'function' && t('pricing.months.plural')) || (isEn ? 'months' : 'meses');
    const billedTpl = (typeof t === 'function' && t('pricing.billed')) || (isEn ? 'Billed {total} every {period}' : 'Facturado {total} cada {period}');
    const oneTimeTpl = (typeof t === 'function' && t('pricing.oneTime')) || (isEn ? 'One-time payment {total}' : 'Pago único {total}');
    const saveTpl = (typeof t === 'function' && t('pricing.save')) || (isEn ? 'Save {amount}' : 'Ahorra {amount}');
    const chooseTpl = (typeof t === 'function' && t('pricing.buttons.choose')) || (isEn ? 'Choose {name}' : 'Elegir {name}');

    return (
        <section className={`pricing ${containerClass} px-4 p-xl-0`}>
            {showHeader && (
                <header className="pricing-header">
                    <h1 className="pricing-title">{title}</h1>
                    <p>{subtitle}</p>
                </header>
            )}

            <div className="plan-grid">
                {plans.map((p) => (
                    <article
                        key={p.id}
                        className={`plan-card ${
                            p.highlight ? 'highlight' : ''
                        }`}
                    >
                        {p.tag && (
                            <span className="plan-badge">
                                {typeof t === 'function' ? t(`pricing.tags.${p.tag}`) : (p.tag === 'recommended' ? (isEn ? 'Recommended' : 'Recomendado') : (isEn ? 'Best value' : 'Mejor precio'))}
                            </span>
                        )}
                        <h3 className="plan-name">{p.name} {p.name === '1' ? monthsSing : monthsPlur}</h3>

                        <div className="price-row">
                            <div className="price">
                                <span className="amount">
                                    {currency(p.monthly, locale)}
                                </span>
                                <span className="per">{perMonth}</span>
                            </div>
                            <div className="bill-note">
                                {p.id === '1m'
                                    ? oneTimeTpl.replace('{total}', currency(p.total, locale))
                                    : billedTpl
                                        .replace('{total}', currency(p.total, locale))
                                        .replace('{period}', `${p.name} ${p.name === '1' ? monthsSing : monthsPlur}`)
                                }
                            </div>
                            {p.save && (
                                <div className="save">
                                    {saveTpl.replace('{amount}', p.save.amount)}
                                </div>
                            )}
                        </div>

                        <ul className="features">
                            {features.map((f, i) => (
                                <li key={i}>{f}</li>
                            ))}
                        </ul>

                        <a
                            className={`btn-pill ${
                                p.highlight ? 'fill' : 'outline'
                            }`}
                            href="/suscripcion"
                            onClick={(e) => { /* allow normal navigation */ }}
                        >
                            {chooseTpl.replace('{name}', `${p.name} ${p.name === '1' ? monthsSing : monthsPlur}`)}
                        </a>
                    </article>
                ))}
            </div>

            {showFinePrint && (
                <p className="fine-print">
                    {finePrint}
                </p>
            )}
        </section>
    );
};

export default PricingSection;