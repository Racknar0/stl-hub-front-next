import test from 'node:test';
import assert from 'node:assert/strict';
import { createExcessCleanupJobClient, notifyCleanupJobReport } from '../src/app/(site)/dashboard/accounts/components/ExcessCleanupJobClient.js';

let sequence = 0;
const readyPlan = () => ({ planId: `plan-${++sequence}`, expiresAt: '2099-01-01T00:00:00Z', accounts: [], files: [] });
const job = (kind, status, result) => ({ id: `job-${++sequence}`, kind, status, requestedAccountId: 1, accountIds: [1, 2], progress: { phase: 'test', message: 'Procesando' }, ...(result ? { result } : {}) });
const flush = () => new Promise(resolve => setImmediate(resolve));
const responseError = (status, data) => Object.assign(new Error('HTTP request rejected'), { response: { status, data } });

function fixture(initial = null, handler) {
  let current = initial;
  let timeoutId = 0;
  const timers = new Map();
  const calls = [];
  const updates = [];
  const completed = [];
  const ownerId = `owner-${++sequence}`;
  const request = async (method, path, body, signal) => {
    calls.push({ method, path, body, signal });
    if (handler) return handler({ method, path, body, signal, current, setJob: value => { current = value; } });
    if (method === 'get') return { job: current };
    current = job(path.endsWith('preview') ? 'preview' : 'execute', 'queued');
    return { job: current };
  };
  const options = { accountId: 1, ownerId, request, onChange: value => updates.push(value), onComplete: result => completed.push(result),
    schedule: callback => { const id = ++timeoutId; timers.set(id, callback); return id; }, unschedule: id => timers.delete(id),
  };
  const client = createExcessCleanupJobClient(options);
  return { client, options, calls, updates, completed, setJob: value => { current = value; },
    async tick() { const next = timers.entries().next().value; assert.ok(next, 'A polling request must be scheduled'); timers.delete(next[0]); next[1](); await flush(); },
  };
}

test('opening reads CURRENT before requesting a preview and polls without resubmitting', async () => {
  const f = fixture();
  await f.client.start();
  assert.deepEqual(f.calls.map(call => [call.method, call.path.split('/').at(-1)]), [['get', 'current'], ['post', 'preview']]);
  const id = f.client.getState().job.id;
  f.setJob({ ...f.client.getState().job, status: 'succeeded', result: readyPlan() });
  await f.tick();
  assert.ok(f.client.getState().plan.planId);
  assert.equal(f.client.getState().job.id, id);
  assert.equal(f.calls.filter(call => call.method === 'post').length, 1);
  f.client.dispose();
});

test('reopening from Main or Backup recovers execution and terminal report exactly once', async () => {
  const running = job('execute', 'running');
  const f = fixture(running);
  await f.client.start();
  assert.equal(f.calls.filter(call => call.method === 'post').length, 0);
  f.client.dispose();
  const report = { ok: true, message: 'Completada', accounts: [], results: [] };
  f.setJob({ ...running, status: 'succeeded', result: report });
  const reopened = createExcessCleanupJobClient({ ...f.options, accountId: 2 });
  await reopened.start();
  await reopened.refresh();
  await flush();
  assert.equal(reopened.getState().report, report);
  assert.deepEqual(f.completed, [report]);
  assert.equal(f.calls.filter(call => call.method === 'post').length, 0);
  reopened.dispose();
});

test('lost execution acknowledgement reconciles CURRENT instead of retrying POST', async () => {
  const plan = readyPlan();
  const preview = job('preview', 'succeeded', plan);
  const running = job('execute', 'running');
  const f = fixture(preview, async ({ method, current, setJob }) => {
    if (method === 'post') { setJob(running); throw new Error('Connection dropped after server accepted'); }
    return { job: current };
  });
  await f.client.start();
  await f.client.execute(plan.planId);
  assert.equal(f.client.getState().job.id, running.id);
  assert.equal(f.client.getState().uncertain, false);
  assert.equal(f.client.getState().plan, plan);
  assert.equal(f.calls.filter(call => call.method === 'post').length, 1);
  f.client.dispose();
});

