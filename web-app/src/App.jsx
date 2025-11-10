import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AdminDashboard from './admin/AdminDashboard'
import SiteLayout from './layouts/SiteLayout'
import HomePage from './user/HomePage'
import StreetDirectory from './user/StreetDirectory'
import NotFound from './user/NotFound'
import NavigationPage from './user/NavigationPage'

function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminDashboard />} />

      <Route path="/" element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="directory" element={<StreetDirectory />} />
        <Route path="navigation" element={<NavigationPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
