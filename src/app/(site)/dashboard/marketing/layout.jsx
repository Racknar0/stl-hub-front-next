import React from 'react'
import MarketingTabs from './MarketingTabs'
import './Marketing.scss'

export default function MarketingLayout({ children }) {
  return (
    <div className="mk">
      <MarketingTabs />
      <div className="mk-local-note">Maqueta local · datos de ejemplo</div>

      {children}
    </div>
  )
}
