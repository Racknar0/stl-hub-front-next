const ACTIVE = new Set(['queued', 'running']);
const TERMINAL = new Set(['succeeded', 'partial', 'failed', 'interrupted']);
const deliveredReports = new Set();
const deliveringReports = new Map();

export const isCleanupJobActive = job => ACTIVE.has(job?.status);
export const initialCleanupJobState = () => ({
  job: null, plan: null, report: null, checking: true, pending: false,
  reconnecting: false, uncertain: false, authBlocked: false, warning: '', error: '', diagnostics: null,
});

const isConnectionFailure = error => !error?.response || [408, 429].includes(error.response.status) || error.response.status >= 500;
const isAuthFailure = error => [401, 403].includes(error?.response?.status);
const failureMessage = error => error?.response?.data?.message || error?.response?.data?.error?.message;

export function notifyCleanupJobReport(job, ownerId, onComplete, { requireResult = true } = {}) {
  if (job?.kind !== 'execute' || !TERMINAL.has(job.status) || requireResult && !job.result) return;
  if (typeof onComplete !== 'function') return;
  const key = `${ownerId}:${job.id}`;
  if (deliveredReports.has(key)) return;
  if (deliveringReports.has(key)) return deliveringReports.get(key);
  const delivery = Promise.resolve().then(() => onComplete(job.result)).then(() => {
    deliveredReports.add(key);
    while (deliveredReports.size > 2000) deliveredReports.delete(deliveredReports.values().next().value);
  }).catch(() => {}).finally(() => deliveringReports.delete(key));
  deliveringReports.set(key, delivery);
  return delivery;
}

