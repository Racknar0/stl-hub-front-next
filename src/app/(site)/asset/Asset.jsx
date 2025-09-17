"use client";
import React from 'react'
import './Asset.scss'

const Asset = () => {
  const asset = {
    id: 1,
    title: 'Guerrero Sci‑Fi',
    images: [1,2,3].map(i=>`https://picsum.photos/seed/asset${i}/800/500`),
    dims: '120 x 80 x 60 mm',
    parts: 6,
    supports: 'Incluidos',
    license: 'Uso personal',
    tips: 'Imprime a 0.16mm, relleno 15% gyroid',
  }

  return (
    <section className="asset-view container-narrow">
      <div className="asset-gallery">
        <img src={asset.images[0]} alt={asset.title} style={{width:'100%', display:'block'}} />
      </div>
      <aside className="asset-info">
        <h2>{asset.title}</h2>
        <ul>
          <li>Dimensiones: {asset.dims}</li>
          <li>Piezas: {asset.parts}</li>
          <li>Soportes: {asset.supports}</li>
          <li>Licencia: {asset.license}</li>
        </ul>
        <p><strong>Consejos:</strong> {asset.tips}</p>
        <button className="btn-pill fill" onClick={()=>alert('Paywall / token de descarga (mock)')}>Descargar</button>
      </aside>
    </section>
  )
}

export default Asset
