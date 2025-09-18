'use client'
import React from 'react'
import Sidebar from '../../../components/dashboard/Sidebar/Sidebar'

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-content p-3">
        {children}
      </main>
    </div>
  )
}
