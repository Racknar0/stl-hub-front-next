// Seguimiento de intentos de pago (PayPal / MercadoPago).
// Todo es "fire and forget": si falla, el flujo de pago sigue igual.
import HttpService from '@/services/HttpService';

const http = new HttpService();
const MP_ATTEMPT_KEY = 'stlhub_mp_attempt';

// Crea el intento cuando el usuario elige el método. Devuelve el id o null.
export async function startPaymentAttempt(provider, planId) {
  try {
    const res = await http.postData('payments/attempts', { provider, planId });
    return res?.data?.attemptId || null;
  } catch {
    return null;
  }
}

export function trackPaymentAttemptEvent(attemptId, type, { detail = null, data = null } = {}) {
  if (!attemptId) return Promise.resolve();
  return http
    .postData(`payments/attempts/${attemptId}/events`, { type, detail, data })
    .catch(() => {});
}

// Espera una promesa como máximo `ms` milisegundos (para no frenar el pago).
export function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function rememberMercadoPagoAttempt(attemptId, preferenceId) {
  try {
    sessionStorage.setItem(MP_ATTEMPT_KEY, JSON.stringify({ attemptId, preferenceId, at: Date.now() }));
  } catch {}
}

export function readMercadoPagoAttempt() {
  try {
    const raw = sessionStorage.getItem(MP_ATTEMPT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