test('network failures keep context and block actions until successful reconciliation', async () => {
  const plan = readyPlan();
  const preview = job('preview', 'succeeded', plan);
  let offline = false;
  let posts = 0;
  const f = fixture(preview, async ({ method, current }) => {
    if (method === 'post') { posts++; offline = true; throw new Error('Offline'); }
    if (offline) throw new Error('Offline');
    return { job: current };
  });
  await f.client.start();
  await f.client.execute(plan.planId);
  assert.equal(f.client.getState().uncertain, true);
  assert.equal(f.client.getState().plan, plan);
  assert.equal(f.client.getState().job.status, 'succeeded');
  assert.match(f.client.getState().warning, /conexión/);
  await f.client.execute(plan.planId);
  await f.client.preview();
  assert.equal(posts, 1);
  offline = false;
  await f.tick();
  assert.equal(f.client.getState().uncertain, false);
  assert.equal(posts, 1, 'Successful reconciliation must not automatically resubmit');
  assert.match(f.client.getState().warning, /no muestra una nueva tarea/);
  f.client.dispose();
});

test('polling failures never turn an executing server job into a failed job', async () => {
  const running = job('execute', 'running');
  let offline = false;
  const f = fixture(running, async ({ current }) => { if (offline) throw new Error('Offline'); return { job: current }; });
  await f.client.start();
  offline = true;
  await f.tick();
  assert.equal(f.client.getState().job.status, 'running');
  assert.equal(f.client.getState().error, '');
  assert.equal(f.client.getState().reconnecting, true);
  assert.match(f.client.getState().warning, /continúa en el servidor/);
  offline = false;
  await f.tick();
  assert.equal(f.client.getState().reconnecting, false);
  assert.equal(f.calls.filter(call => call.method === 'post').length, 0);
  f.client.dispose();
});

test('a manager conflict adopts its existing job and duplicate clicks only send once', async () => {
  const plan = readyPlan();
  const existing = job('execute', 'running');
  const f = fixture(job('preview', 'succeeded', plan), async ({ method, current }) => {
    if (method === 'get') return { job: current };
    throw responseError(409, { details: { job: existing } });
  });
  await f.client.start();
  await Promise.all([f.client.execute(plan.planId), f.client.execute(plan.planId)]);
  assert.equal(f.calls.filter(call => call.method === 'post').length, 1);
  assert.equal(f.client.getState().job.id, existing.id);
  assert.equal(f.client.getState().error, '');
  f.client.dispose();
});

test('partial and interrupted jobs retain results and never restart automatically', async () => {
  const partial = { ok: false, message: 'Resultado parcial', accounts: [], results: [{ assetId: 5, completed: false }] };
  const remote = { ...job('execute', 'partial', partial), error: { message: 'Backup no disponible', details: { accounts: [] } } };
  const f = fixture(remote);
  await f.client.start();
  await f.client.refresh();
  assert.equal(f.client.getState().report, partial);
  assert.equal(f.client.getState().error, 'Backup no disponible');
  await flush();
  assert.equal(f.completed.length, 1);
  f.client.dispose();
  const g = fixture(job('execute', 'interrupted'));
  await g.client.start();
  assert.match(g.client.getState().error, /interrumpió/);
  assert.equal(g.calls.filter(call => call.method === 'post').length, 0);
  g.client.dispose();
});

test('an offline initial lookup never starts a preview until the server can be consulted', async () => {
  const f = fixture(null, async () => { throw new Error('Offline'); });
  await f.client.start();
  assert.equal(f.client.getState().reconnecting, true);
  assert.equal(f.calls.filter(call => call.method === 'post').length, 0);
  await f.client.preview();
  assert.equal(f.calls.filter(call => call.method === 'post').length, 0);
  f.client.dispose();
});

test('a preview started from Main executes through its original account after reopening from Backup', async () => {
  const plan = readyPlan();
  const original = { ...job('preview', 'succeeded', plan), requestedAccountId: 747, accountIds: [747, 748] };
  const f = fixture(original);
  const reopened = createExcessCleanupJobClient({ ...f.options, accountId: 748 });
  await reopened.start();
  await reopened.execute(plan.planId);
  assert.equal(f.calls.find(call => call.method === 'post').path, '/accounts/747/excess/execute');
  reopened.dispose();
  f.client.dispose();
});

