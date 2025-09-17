import React from 'react'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import SubscribeBar from '../BottomBar/SubscribeBar'

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">{children}</main>
      <SubscribeBar />
      <Footer />
    </div>
  )
}

export default Layout
