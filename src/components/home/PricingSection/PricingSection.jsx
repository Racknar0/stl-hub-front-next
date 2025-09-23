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
        name: '1 mes',
        monthly: 5.00,
        total: 5.00,
        save: null,
    },
    {
        id: '3m',
        name: '3 meses',
        monthly: 3.33,
        total: 10.00,
        save: 'Ahorra $5',
    },
    {
        id: '6m',
        name: '6 meses',
        monthly: 2.83,
        total: 17.00,
        save: 'Ahorra $13',
        tag: 'Recomendado',
        highlight: true,
    },
    {
        id: '12m',
        name: '12 meses',
        monthly: 2.08,
        total: 25.00,
        save: 'Ahorra $35',
        tag: 'Mejor valor',
    },
];

const currency = (n) =>
    n
        .toLocaleString('es-CO', { style: 'currency', currency: 'USD' })
        .replace(',', '.');

const PricingSection = ({ showHeader = true, showFinePrint = true, containerClass = 'container-narrow' }) => {
    const { t } = useI18n?.() || { t: () => undefined };
    const language = useStore((s) => s.language);
    const isEn = String(language || 'es').toLowerCase() === 'en';
    const features = getFeatures(t, isEn);
    
    const title = (typeof t === 'function' && t('pricing.title')) || 
        (isEn ? 'Choose your plan' : 'Elige tu plan');
    const subtitle = (typeof t === 'function' && t('pricing.subtitle')) || 
        (isEn ? '1, 3, 6 and 12 month plans with full access. Cancel anytime.' : 'Planes de 1, 3, 6 y 12 meses con acceso completo. Cancela cuando quieras.');
    const finePrint = (typeof t === 'function' && t('pricing.finePrint')) || 
        (isEn ? '* Full access to over 10,000 premium 3D models. Cancel anytime, no commitments. Prices in USD.' : '* Acceso completo a más de 10,000 modelos 3D premium. Cancela cuando quieras, sin compromisos. Precios en USD.');

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
                                {p.id === '1m' 
                                    ? `Pago único ${currency(p.total)}`
                                    : `Facturado ${currency(p.total)} cada ${p.name}`
                                }
                            </div>
                            {p.save && <div className="save">{p.save}</div>}
                        </div>

                        <ul className="features">
                            {features.map((f, i) => (
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

            {showFinePrint && (
                <p className="fine-print">
                    {finePrint}
                </p>
            )}
        </section>
    );
};

export default PricingSection;