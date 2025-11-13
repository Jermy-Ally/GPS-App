import React from 'react'
import { Link } from 'react-router-dom'
import './UserPages.css'

const HomePage = () => {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Navigate With Confidence(raink8792@gmail.com This is my gmail. Can we work on outside of the platform to reduce the fee?)</h1>
          <p>
            GPS Navigator delivers up-to-date routing using your custom-curated street
            and property data. Explore the latest maps, look up address segments, and
            share accurate directions with the community.
          </p>
          <div className="hero-actions">
            <Link to="/directory" className="primary-action">
              Browse Street Directory
            </Link>
            <Link to="/navigation" className="secondary-action">
              Plan a Route
            </Link>
          </div>
        </div>
        <div className="hero-visual" role="presentation">
          <div className="map-preview">
            <span className="map-preview-pin">📍</span>
            <span className="map-preview-ring" />
            <span className="map-preview-ring lag" />
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="Highlights">
        <article className="feature-card">
          <h2>Complete Coverage</h2>
          <p>
            Every street and property entry is sourced from your admin team, ensuring the map reflects
            local knowledge and the latest infrastructure changes.
          </p>
        </article>
        <article className="feature-card">
          <h2>Reference Codes</h2>
          <p>
            Look up locations by code to streamline emergency dispatch, deliveries, and maintenance crews.
          </p>
        </article>
        <article className="feature-card">
          <h2>Collaborative Updates</h2>
          <p>
            Admins can trace new roads, adjust lengths, and manage properties directly from the in-browser editor.
          </p>
        </article>
      </section>
    </div>
  )
}

export default HomePage


