import React from 'react'
import MarketingTabs from './MarketingTabs'
import './Marketing.scss'

export default function MarketingLayout({ children }) {
  return (
    <div className="mk">
      <MarketingTabs />

      {children}
    </div>
  )
}
