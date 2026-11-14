'use client'

import React, { useEffect, useState } from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import Ayuda from '../Ayuda'

// ISO -> valor de <input type="datetime-local"> en hora del navegador
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function MotorAjustes({ onChange }) {
  const [motor, setMotor] = useState(null)
  const [form, setForm] = useState({ start: '', dailyLimit: '', dailyReserve: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [prueba, setPrueba] = useState({ kind: 'WELCOME_1', sending: false, msg: '' })

  const aplicar = (data) => {
    setMotor(data)
    setForm({
      start: toLocalInput(data.start),
      dailyLimit: String(data.dailyLimit),
      dailyReserve: String(data.dailyReserve),
    })
    onChange?.(data)
  }

  useEffect(() => {
    emailMarketingService
      .engine()
      .then(aplicar)
      .catch((e) => setError(e?.response?.data?.error || 'No se pudo cargar el motor'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardar = async (cambios) => {
    setSaving(true)
    setError(null)
    try {
      aplicar(await emailMarketingService.saveEngine(cambios))
    } catch (e) {
      setError(e?.response?.data?.error || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const enviarPrueba = async () => {
    setPrueba((p) => ({ ...p, sending: true, msg: '' }))
    try {
      const r = await emailMarketingService.sendTest(prueba.kind)
      setPrueba((p) => ({ ...p, sending: false, msg: `Enviado a ${r.to}` }))
    } catch (e) {
      setPrueba((p) => ({ ...p, sending: false, msg: e?.response?.data?.error || 'No se pudo enviar' }))
    }
  }

  const guardarAjustes = () =>
    guardar({
      start: form.start ? new Date(form.start).toISOString() : null,
      dailyLimit: Number(form.dailyLimit),
      dailyReserve: Number(form.dailyReserve),
    })

  const alternar = () => {
    const encender = !motor.enabled
    if (encender && !window.confirm('Se empezarán a enviar correos reales a los usuarios. ¿Encender el motor?')) return
    guardar({ enabled: encender })
  }

  if (!motor) {
    return error ? <div className="mk-note is-warn" style={{ marginBottom: '1.5rem' }}>{error}</div> : null
  }

  const proximo = motor.queue.nextAt ? new Date(motor.queue.nextAt).toLocaleString() : '—'

  return (
    <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
      <div className="mk-card-title">
        <h2>
          Motor de envíos
          <Ayuda texto="El servidor que envía los correos del embudo por su cuenta, usando Brevo solo para entregarlos. Apagado, solo prepara la cola y no envía nada." />
        </h2>
        <span className={`mk-tag ${motor.enabled ? 't-on' : 't-off'}`}>{motor.enabled ? 'Encendido' : 'Apagado'}</span>
      </div>

      {(!motor.ready.secret || !motor.ready.brevo) && (
        <div className="mk-note is-warn" style={{ marginBottom: '1rem' }}>
          <span>
            {!motor.ready.secret && <>Falta <b>EMAIL_UNSUBSCRIBE_SECRET</b> en el servidor: sin él no se puede encender. </>}
            {!motor.ready.brevo && <>Falta <b>BREVO_API_KEY</b> en el servidor.</>}
          </span>
        </div>
      )}

      <div className="mk-engine">
        <label>
          <span>
            Fecha de corte
            <Ayuda texto="Desde cuándo envía el motor. Lo que debía salir antes de esta fecha se descarta, porque ya lo cubrió Brevo. Ponla en el momento en que apagues el embudo de Brevo." />
          </span>
          <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        </label>
        <label>
          <span>
            Límite diario
            <Ayuda texto="Máximo de correos por día. El plan gratis de Brevo permite 300 y cuenta todos los correos, también los de activación y contraseña." />
          </span>
          <input type="number" min="1" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} />
        </label>
        <label>
          <span>
            Reserva
            <Ayuda texto="Cupo diario que el embudo no toca, para que siempre salgan los correos de activación y de contraseña." />
          </span>
          <input type="number" min="0" value={form.dailyReserve} onChange={(e) => setForm({ ...form, dailyReserve: e.target.value })} />
        </label>
      </div>

      <div className="mk-engine-actions">
        <button className="mk-btn" onClick={guardarAjustes} disabled={saving}>Guardar ajustes</button>
        <button className="mk-btn is-primary" onClick={alternar} disabled={saving}>
          {motor.enabled ? 'Apagar motor' : 'Encender motor'}
        </button>
        <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>
          En cola: {motor.queue.queued} · próximo envío: {proximo}
          {motor.queue.failed > 0 && ` · fallidos: ${motor.queue.failed}`}
        </span>
      </div>

      <div className="mk-engine-actions" style={{ marginTop: '1rem' }}>
        <select className="mk-btn" value={prueba.kind} onChange={(e) => setPrueba({ ...prueba, kind: e.target.value })}>
          <option value="WELCOME_1">1 · Bienvenida</option>
          <option value="WELCOME_2">2 · Premium</option>
          <option value="WELCOME_3">3 · Top descargas</option>
          <option value="WELCOME_4">4 · Planes</option>
        </select>
        <button className="mk-btn" onClick={enviarPrueba} disabled={saving || prueba.sending}>
          {prueba.sending ? 'Enviando…' : 'Enviarme una prueba'}
        </button>
        <Ayuda texto="Manda ese correo a tu propio correo de administrador, con el idioma y el enlace de baja reales, para ver cómo llega. No usa la cola ni cuenta como envío del embudo, pero sí gasta uno del cupo diario." />
        {prueba.msg && <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>{prueba.msg}</span>}
      </div>

      {motor.failures?.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div className="mk-note is-warn" style={{ marginBottom: '0.6rem' }}>
            <span>
              <b>{motor.queue.failed} correo(s) fallido(s).</b> Brevo los rechazó 3 veces y el motor dejó de reintentarlos.
              {motor.queue.failed > motor.failures.length && ` Se muestran los ${motor.failures.length} más recientes.`}
            </span>
          </div>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Paso</th>
                <th>Intentos</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {motor.failures.map((f) => (
                <tr key={f.id}>
                  <td>{f.email || '—'}</td>
                  <td>{f.kind}</td>
                  <td>{f.attempts}</td>
                  <td>{f.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <div className="mk-note is-warn" style={{ marginTop: '1rem' }}>{error}</div>}
    </section>
  )
}
