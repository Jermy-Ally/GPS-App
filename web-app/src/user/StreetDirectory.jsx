import React, { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config/api'
import './UserPages.css'

const StreetDirectory = () => {
  const [streets, setStreets] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadStreets = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_URL}/streets`)
        if (!response.ok) {
          throw new Error('Failed to load street directory.')
        }

        const data = await response.json()
        setStreets(data)
      } catch (err) {
        console.error('Error loading streets', err)
        setError(err.message || 'Unable to load streets.')
      } finally {
        setLoading(false)
      }
    }

    loadStreets()
  }, [])

  const filteredStreets = useMemo(() => {
    if (!search) {
      return streets
    }

    const normalized = search.trim().toLowerCase()
    return streets.filter((street) => {
      const nameMatch = street.name?.toLowerCase().includes(normalized)
      const aliasMatch = street.alias?.toLowerCase().includes(normalized)
      const refMatch = street.referenceCode?.toLowerCase().includes(normalized)
      return nameMatch || aliasMatch || refMatch
    })
  }, [search, streets])

  return (
    <div className="directory-page">
      <header className="directory-header">
        <div>
          <h1>Street Directory</h1>
          <p>
            Search the latest street and reference code information curated by your mapping team.
          </p>
        </div>
        <div className="directory-meta">
          <span className="meta-chip">{streets.length} total streets</span>
          <span className="meta-chip">{filteredStreets.length} shown</span>
        </div>
      </header>

      <div className="directory-toolbar">
        <label htmlFor="street-search" className="visually-hidden">
          Search streets
        </label>
        <input
          id="street-search"
          className="search-input"
          type="search"
          placeholder="Search by street name, alias, or reference code..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading && <div className="directory-state">Loading street data…</div>}
      {error && <div className="directory-state error">{error}</div>}

      {!loading && !error && (
        <div className="directory-table-wrapper">
          <table className="directory-table">
            <thead>
              <tr>
                <th scope="col">Street Name</th>
                <th scope="col">Alias</th>
                <th scope="col">Length (m)</th>
                <th scope="col">Reference Code</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredStreets.map((street) => (
                <tr key={street.id}>
                  <td data-title="Street Name">{street.name || '—'}</td>
                  <td data-title="Alias">{street.alias || '—'}</td>
                  <td data-title="Length">{street.length ? street.length.toLocaleString() : '—'}</td>
                  <td data-title="Reference Code" className="ref-code">
                    {street.referenceCode || '—'}
                  </td>
                  <td data-title="Notes">{street.description || street.notes || '—'}</td>
                </tr>
              ))}
              {filteredStreets.length === 0 && (
                <tr>
                  <td colSpan={5} className="directory-state">
                    No streets matched your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default StreetDirectory


