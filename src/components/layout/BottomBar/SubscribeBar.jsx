'use client'

import React from 'react'
import Link from 'next/link'
import Button from '../Buttons/Button'
import './SubscribeBar.scss'

const SubscribeBar = () => {
  return (
    <div className="subscribe-bar" role="region" aria-label="Suscripción">
      <div className="container-narrow d-flex align-items-center justify-content-between gap-2">
        <div className="msg d-none d-sm-block">¿Listo para imprimir sin límites?</div>
        <Button
          as={Link}
          href="/suscripcion"
          variant="purple"
          width="140px"
          aria-label="Ir a Suscripción"
          icon={(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 17.27 18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21 12 17.27Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          )}
        >
          Suscríbete
        </Button>
      </div>
    </div>
  )
}

export default SubscribeBar
