'use client';
import React from 'react';
import './PricingSection.scss';
import SimplyModal from '../../common/SimplyModal/SimplyModal';
import PayButton from '../../common/PaypalButton/PayButton';
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
    return isEn
        ? [
              'Unlimited downloads',
              'Full catalog access',
              'Download preview',
              'Download via Mega',
              'Multiple formats (STL, OBJ, 3MF)',
              'Constant updates',
          ]
        : [
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
        name: '30',
        monthly: 5.0,
        total: 5.0,
        save: null,
    },
    {
        id: '3m',
        name: '90',
        monthly: 3.33,
        total: 10.0,
        save: { amount: '$5' },
    },
    {
        id: '6m',
        name: '180',
        monthly: 2.83,
        total: 17.0,
        save: { amount: '$13' },
        tag: 'recommended',
        highlight: true,
    },
    {
        id: '12m',
        name: '365',
        monthly: 2.08,
        total: 25.0,
        save: { amount: '$35' },
        tag: 'bestValue',
    },
];

const currency = (n, locale) =>
    n
        .toLocaleString(locale || 'es-CO', {
            style: 'currency',
            currency: 'USD',
        })
        .replace(',', '.');

const PricingSection = ({
    showHeader = true,
    showFinePrint = true,
    containerClass = 'container-narrow',
}) => {
    const { t } = useI18n?.() || { t: () => undefined };
    const language = useStore((s) => s.language);
    const isEn = String(language || 'es').toLowerCase() === 'en';
    const locale = isEn ? 'en-US' : 'es-CO';
    const features = getFeatures(t, isEn);
    const [showModal, setShowModal] = React.useState(false);
    const [selectedPlan, setSelectedPlan] = React.useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [paymentMethod, setPaymentMethod] = React.useState(null); // 'paypal' | 'card' | 'pse'

    const title =
        (typeof t === 'function' && t('pricing.title')) ||
        (isEn ? 'Choose your plan' : 'Elige tu plan');
    const subtitle =
        (typeof t === 'function' && t('pricing.subtitle')) ||
        (isEn
            ? '1, 3, 6 and 12 month plans with full access. Cancel anytime.'
            : 'Planes de 1, 3, 6 y 12 meses con acceso completo. Cancela cuando quieras.');
    const finePrint =
        (typeof t === 'function' && t('pricing.finePrint')) ||
        (isEn
            ? '* Full access to over 10,000 premium 3D models. Cancel anytime, no commitments. Prices in USD.'
            : '* Acceso completo a más de 10,000 modelos 3D premium. Cancela cuando quieras, sin compromisos. Precios en USD.');
    const perMonth =
        (typeof t === 'function' && t('pricing.perMonth')) ||
        (isEn ? '/month' : '/mes');
    const dayWord = (num) => {
        const n = Number(num || 0);
        const ds =
            (typeof t === 'function' && t('pricing.days.singular')) ||
            (isEn ? 'day' : 'día');
        const dp =
            (typeof t === 'function' && t('pricing.days.plural')) ||
            (isEn ? 'days' : 'días');
        return `${n} ${n === 1 ? ds : dp}`;
    };
    const billedTpl =
        (typeof t === 'function' && t('pricing.billed')) ||
        (isEn
            ? 'Billed {total} every {period}'
            : 'Facturado {total} cada {period}');
    const oneTimeTpl =
        (typeof t === 'function' && t('pricing.oneTime')) ||
        (isEn ? 'One-time payment {total}' : 'Pago único {total}');
    const saveTpl =
        (typeof t === 'function' && t('pricing.save')) ||
        (isEn ? 'Save {amount}' : 'Ahorra {amount}');
    const chooseTpl =
        (typeof t === 'function' && t('pricing.buttons.choose')) ||
        (isEn ? 'Choose {name}' : 'Elegir {name}');

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
                                {typeof t === 'function'
                                    ? t(`pricing.tags.${p.tag}`)
                                    : p.tag === 'recommended'
                                    ? isEn
                                        ? 'Recommended'
                                        : 'Recomendado'
                                    : isEn
                                    ? 'Best value'
                                    : 'Mejor precio'}
                            </span>
                        )}
                        <h3 className="plan-name">{dayWord(p.name)}</h3>

                        <div className="price-row">
                            <div className="price">
                                <span className="amount">
                                    {currency(p.monthly, locale)}
                                </span>
                                <span className="per">{perMonth}</span>
                            </div>
                            <div className="bill-note">
                                {p.id === '1m'
                                    ? oneTimeTpl.replace(
                                          '{total}',
                                          currency(p.total, locale)
                                      )
                                    : billedTpl
                                          .replace(
                                              '{total}',
                                              currency(p.total, locale)
                                          )
                                          .replace('{period}', dayWord(p.name))}
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

                        <button
                            type="button"
                            className={`btn-pill ${
                                p.highlight ? 'fill' : 'outline'
                            }`}
                            onClick={(e) => {
                                e.preventDefault();
                                setSelectedPlan(p);
                                setShowModal(true);
                            }}
                        >
                            {chooseTpl.replace('{name}', dayWord(p.name))}
                        </button>
                    </article>
                ))}
            </div>

            {showFinePrint && <p className="fine-print">{finePrint}</p>}

            {/* Modal de métodos de pago usando SimplyModal */}
            <SimplyModal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={
                    isEn
                        ? 'Select payment method'
                        : 'Selecciona un método de pago'
                }
                brand="STL Hub"
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18,
                        alignItems: 'center',
                    }}
                >
                    <button
                        className="btn-pill fill mt-3"
                        style={{ fontSize: 18, minWidth: 220 }}
                        type="button"
                        onClick={() => {
                            if (!selectedPlan) setSelectedPlan(plans[0]);
                            setShowModal(false);
                            setPaymentMethod('paypal');
                            setPaymentModalOpen(true);
                        }}
                    >
                        {isEn
                            ? 'Credit Card / PayPal'
                            : 'Tarjeta de crédito / PayPal'}
                    </button>
                    <button
                        className="btn-pill outline"
                        style={{ fontSize: 18, minWidth: 220 }}
                        type="button"
                        onClick={() => {
                            if (!selectedPlan) setSelectedPlan(plans[0]);
                            setShowModal(false);
                            setPaymentMethod('card');
                            setPaymentModalOpen(true);
                        }}
                    >
                        {isEn ? 'Otro' : 'Otro'}
                    </button>
                </div>
                <div
                    style={{
                        marginTop: 32,
                        color: '#f7f7f7',
                        fontSize: 17,
                        textAlign: 'center',
                    }}
                >
                    {selectedPlan && (
                        <>
                            <b>{isEn ? 'Plan:' : 'Plan:'}</b>{' '}
                            {dayWord(selectedPlan.name)}
                            <br />
                            <b>{isEn ? 'Total:' : 'Total:'}</b>{' '}
                            {currency(selectedPlan.total, locale)}
                        </>
                    )}
                </div>
            </SimplyModal>

            {/* Modal específico del método de pago: muestra PayButton para PayPal o placeholder para tarjeta */}
            <SimplyModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                title={
                    paymentMethod === 'paypal'
                        ? isEn
                            ? 'Pay with PayPal'
                            : 'Pagar con PayPal'
                        : isEn
                        ? 'Pay with Card'
                        : 'Pagar con tarjeta'
                }
                brand="STL Hub"
                bodyStyles={{
                    backgroundColor: '#ffffff',
                    overflow: 'scroll',
                }}
                titleStyles={{
                    color: '#333333',
                }}
            >
                <div style={{}}>
                    {paymentMethod === 'paypal' && (
                        <div
                            style={{
                                width: '100%',
                                backgroundColor: '#fff',
                            }}
                        >
                            <PayButton />
                        </div>
                    )}

                    {paymentMethod === 'card' && (
                        <div style={{ minWidth: 320, maxWidth: '100%' }}>
                            <p style={{ color: '#333', textAlign: 'center' }}>
                                {isEn
                                    ? 'Card payments coming soon — this is a UI mock.'
                                    : 'Los pagos con tarjeta llegarán pronto — esto es una maqueta de UI.'}
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginTop: 12,
                                }}
                            >
                                <button
                                    className="btn-pill fill"
                                    disabled
                                    style={{ minWidth: 180 }}
                                >
                                    {isEn ? 'Pay (demo)' : 'Pagar (demo)'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </SimplyModal>
        </section>
    );
};

export default PricingSection;
