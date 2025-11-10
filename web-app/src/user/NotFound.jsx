import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './UserPages.css'

const NotFound = () => {
  const location = useLocation()

  return (
    <div className="not-found-page">
      <h1>Page Not Found</h1>
      <p>
        We couldn't find <code>{location.pathname}</code>. Double-check the link or jump back to the home page.
      </p>
      <div className="hero-actions">
        <Link to="/" className="primary-action">
          Return Home
        </Link>
        <a href="/admin" className="secondary-action">
          Admin Console
        </a>
      </div>
    </div>
  )
}

export default NotFound


