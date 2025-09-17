import React from 'react'
import './Footer.scss'

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="container-narrow footer-inner">
        <div>© {new Date().getFullYear()} STL HUB · Todos los derechos reservados</div>
        <div className="legal">
          Aviso: Esta plataforma actúa como índice de enlaces de terceros. No alojamos archivos ni reclamamos propiedad sobre el contenido enlazado.
        </div>
      </div>
    </footer>
  )
}

export default Footer
