import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './SiteLayout.css'

const SiteLayout = () => {
  return (
    <div className="site-layout">
      <header className="site-header">
        <div className="site-brand">
          <NavLink to="/" className="site-brand-link">
            GPS Navigator
          </NavLink>
        </div>
        <nav className="site-nav" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Home
          </NavLink>
          <NavLink to="/directory" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Street Directory
          </NavLink>
          <NavLink to="/navigation" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Plan Route
          </NavLink>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <small>© {new Date().getFullYear()} GPS Navigator — Powered by your custom street data.</small>
      </footer>
    </div>
  )
}

export default SiteLayout


