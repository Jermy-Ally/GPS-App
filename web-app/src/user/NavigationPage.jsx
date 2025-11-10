import React, { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config/api'
import MapPreview from './navigation'
import './UserPages.css'

const NavigationPage = () => {
  const [properties, setProperties] = useState([])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRequestingPath, setIsRequestingPath] = useState(false)
  const [pathError, setPathError] = useState(null)
  const [segments, setSegments] = useState([])

  useEffect(() => {
    const loadProperties = async () => {
      setLoading(true)
      setError(null)

      try {
        const [propertiesResponse, streetsResponse] = await Promise.all([
          fetch(`${API_URL}/properties`),
          fetch(`${API_URL}/streets`).catch((err) => {
            console.error('Error fetching streets for navigation view:', err)
            return null
          })
        ])

        if (!propertiesResponse.ok) {
          throw new Error('Could not load properties.')
        }

        const propertiesData = await propertiesResponse.json()

        let streetsData = []
        if (streetsResponse) {
          if (streetsResponse.ok) {
            streetsData = await streetsResponse.json()
          } else {
            console.warn('Streets request failed; navigation page will omit street names.')
          }
        }

        const streetLookup = new Map(streetsData.map((street) => [street.id, street.name]))

        const augmented = propertiesData.map((property) => {
          const propertyName = property.number || property.name || `Property ${property.id}`
          const streetName = streetLookup.get(property.street_id) || property.streetName || null

          return {
            ...property,
            propertyName,
            streetName
          }
        })

        augmented.sort((a, b) => {
          const labelA = `${a.propertyName ?? ''} ${a.streetName ?? ''}`.trim().toLowerCase()
          const labelB = `${b.propertyName ?? ''} ${b.streetName ?? ''}`.trim().toLowerCase()

          if (labelA === labelB) {
            return (a.id ?? 0) - (b.id ?? 0)
          }

          return labelA.localeCompare(labelB)
        })

        setProperties(augmented)
      } catch (err) {
        console.error('Error fetching properties:', err)
        setError(err.message || 'Failed to load properties.')
        setProperties([])
      } finally {
        setLoading(false)
      }
    }

    loadProperties()
  }, [])

  const fromProperty = useMemo(() => {
    if (!fromId) {
      return undefined
    }

    const id = Number(fromId)
    if (Number.isNaN(id)) {
      return undefined
    }

    return properties.find((property) => property.id === id)
  }, [fromId, properties])

  const toProperty = useMemo(() => {
    if (!toId) {
      return undefined
    }

    const id = Number(toId)
    if (Number.isNaN(id)) {
      return undefined
    }

    return properties.find((property) => property.id === id)
  }, [toId, properties])

  const formatCoordinate = (value) => {
    if (value === undefined || value === null) {
      return '—'
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
      return String(value)
    }

    return numeric.toFixed(5)
  }

  useEffect(() => {
    const shouldRequestPath = !!fromProperty && !!toProperty
    if (!shouldRequestPath) {
      setSegments([])
      setPathError(null)
      return
    }

    const controller = new AbortController()
    const fetchPath = async () => {
      setIsRequestingPath(true)
      setPathError(null)

      try {
        const url = new URL(`${API_URL}/navigation/path`)
        url.searchParams.set('from', fromProperty.id)
        url.searchParams.set('to', toProperty.id)

        const response = await fetch(url.toString(), { signal: controller.signal })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('One of the selected properties could not be found.')
          }
          throw new Error('Unable to compute a path at the moment.')
        }

        const data = await response.json()
        const normalizedSegments = Array.isArray(data.segments) ? data.segments : []

        const hasValidPoints = normalizedSegments.some((segment) =>
          Array.isArray(segment?.points) && segment.points.length > 0
        )

        if (!hasValidPoints) {
          throw new Error('No route found between the selected properties.')
        }

        setSegments(
          normalizedSegments.map((segment) => ({
            points: (segment.points || []).map((point) => ({
              latitude: Number(point.latitude),
              longitude: Number(point.longitude)
            }))
          }))
        )
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }
        console.error('Failed to load navigation path:', err)
        setPathError(err.message || 'Failed to load path.')
        setSegments([])
      } finally {
        if (!controller.signal.aborted) {
          setIsRequestingPath(false)
        }
      }
    }

    fetchPath()

    return () => controller.abort()
  }, [fromProperty, toProperty])

  return (
    <div className="navigation-page">
      <header className="navigation-header">
        <div>
          <h1>Plan Your Route</h1>
          <p>Select a starting property and destination. Routing will be available soon.</p>
        </div>
        <div className="navigation-meta">
          <span className="meta-chip">{properties.length} properties loaded</span>
        </div>
      </header>

      <section className="navigation-card">
        <div className="navigation-fields">
          <label className="navigation-field">
            <span className="field-label">From</span>
            <select
              value={fromId}
              onChange={(event) => setFromId(event.target.value)}
              disabled={loading || !!error}
            >
              <option value="">Select starting property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.propertyName}
                  {property.streetName ? ` — ${property.streetName}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="navigation-field">
            <span className="field-label">To</span>
            <select
              value={toId}
              onChange={(event) => setToId(event.target.value)}
              disabled={loading || !!error}
            >
              <option value="">Select destination property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.propertyName}
                  {property.streetName ? ` — ${property.streetName}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <div className="navigation-state">Loading properties…</div>}
        {error && <div className="navigation-state error">{error}</div>}

        <div className="navigation-layout">
          <div className="navigation-summary">
            <div className="summary-column">
              <h2>Start</h2>
              {fromProperty ? (
                <ul>
                  <li><strong>Property:</strong> {fromProperty.propertyName || 'N/A'}</li>
                  <li><strong>Street:</strong> {fromProperty.streetName || '—'}</li>
                  <li><strong>Reference:</strong> {fromProperty.referenceCode || '—'}</li>
                  <li>
                    <strong>Coordinates:</strong> {formatCoordinate(fromProperty.latitude)}, {formatCoordinate(fromProperty.longitude)}
                  </li>
                </ul>
              ) : (
                <p>Select a starting property to view details.</p>
              )}
            </div>

            <div className="summary-column">
              <h2>Destination</h2>
              {toProperty ? (
                <ul>
                  <li><strong>Property:</strong> {toProperty.propertyName || 'N/A'}</li>
                  <li><strong>Street:</strong> {toProperty.streetName || '—'}</li>
                  <li><strong>Reference:</strong> {toProperty.referenceCode || '—'}</li>
                  <li>
                    <strong>Coordinates:</strong> {formatCoordinate(toProperty.latitude)}, {formatCoordinate(toProperty.longitude)}
                  </li>
                </ul>
              ) : (
                <p>Select a destination property to view details.</p>
              )}
            </div>
          </div>

          <div className="navigation-map">
            <MapPreview
              from={fromProperty}
              to={toProperty}
              segments={segments}
              loading={isRequestingPath}
              error={pathError}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default NavigationPage


