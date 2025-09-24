import { errorAlert, warningAlert } from './alerts';

// Mapea códigos backend -> mensajes usuario
const codeMessages = {
  SLUG_EXISTS: 'Ya existe un asset con ese slug. Cambia el título o edítalo.',
  SLUG_CONFLICT: 'No se pudo generar una variante única del slug. Prueba otro título.',
  NO_SUB: 'Necesitas una suscripción activa para descargar este recurso.',
  EXPIRED: 'Tu suscripción ha expirado, renueva para continuar.',
};

export function showApiError(err, fallback = 'Ha ocurrido un error') {
  // err puede venir de axios
  if (!err) {
    errorAlert('Error', fallback);
    return;
  }
  const resp = err.response;
  if (!resp) {
    errorAlert('Error', err.message || fallback);
    return;
  }
  const { status, data } = resp;
  const code = data?.code;
  const baseMsg = data?.message || fallback;
  const mapped = code ? codeMessages[code] : null;
  const finalMsg = mapped || baseMsg;

  if (status === 409) {
    // Conflictos -> warning
    warningAlert('Conflicto', finalMsg);
    return;
  }
  if (status === 403) {
    warningAlert('Acceso restringido', finalMsg);
    return;
  }
  if (status === 401) {
    warningAlert('No autorizado', finalMsg);
    return;
  }
  errorAlert('Error', finalMsg);
}
