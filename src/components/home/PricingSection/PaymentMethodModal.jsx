'use client';

import SimplyModal from '../../common/SimplyModal/SimplyModal';
import './PaymentMethodModal.scss';

function PaymentIcon({ name, className = '' }) {
  const paths = {
    card: <><rect x="4" y="8" width="40" height="31" rx="4" /><path d="M4 16h40M11 29h12" /></>,
    calendar: <><rect x="7" y="10" width="34" height="32" rx="4" /><path d="M15 5v10M33 5v10M7 20h34M16 28h1m14 0h1m-16 7h1m14 0h1" /></>,
    coins: <><ellipse cx="30" cy="10" rx="13" ry="6" /><path d="M17 10v9c0 3.3 5.8 6 13 6s13-2.7 13-6v-9M24 33c10 1 19-2 19-6v-8" /><ellipse cx="17" cy="29" rx="13" ry="6" /><path d="M4 29v9c0 3.3 5.8 6 13 6s13-2.7 13-6v-9" /></>,
    secure: <><path d="M24 3c7 5 13 7 18 8v13c0 10-7 18-18 23C13 42 6 34 6 24V11c5-1 11-3 18-8Z" /><path d="m15 24 6 6 13-14" /></>,
    protection: <><path d="M24 3c7 5 13 7 18 8v13c0 10-7 18-18 23C13 42 6 34 6 24V11c5-1 11-3 18-8Z" /><rect x="17" y="22" width="14" height="14" rx="2" /><path d="M20 22v-5a4 4 0 0 1 8 0v5M24 28v3" /></>,
  };

  return <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

function CardLogo() {
  return <span className="payment-logo-tile payment-logo-tile--card"><PaymentIcon name="card" /></span>;
}

export default function PaymentMethodModal({ open, onClose, selectedPlan, isEn, onSelect }) {
  const duration = Number(selectedPlan?.name || 0);
  const days = isEn ? (duration === 1 ? 'day' : 'days') : (duration === 1 ? 'día' : 'días');
  const total = Number(selectedPlan?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <SimplyModal
      open={open}
      onClose={onClose}
      title={isEn ? 'Select a payment method' : 'Selecciona un método de pago'}
      brand={<><span className="payment-brand-mark" aria-hidden="true" /><span>STL Hub</span></>}
      className="payment-selection-modal"
      closeLabel={isEn ? 'Close' : 'Cerrar'}
      ariaLabelledBy="payment-selection-title"
    >
      <div className="payment-method-list">
        <button className="payment-method-btn is-primary" type="button" onClick={() => onSelect('mercadopago')}>
          <span className="payment-method-text">
            <span className="payment-method-title">{isEn ? 'Latin America & Colombia' : 'Latinoamérica & Colombia'}</span>
            <span className="payment-method-subtitle">{isEn ? 'Mercado Pago, PSE, Nequi and credit cards' : 'Mercado Pago, PSE, Nequi y Tarjetas de crédito'}</span>
          </span>
          <span className="payment-method-logos" aria-hidden="true">
            <span className="payment-logo-tile payment-logo-tile--mercado"><img src="/payments_logos/mercado-pago-logo.png" width="88" height="88" alt="" /></span>
            <span className="payment-logo-tile payment-logo-tile--pse"><img src="/payments_logos/pse-logo.png" width="88" height="88" alt="" /></span>
            <span className="payment-logo-tile payment-logo-tile--nequi"><img src="/payments_logos/nequi-logo.svg" width="88" height="88" alt="" /></span>
            <CardLogo />
          </span>
        </button>

        <button className="payment-method-btn" type="button" onClick={() => onSelect('paypal')}>
          <span className="payment-method-text">
            <span className="payment-method-title">{isEn ? 'Card / PayPal' : 'Tarjeta / PayPal'}</span>
            <span className="payment-method-subtitle">{isEn ? 'Pay with PayPal and credit cards' : 'Recibe pagos con PayPal y tarjeta de crédito'}</span>
          </span>
          <span className="payment-method-logos payment-method-logos--paypal" aria-hidden="true">
            <span className="payment-logo-tile payment-logo-tile--paypal"><img src="/payments_logos/paypal-logo.png" width="120" height="88" alt="" /></span>
            <CardLogo />
          </span>
        </button>
      </div>

      <div className="payment-selection-divider" />
      {selectedPlan && (
        <div className="payment-method-plan-summary">
          <span className="payment-plan-detail"><PaymentIcon name="calendar" /><span><strong>Plan:</strong> {duration} {days}</span></span>
          <span className="payment-plan-detail"><PaymentIcon name="coins" /><span><strong>Total:</strong> US$ {total}</span></span>
        </div>
      )}

      <div className="payment-security-badges">
        <span className="payment-security-badge"><PaymentIcon name="secure" /><span>{isEn ? '100% SECURE' : '100% SEGURO'}</span></span>
        <span className="payment-security-separator" aria-hidden="true" />
        <span className="payment-security-badge payment-security-badge--protection"><PaymentIcon name="protection" /><span>{isEn ? <>EXTENDED<br />PROTECTION</> : <>PROTECCIÓN<br />EXTENDIDA</>}</span></span>
      </div>
    </SimplyModal>
  );
}