// HTTP requests only acknowledge/read a durable server job. Closing this client
// stops its polling, never the server operation and never retries a deletion.
export function createExcessCleanupJobClient({ accountId, ownerId = '', initialJobId = null, request, onChange, onComplete, delay = 2000, schedule = setTimeout, unschedule = clearTimeout }) {
  let state = initialCleanupJobState();
  let disposed = false;
  let timer = null;
  let busy = false;
  let acknowledgement = null;
  let pinnedJobId = initialJobId;
  const controller = new AbortController();
  const url = `/accounts/${accountId}/excess`;
  const publish = patch => {
    if (disposed) return;
    state = { ...state, ...patch };
    onChange?.(state);
  };
  const stopTimer = () => { if (timer !== null) unschedule(timer); timer = null; };
  const later = () => {
    stopTimer();
    if (!disposed) timer = schedule(() => { timer = null; void poll(); }, delay);
  };
  const read = path => request('get', path, undefined, controller.signal);
  const accept = job => {
    if (!job?.id || !['preview', 'execute'].includes(job.kind) || !ACTIVE.has(job.status) && !TERMINAL.has(job.status)) {
      throw new Error('El servidor devolvió un estado de tarea que no se pudo interpretar.');
    }
    acknowledgement = null;
    const patch = { job, checking: false, pending: false, reconnecting: false, uncertain: false, warning: '', error: '', diagnostics: null };
    if (job.kind === 'preview') {
      patch.report = null;
      patch.plan = job.status === 'succeeded' ? job.result || null : null;
    } else if (job.result) patch.report = job.result;
    if (job.error) {
      patch.error = job.error.message || 'La tarea se detuvo. Consulta el resultado antes de continuar.';
      patch.diagnostics = job.error.details || null;
    } else if (job.status === 'interrupted') patch.error = 'La tarea se interrumpió en el servidor. Revisa el resultado y vuelve a calcular cuando quieras continuar; no se reiniciará automáticamente.';
    else if (job.status === 'failed') patch.error = 'El servidor no pudo completar la tarea. Revisa el resultado antes de volver a calcular.';
    publish(patch);
    notifyCleanupJobReport(job, ownerId, onComplete);
    if (ACTIVE.has(job.status)) later();
    else stopTimer();
  };
  const reconnect = () => {
    publish({ checking: false, pending: false, reconnecting: true, uncertain: Boolean(acknowledgement), warning: acknowledgement
      ? 'Se perdió la conexión al enviar la solicitud. Estamos comprobando si el servidor la recibió; no se volverá a enviar automáticamente.'
      : isCleanupJobActive(state.job)
        ? 'Reconectando. La operación continúa en el servidor; no hace falta iniciarla otra vez.'
        : 'Reconectando con el servidor para recuperar el estado de la tarea.' });
    later();
  };
  const readFailure = error => {
    if (isAuthFailure(error)) {
      stopTimer();
      publish({ checking: false, pending: false, reconnecting: false, authBlocked: true, uncertain: Boolean(acknowledgement), warning: '', diagnostics: null,
        error: error.response.status === 401 ? 'Tu sesión caducó. Vuelve a iniciar sesión para recuperar el estado de la tarea.' : 'No tienes permiso para consultar esta tarea. Revisa tu sesión o tus permisos antes de continuar.',
      });
    } else if (pinnedJobId && [404, 410].includes(error?.response?.status)) {
      stopTimer();
      publish({ job: null, checking: false, pending: false, reconnecting: false, uncertain: false, warning: '',
        error: 'Esta tarea ya no está disponible en el historial del servidor. No se ha iniciado otra operación. Puedes calcular una nueva vista previa si la necesitas.',
      });
    } else reconnect();
  };
  async function current({ autoPreview = false } = {}) {
    if (pinnedJobId) {
      const payload = await read(`${url}/jobs/${pinnedJobId}`);
      if (disposed) return;
      if (!payload?.job || payload.job.id !== pinnedJobId) throw new Error('No se pudo recuperar la tarea seleccionada.');
      accept(payload.job);
      return;
    }
    const payload = await read(`${url}/jobs/current`);
    if (disposed) return;
    const job = payload?.job || null;
    if (acknowledgement && (!job || job.id === acknowledgement.previousJobId || job.kind !== acknowledgement.kind)) {
      // A successful CURRENT read reconciles a lost POST acknowledgement. Only
      // an explicit next click can resubmit, using the same idempotent plan ID.
      acknowledgement = null;
      publish({ checking: false, pending: false, uncertain: false, reconnecting: false,
        warning: 'La consulta del servidor no muestra una nueva tarea. Puedes comprobar el estado otra vez o volver a solicitarla.',
      });
      stopTimer();
      return;
    }
    if (job) {
      accept(job);
      return;
    }
    publish({ job: null, checking: false, pending: false, reconnecting: false, uncertain: false, warning: '' });
    if (autoPreview) {
      busy = false;
      await submit('preview');
    }
  }
  async function poll() {
    if (disposed || busy || state.authBlocked) return;
    busy = true;
    try {
      if (pinnedJobId || acknowledgement || state.reconnecting || !state.job?.id) await current();
      else {
        const payload = await read(`${url}/jobs/${state.job.id}`);
        if (!disposed) accept(payload?.job);
      }
    } catch (error) { if (!disposed) readFailure(error); }
    finally { busy = false; }
  }
  async function submit(kind, body = {}) {
    if (disposed || busy || state.checking || state.pending || state.uncertain || state.reconnecting || state.authBlocked || isCleanupJobActive(state.job)) return;
    busy = true;
    stopTimer();
    pinnedJobId = null;
    acknowledgement = { kind, previousJobId: state.job?.id || null };
    publish({ pending: true, error: '', diagnostics: null, warning: '' });
    try {
      const originalAccountId = Number(state.job?.requestedAccountId);
      const targetUrl = kind === 'execute' && Number.isSafeInteger(originalAccountId) && originalAccountId > 0 ? `/accounts/${originalAccountId}/excess` : url;
      const payload = await request('post', `${targetUrl}/${kind}`, body, controller.signal);
      if (!disposed) accept(payload?.job);
    } catch (error) {
      if (disposed) return;
      if (isConnectionFailure(error)) {
        reconnect();
        try { await current(); }
        catch (readError) { if (!disposed) readFailure(readError); }
      } else {
        acknowledgement = null;
        if (isAuthFailure(error)) { readFailure(error); return; }
        const existingJob = error?.response?.data?.details?.job || error?.response?.data?.job;
        if (error?.response?.status === 409 && existingJob?.id) {
          accept(existingJob);
          return;
        }
        publish({ pending: false, checking: false, uncertain: false, reconnecting: false,
          error: failureMessage(error) || 'El servidor rechazó la solicitud. Revisa la vista previa antes de continuar.',
          diagnostics: error?.response?.data?.details || null,
        });
      }
    } finally { busy = false; }
  }
  return {
    getState: () => state,
    async start() {
      if (disposed || busy || state.authBlocked) return;
      busy = true;
      publish({ checking: true });
      try { await current({ autoPreview: true }); }
      catch (error) { if (!disposed) readFailure(error); }
      finally { busy = false; }
    },
    preview: () => submit('preview'),
    execute: planId => submit('execute', { planId, confirm: true }),
    async refresh() {
      if (disposed || busy || state.authBlocked) return;
      busy = true;
      stopTimer();
      publish({ checking: true });
      try { await current(); }
      catch (error) { if (!disposed) readFailure(error); }
      finally { busy = false; }
    },
    dispose() { disposed = true; stopTimer(); controller.abort(); },
  };
}
