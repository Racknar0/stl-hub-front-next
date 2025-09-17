"use client";
import React from 'react'
import './Account.scss'

const Account = () => {
  const mockUser = { email: 'demo@stlhub.io', plan: '6 meses', status: 'active', renew: '12/12/2025' }
  const history = Array.from({length:7}).map((_,i)=>({ id:i+1, name:`Modelo ${i+1}`, date:`2025-09-${(10+i).toString().padStart(2,'0')}` }))

  return (
    <section className="account container-narrow">
      <div className="card">
        <h4>Mi suscripción</h4>
        <p><strong>Usuario:</strong> {mockUser.email}</p>
        <p><strong>Plan:</strong> {mockUser.plan}</p>
        <p><strong>Estado:</strong> {mockUser.status}</p>
        <p><strong>Próxima renovación:</strong> {mockUser.renew}</p>
        <div style={{display:'flex', gap:'.5rem'}}>
          <button className="btn-pill outline">Cambiar plan</button>
          <button className="btn-pill fill">Gestionar pago</button>
        </div>
      </div>

      <div className="card">
        <h4>Actividad</h4>
        <div className="kpis">
          <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>12</div><div>Descargas este mes</div></div>
          <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>3</div><div>Días restantes</div></div>
          <div className="kpi"><div style={{fontWeight:800, fontSize:'1.3rem'}}>A</div><div>Health cuenta</div></div>
        </div>

        <h5 style={{marginTop:'1rem'}}>Historial de descargas</h5>
        <ul>
          {history.map(h=> (
            <li key={h.id} style={{display:'flex', justifyContent:'space-between', padding:'.4rem 0', borderBottom:'1px dashed #eee'}}>
              <span>{h.name}</span>
              <span style={{color:'#818199'}}>{h.date}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Account
