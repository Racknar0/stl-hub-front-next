// Textos en español para estados y motivos de PayPal / MercadoPago.

export const OUTCOMES = {
  APPROVED: { label: 'Pagado', tone: 'ok' },
  PENDING: { label: 'Pendiente', tone: 'wait' },
  REJECTED: { label: 'Rechazado', tone: 'bad' },
  ERROR: { label: 'Error', tone: 'bad' },
  ABANDONED: { label: 'Abandonó', tone: 'gone' },
  IN_PROGRESS: { label: 'En curso', tone: 'info' },
  REFUNDED: { label: 'Devuelto', tone: 'wait' },
  CHARGED_BACK: { label: 'Contracargo', tone: 'bad' },
  DISPUTED: { label: 'En disputa', tone: 'wait' },
};

// Estado del intento -> resultado para el dashboard.
export const isChargedUnsaved = (attempt) => (attempt?.events || []).some((e) => e.type === 'post_capture_failed');

export function outcomeOf(attempt) {
  if (isChargedUnsaved(attempt)) return 'ERROR';
  const s = attempt?.effectiveStatus || attempt?.status;
  if (s === 'ABANDONED') return 'ABANDONED';
  if (['STARTED', 'CHECKOUT_CREATED', 'REDIRECTED', 'RETURNED', 'CANCELLED'].includes(s)) return 'IN_PROGRESS';
  return OUTCOMES[s] ? s : 'IN_PROGRESS';
}

const DETAILS = {
  // MercadoPago
  accredited: 'Pago acreditado',
  pending_contingency: 'MercadoPago está procesando el pago',
  pending_review_manual: 'En revisión manual de MercadoPago',
  pending_waiting_payment: 'Esperando que pague (efectivo)',
  pending_waiting_transfer: 'Esperando la transferencia (PSE)',
  pending_challenge: 'Esperando validación del banco',
  cc_rejected_bad_filled_card_number: 'Número de tarjeta mal escrito',
  cc_rejected_bad_filled_date: 'Fecha de vencimiento mal escrita',
  cc_rejected_bad_filled_other: 'Datos de la tarjeta mal escritos',
  cc_rejected_bad_filled_security_code: 'Código de seguridad mal escrito',
  cc_rejected_blacklist: 'Tarjeta bloqueada por MercadoPago',
  cc_rejected_call_for_authorize: 'El banco pide autorizar el pago',
  cc_rejected_card_disabled: 'Tarjeta desactivada',
  cc_rejected_card_error: 'Error con la tarjeta',
  cc_rejected_duplicated_payment: 'Pago duplicado',
  cc_rejected_high_risk: 'Rechazado por riesgo (antifraude)',
  cc_rejected_insufficient_amount: 'Fondos insuficientes',
  cc_rejected_invalid_installments: 'Cuotas no permitidas',
  cc_rejected_max_attempts: 'Demasiados intentos con la tarjeta',
  cc_rejected_other_reason: 'El banco rechazó el pago',
  cc_amount_rate_limit_exceeded: 'Superó el límite de la tarjeta',
  rejected_by_bank: 'Rechazado por el banco',
  rejected_by_regulations: 'Rechazado por normativa',
  rejected_insufficient_data: 'Faltan datos del pagador',
  rejected_high_risk: 'Rechazado por riesgo (antifraude)',
  expired: 'El pago pendiente venció',
  by_payer: 'Cancelado por el comprador',
  by_collector: 'Cancelado por nosotros',
  bank_error: 'Error del banco',
  refunded: 'Devuelto',
  // PayPal
  INSTRUMENT_DECLINED: 'Tarjeta o cuenta PayPal rechazada',
  PAYER_ACTION_REQUIRED: 'PayPal pidió una acción al comprador',
  PAYER_CANNOT_PAY: 'El comprador no puede pagar con PayPal',
  TRANSACTION_REFUSED: 'PayPal rechazó la transacción',
  CARD_EXPIRED: 'Tarjeta vencida',
  ORDER_NOT_APPROVED: 'No aprobó el pago en PayPal',
  MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED: 'Demasiados intentos en PayPal',
  PENDING_REVIEW: 'En revisión de PayPal',
  ECHECK: 'eCheck pendiente',
  BUYER_COMPLAINT: 'Reclamo del comprador',
};

export const detailText = (code) => (code ? DETAILS[code] || code : null);

const EVENT_TEXT = {
  method_selected: 'Eligió el método de pago',
  checkout_created: 'Se creó la orden en la pasarela',
  checkout_create_failed: 'Falló crear la orden (error nuestro o de la pasarela)',
  checkout_redirect: 'Se fue a MercadoPago',
  paypal_button_clicked: 'Pulsó el botón de PayPal',
  paypal_approved: 'Aprobó en la ventana de PayPal',
  paypal_cancelled: 'Cerró la ventana de PayPal sin pagar',
  paypal_error: 'Error en el botón de PayPal',
  modal_closed: 'Cerró la ventana de pago',
  returned: 'Volvió de MercadoPago',
  provider_status: 'La pasarela informó el estado',
  confirm_failed: 'Error nuestro al confirmar el pago',
  capture_declined: 'PayPal rechazó el cobro',
  capture_failed: 'Falló el cobro en PayPal',
  post_capture_failed: 'COBRADO pero falló activar la suscripción',
};