test('report refresh deduplicates concurrent callers but retries after a rejected callback', async () => {
  const remote = job('execute', 'succeeded', { ok: true });
  let attempts = 0;
  const callback = async () => { attempts++; if (attempts === 1) throw new Error('Refresh failed'); };
  await Promise.all([notifyCleanupJobReport(remote, 'notify-owner', callback), notifyCleanupJobReport(remote, 'notify-owner', callback)]);
  assert.equal(attempts, 1);
  await notifyCleanupJobReport(remote, 'notify-owner', callback);
  assert.equal(attempts, 2);
  await notifyCleanupJobReport(remote, 'notify-owner', callback);
  assert.equal(attempts, 2);
  const missing = job('execute', 'succeeded', { ok: true });
  await notifyCleanupJobReport(missing, 'notify-owner', undefined);
  await notifyCleanupJobReport(missing, 'notify-owner', callback);
  assert.equal(attempts, 3);
});

test('401 and 403 pause polling and block actions without changing the server job status', async () => {
  for (const status of [401, 403]) {
    let authFailure = false;
    const running = job('execute', 'running');
    const f = fixture(running, async ({ current }) => {
      if (authFailure) throw responseError(status, { message: 'Not authorized' });
      return { job: current };
    });
    await f.client.start();
    authFailure = true;
    await f.tick();
    assert.equal(f.client.getState().authBlocked, true);
    assert.equal(f.client.getState().reconnecting, false);
    assert.equal(f.client.getState().job.status, 'running');
    const count = f.calls.length;
    await f.client.refresh();
    await f.client.start();
    await f.client.preview();
    await f.client.execute('old-plan');
    assert.equal(f.calls.length, count);
    assert.match(f.client.getState().error, status === 401 ? /sesión caducó/ : /permiso/);
    f.client.dispose();
  }
});

test('opening a historical job stays pinned to that exact job even when another job is current', async () => {
  const previousReport = { ok: true, message: 'Resultado anterior', accounts: [], results: [] };
  const previous = job('execute', 'succeeded', previousReport);
  const latest = job('preview', 'running');
  let offline = false;
  const f = fixture(latest, async ({ method, path }) => {
    assert.equal(method, 'get');
    if (offline) throw new Error('Offline');
    return { job: path.endsWith(`/${previous.id}`) ? previous : latest };
  });
  const pinned = createExcessCleanupJobClient({ ...f.options, initialJobId: previous.id });
  await pinned.start();
  assert.equal(pinned.getState().job.id, previous.id);
  assert.equal(pinned.getState().report, previousReport);
  offline = true;
  await pinned.refresh();
  assert.equal(pinned.getState().reconnecting, true);
  offline = false;
  await f.tick();
  assert.equal(pinned.getState().job.id, previous.id);
  assert.equal(pinned.getState().report, previousReport);
  assert.equal(f.calls.some(call => call.path.endsWith('/current')), false);
  assert.equal(f.calls.some(call => call.method === 'post'), false);
  await flush();
  assert.equal(f.completed.length, 1);
  pinned.dispose();
  f.client.dispose();
});

test('a missing historical job never falls back to CURRENT or starts a preview automatically', async () => {
  const f = fixture(null, async ({ method }) => {
    if (method === 'get') throw responseError(404, { message: 'Job expired' });
    return { job: job('preview', 'queued') };
  });
  const pinned = createExcessCleanupJobClient({ ...f.options, initialJobId: 'expired-job' });
  await pinned.start();
  assert.match(pinned.getState().error, /ya no está disponible/);
  assert.equal(pinned.getState().reconnecting, false);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].path.endsWith('/jobs/expired-job'), true);
  await pinned.preview();
  assert.equal(f.calls.filter(call => call.method === 'post').length, 1, 'Only an explicit action may request a new preview');
  pinned.dispose();
  f.client.dispose();
});
