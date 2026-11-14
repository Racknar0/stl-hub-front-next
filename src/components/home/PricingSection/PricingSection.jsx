'use client';
import React from 'react';
import './PricingSection.scss';
import SimplyModal from '../../common/SimplyModal/SimplyModal';
import PayButton from '../../common/PaypalButton/PayButton';
import SocialProofPopup from '../../common/SocialProofPopup/SocialProofPopup';
import { useI18n } from '../../../i18n';
import useStore from '../../../store/useStore';
import Button from '@/components/layout/Buttons/Button';
import HttpService from '@/services/HttpService';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import useResolvedLanguage from '@/hooks/useResolvedLanguage';
import {
    getTrackingFromMiddlewareCookie,
    getVisitIdentityFromMiddlewareCookie,
} from '../../../helpers/attributionCookie';
import { sendGTMEvent } from '@next/third-parties/google';
import { usePromo } from '@/hooks/usePromo';
import {
    rememberMercadoPagoAttempt,
    startPaymentAttempt,
    trackPaymentAttemptEvent,
    withTimeout,
} from '@/helpers/paymentAttempt';


// Fallback plans in case API is unreachable
const FALLBACK_PLANS = [
    { id: '1m', name: '30', monthly: 5.0, total: 5.0, save: null },
    { id: '3m', name: '90', monthly: 3.33, total: 10.0, save: { amount: '$5' } },
    { id: '6m', name: '180', monthly: 2.83, total: 17.0, save: { amount: '$13' }, tag: 'recommended', highlight: true },
    { id: '12m', name: '365', monthly: 2.08, total: 25.0, save: { amount: '$35' }, tag: 'bestValue' },
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
    const resolvedLanguage = useResolvedLanguage();
    const promo = usePromo();
    const isEn = resolvedLanguage === 'en';
    const locale = isEn ? 'en-US' : 'es-CO';

    const [showModal, setShowModal] = React.useState(false);
    const [selectedPlan, setSelectedPlan] = React.useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [paymentMethod, setPaymentMethod] = React.useState(null); // 'mercadopago' | 'paypal' | 'card' | 'pse'
    const userId = useStore((s) => s.userId);
    const [notLoggedInModal, setNotLoggedInModal] = React.useState(false);
    const [isMercadoPagoLoading, setIsMercadoPagoLoading] = React.useState(false);
    const httpService = React.useMemo(() => new HttpService(), []);

    // Intento de pago actual (se crea al elegir PayPal o MercadoPago).
    const [attemptId, setAttemptId] = React.useState(null);
    const attemptPromiseRef = React.useRef(null);

    const beginPaymentAttempt = React.useCallback((provider, plan) => {
        setAttemptId(null);
        const promise = plan?.id ? startPaymentAttempt(provider, plan.id) : Promise.resolve(null);
        attemptPromiseRef.current = promise;
        promise.then((id) => {
            if (attemptPromiseRef.current === promise) setAttemptId(id);
        });
    }, []);

    const closePaymentModal = React.useCallback(() => {
        setPaymentModalOpen(false);
        const pending = attemptPromiseRef.current;
        attemptPromiseRef.current = null;
        if (pending) pending.then((id) => trackPaymentAttemptEvent(id, 'modal_closed'));
    }, []);

    // Dynamic plans from API
    const [plans, setPlans] = React.useState(FALLBACK_PLANS);
    const [totalAssets, setTotalAssets] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;
        const fetchPlans = async () => {
            try {
                const res = await httpService.getData('/admin/settings/public/plans');
                if (!cancelled && res?.data?.plans?.length > 0) {
                    setPlans(res.data.plans);
                    const count = Number(res.data.totalAssets);
                    if (Number.isFinite(count) && count > 0) setTotalAssets(count);
                }
            } catch (err) {
                console.warn('[PricingSection] Could not fetch dynamic plans, using fallback:', err?.message);
            }
        };
        fetchPlans();
        return () => { cancelled = true; };
    }, [httpService]);

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
    const planBadge = (plan) => ({
        '1m': isEn ? 'Get started' : 'Para empezar',
        '3m': isEn ? 'More flexibility' : 'Más flexible',
        '6m': isEn ? 'Recommended' : 'Recomendado',
        '12m': isEn ? 'Best value' : 'Mejor precio',
    }[plan.id]);
    const planNote = (plan) => ({
        '1m': isEn ? 'Ideal for urgent short-term projects' : 'Ideal para proyectos urgentes',
        '3m': isEn ? 'A full quarter of non-stop creativity' : 'Un trimestre de creatividad sin pausas',
        '6m': isEn ? 'Half a year of guaranteed models' : 'Medio año de modelos garantizados',
        '12m': isEn ? 'Annual license with maximum savings' : 'Licencia anual con el mayor ahorro',
    }[plan.id]);
    const benefits = [
        totalAssets
            ? (isEn ? `Access to ${totalAssets.toLocaleString(locale)} 3D models` : `Acceso a ${totalAssets.toLocaleString(locale)} modelos 3D`)
            : (isEn ? 'Full access to the premium catalog' : 'Acceso completo al catálogo premium'),
        isEn ? 'AI-powered smart search' : 'Búsqueda inteligente impulsada por IA',
        isEn ? 'Unlimited downloads' : 'Descargas ilimitadas sin restricciones',
        isEn ? 'Detailed gallery and asset previews' : 'Galería y vista previa de cada modelo',
        isEn ? 'High-speed servers (via MEGA)' : 'Descargas rápidas vía MEGA',
        isEn ? 'Guaranteed weekly updates' : 'Actualización semanal garantizada',
    ];

    const handleMercadoPagoCheckout = React.useCallback(async () => {
        if (!selectedPlan || !userId || isMercadoPagoLoading) return;

        try {
            setIsMercadoPagoLoading(true);
            const tracking = getTrackingFromMiddlewareCookie('last');
            const { anonId, sessionId } = getVisitIdentityFromMiddlewareCookie();
            const currentAttemptId = await withTimeout(attemptPromiseRef.current, 2000);

            const response = await httpService.postData('payments/mercadopago/preference', {
                planId: selectedPlan.id,
                userId,
                tracking,
                anonId,
                sessionId,
                attemptId: currentAttemptId,
            });

            const initPoint = response?.data?.initPoint;
            const trackedAttemptId = response?.data?.attemptId || currentAttemptId;
            if (initPoint && trackedAttemptId) {
                // Ya no cuenta como "cerró el modal": se fue a MercadoPago.
                attemptPromiseRef.current = null;
                rememberMercadoPagoAttempt(trackedAttemptId, response?.data?.preferenceId || null);
                await withTimeout(trackPaymentAttemptEvent(trackedAttemptId, 'checkout_redirect'), 800);
            }
            if (!initPoint) {
                alert(
                    isEn
                        ? 'Could not start Mercado Pago checkout. Please try again.'
                        : 'No se pudo iniciar el checkout de Mercado Pago. Intenta de nuevo.'
                );
                return;
            }

            window.location.href = initPoint;
        } catch (error) {
            console.error('Error iniciando checkout de MercadoPago:', error);
            alert(
                isEn
                    ? 'There was an error connecting to Mercado Pago.'
                    : 'Hubo un error al conectar con Mercado Pago.'
            );
        } finally {
            setIsMercadoPagoLoading(false);
        }
    }, [selectedPlan, userId, isMercadoPagoLoading, httpService, isEn]);

    return (
        <section className={`pricing ${containerClass} px-4 p-xl-0`}>
            {showHeader && (
                <header className="pricing-header">
                    <h1 className="pricing-title">{title.split(/(plan)/i).map((part, index) => /^plan$/i.test(part) ? <span key={index}>{part}</span> : part)}</h1>
                    <p>{subtitle}</p>
                </header>
            )}

            <div className="plan-grid">
                {plans.map((p) => (
                    <article
                        key={p.id}
                        className={`plan-card ${
                            p.highlight ? 'highlight' : ''
                        } ${p.id === '12m' ? 'best-value' : ''}`}
                    >
                        <div className="plan-topline">
                            <span className="plan-eyebrow">{isEn ? 'Access plan' : 'Plan de acceso'}</span>
                            <span className="plan-badge">{planBadge(p)}</span>
                        </div>
                        <h3 className="plan-name">{dayWord(p.name)}</h3>

                        <div className="price-row">
                            <div className="price">
                                <span className="price-currency">US$</span>
                                <span className="amount">
                                    {Number(p.monthly).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            <div className={`save ${p.save ? '' : 'save-neutral'}`}>
                                {p.save ? saveTpl.replace('{amount}', p.save.amount) : (isEn ? 'No annual commitment' : 'Sin compromiso anual')}
                            </div>
                        </div>

                        <div className="features-heading">{isEn ? 'Includes' : 'Incluye'}</div>
                        <ul className="features">
                            {benefits.map((benefit, index) => <li key={index}><CheckRoundedIcon className="feature-check" aria-hidden="true" /><span>{benefit}</span></li>)}
                        </ul>

                        <div className="plan-footer">
                        <p className="plan-note"><AutoAwesomeRoundedIcon aria-hidden="true" /><span>{planNote(p)}</span></p>
                        <button
                            type="button"
                            className={`btn-pill ${
                                p.highlight ? 'fill' : 'outline'
                            }`}
                            onClick={(e) => {
                            sendGTMEvent({ 
                                event: 'begin_checkout',
                                value: p.total,
                                currency: 'USD',
                                ecommerce: {
                                    currency: 'USD',
                                    value: p.total,
                                    items: [
                                        {
                                            item_id: p.id,
                                            item_name: `Plan ${p.name} days`,
                                            price: p.total,
                                            quantity: 1
                                        }
                                    ]
                                }
                            });

                            // Track plan click (fire-and-forget)
                            try { httpService.postData('metrics/plan-click', { planId: p.id }); } catch {}

                            console.log('User ID at plan selection:', userId);
                            if (!userId) {
                                    setNotLoggedInModal(true);
                                    return;
                                }


                                e.preventDefault();
                                setSelectedPlan(p);
                                setShowModal(true);
                            }}
                        >
                            <span>{chooseTpl.replace('{name}', dayWord(p.name))}</span>
                            <ArrowOutwardRoundedIcon aria-hidden="true" />
                        </button>
                        </div>
                    </article>
                ))}
            </div>

            {showFinePrint && <p className="fine-print">{finePrint}</p>}

            {/* Modal de métodos de pago usando SimplyModal */}
            <SimplyModal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={ isEn ? 'Select payment method' : 'Selecciona un método de pago' }
                brand="STL Hub"
            >
                <div className="payment-method-list">
                    <button
                        className="payment-method-btn is-primary"
                        type="button"
                        onClick={() => {
                            if (!selectedPlan) setSelectedPlan(plans[0]);
                            beginPaymentAttempt('MERCADOPAGO', selectedPlan || plans[0]);
                            setShowModal(false);
                            setPaymentMethod('mercadopago');
                            setPaymentModalOpen(true);
                        }}
                    >
                        <span className="payment-method-content">
                            <span className="payment-method-text">
                                <span className="payment-method-title">
                                    {isEn ? 'Latin America & Colombia' : 'Latinoamérica & Colombia'}
                                </span>
                                <span className="payment-method-subtitle">
                                    {isEn
                                        ? 'Mercado Pago, PSE, Nequi and Credit Cards'
                                        : 'Mercado Pago, PSE, Nequi y Tarjetas de crédito'}
                                </span>
                            </span>
                            <span className="payment-method-logo" aria-hidden>
                                <img src="/payments_logos/mercado-pago-logo.png" alt="Mercado Pago" />
                            </span>
                        </span>
                    </button>
                    <button
                        className="payment-method-btn"
                        type="button"
                        onClick={() => {
                            if (!selectedPlan) setSelectedPlan(plans[0]);
                            beginPaymentAttempt('PAYPAL', selectedPlan || plans[0]);
                            setShowModal(false);
                            setPaymentMethod('paypal');
                            setPaymentModalOpen(true);
                        }}
                    >
                        <span className="payment-method-content">
                            <span className="payment-method-text">
                                <span className="payment-method-title">
                                    {isEn ? 'Card / PayPal' : 'Tarjeta / PayPal'}
                                </span>
                                <span className="payment-method-subtitle">
                                    {isEn
                                        ? 'Accept payments with PayPal and credit cards'
                                        : 'Recibe pagos con PayPal y tarjeta de crédito'}
                                </span>
                            </span>
                            <span className="payment-method-logo is-paypal" aria-hidden>
                                <img src="/payments_logos/paypal-logo.png" alt="PayPal" />
                            </span>
                        </span>
                    </button>
                </div>
                <div
                    className="payment-method-plan-summary"
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
                <div className="payment-summary-icons" aria-hidden>
                    <img
                        className="payment-summary-icon secure"
                        src="/payments_logos/100-secure.png"
                        alt=""
                    />
                    <img
                        className="payment-summary-icon"
                        src="/payments_logos/warranty.png"
                        alt=""
                    />
                </div>
            </SimplyModal>

            {/* Modal específico del método de pago: muestra PayButton para PayPal o placeholder para tarjeta */}
            <SimplyModal
                open={paymentModalOpen}
                onClose={closePaymentModal}
                title={
                    paymentMethod === 'mercadopago'
                        ? 'MercadoPago'
                        : paymentMethod === 'paypal'
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
                    {paymentMethod === 'mercadopago' && (
                        <div style={{ minWidth: 320, maxWidth: '100%' }}>
                            <p style={{ color: '#333', textAlign: 'center' }}>
                                {isEn
                                    ? 'Pay securely with Mercado Pago, PSE, Nequi and cards.'
                                    : 'Paga de forma segura con Mercado Pago, PSE, Nequi y tarjetas.'}
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
                                    disabled={isMercadoPagoLoading}
                                    onClick={handleMercadoPagoCheckout}
                                    style={{ minWidth: 220 }}
                                >
                                    {isMercadoPagoLoading
                                        ? isEn
                                            ? 'Redirecting...'
                                            : 'Redirigiendo...'
                                        : isEn
                                        ? 'Continue with Mercado Pago'
                                        : 'Continuar con Mercado Pago'}
                                </button>
                            </div>
                        </div>
                    )}

                    {paymentMethod === 'paypal' && (
                        <div
                            style={{
                                width: '100%',
                                backgroundColor: '#fff',
                            }}
                        >
                            <PayButton 
                                plan={selectedPlan}
                                userId={userId}
                                attemptId={attemptId}
                            />
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

            {
                !userId && (
                     <SimplyModal
                            open={notLoggedInModal}
                            onClose={() => setNotLoggedInModal(false)}
                            title={`${isEn ? 'You must be logged in' : 'Debes iniciar sesión'}`}
                        >
                            <p style={{ color: '#ffffff', textAlign: 'center' }}>
                                {isEn
                                    ? 'You need to be logged in to select a plan and proceed with payment.'
                                    : 'Debes iniciar sesión para seleccionar un plan y continuar con el pago.'}
                            </p>
                            <Button 
                                href="/login"
                                as='link'
                                variant="purple"
                                width="160px"
                            >
                                {isEn ? 'Log in' : 'Iniciar sesión'}
                            </Button>
                        </SimplyModal>
                )
            }

            {!promo.active && <SocialProofPopup />}
        </section>
    );
};

export default PricingSection;