const SOURCE_TEXT = { client: 'navegador', server: 'servidor', callback: 'vuelta', webhook: 'aviso MP' };

const PROVIDER_STATUS_TEXT = {
  approved: 'aprobado',
  completed: 'aprobado',
  pending: 'pendiente',
  in_process: 'en proceso',
  rejected: 'rechazado',
  declined: 'rechazado',
  cancelled: 'cancelado',
  refunded: 'devuelto',
  charged_back: 'contracargo',
  in_mediation: 'en disputa',
};

export function eventText(ev) {
  let text = EVENT_TEXT[ev.type] || ev.type;
  if (ev.type === 'provider_status') {
    const st = PROVIDER_STATUS_TEXT[String(ev.status || '').toLowerCase()] || ev.status;
    text = `Pasarela: ${st || 'sin estado'}`;
    const d = detailText(ev.detail);
    if (d) text += ` — ${d}`;
  } else if (ev.type === 'returned') {
    const st = PROVIDER_STATUS_TEXT[String(ev.detail || '').toLowerCase()] || ev.detail;
    text = ev.detail === 'sin_pago' ? 'Volvió de MercadoPago sin pagar' : `Volvió de MercadoPago (${st || 'sin estado'})`;
  } else if (['capture_declined', 'capture_failed', 'paypal_error', 'confirm_failed', 'checkout_create_failed'].includes(ev.type) && ev.detail) {
    text += ` — ${detailText(ev.detail)}`;
  } else if (ev.type === 'paypal_button_clicked' && ev.detail) {
    text += ev.detail === 'card' ? ' (tarjeta)' : ` (${ev.detail})`;
  }
  return { text, source: SOURCE_TEXT[ev.source] || ev.source };
}

export function methodText(method) {
  if (!method) return null;
  const [type, id] = String(method).split(':');
  const TYPES = { credit_card: 'Tarjeta crédito', debit_card: 'Tarjeta débito', bank_transfer: 'Transferencia', ticket: 'Efectivo', account_money: 'Saldo MP', card: 'Tarjeta', paypal: 'PayPal' };
  const base = TYPES[type] || type;
  return id ? `${base} · ${id.toUpperCase() === 'PSE' ? 'PSE' : id}` : base;
}

// Resumen corto: por qué terminó así o en qué paso se quedó.
export function reasonText(attempt) {
  const events = attempt.events || [];
  const has = (t) => events.some((e) => e.type === t);
  const outcome = outcomeOf(attempt);
  if (has('post_capture_failed')) return 'Cobrado en PayPal pero falló al guardar: revisar a mano';
  const d = detailText(attempt.statusDetail);
  if (outcome === 'APPROVED') return d && d !== 'Pago acreditado' ? d : 'Pago aprobado';
  if (['REJECTED', 'PENDING', 'REFUNDED', 'CHARGED_BACK', 'DISPUTED'].includes(outcome) && d) return d;
  if (outcome === 'ERROR') {
    const errEv = [...events].reverse().find((e) => e.status === 'ERROR');
    return errEv ? eventText(errEv).text : 'Error';
  }
  const triedToPay = has('provider_status') || has('capture_declined') || has('capture_failed') || has('paypal_approved');
  if (triedToPay) return 'Intentó pagar y no terminó';
  if (has('paypal_cancelled')) return 'Abrió PayPal y cerró sin pagar';
  if (has('returned')) return 'Volvió de MercadoPago sin pagar';
  if (has('checkout_redirect')) return 'Fue a MercadoPago y no volvió';
  if (has('paypal_button_clicked')) return 'Abrió PayPal y no terminó';
  if (has('modal_closed')) return 'Cerró la ventana antes de ir a pagar';
  return 'Eligió el método y no siguió';
}

// Etapas del embudo alcanzadas por el intento.
export function funnelStages(attempt) {
  const events = attempt.events || [];
  const has = (...types) => events.some((e) => types.includes(e.type));
  const created = Boolean(attempt.externalCheckoutId) || has('checkout_created');
  const opened = has('checkout_redirect', 'paypal_button_clicked', 'returned', 'provider_status', 'paypal_approved');
  const tried = has('provider_status', 'paypal_approved', 'capture_declined', 'capture_failed');
  const paid = Boolean(attempt.paidAt) || ['APPROVED', 'REFUNDED', 'CHARGED_BACK', 'DISPUTED'].includes(attempt.status);
  return [true, created, opened || tried || paid, tried || paid, paid];
}

export const FUNNEL_LABELS = ['Eligió el método', 'Orden creada', 'Abrió la pasarela', 'Intentó pagar', 'Pagado'];
