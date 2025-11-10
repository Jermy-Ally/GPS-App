import React, { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

import './MapPreview.css'

const MAP_CONTAINER_ID = 'navigation-map-container'
const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12'

const MapPreview = ({ from, to, segments, loading, error }) => {
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const lineSourceId = useRef(`navigation-path-${Date.now()}`)
  const markersRef = useRef([])

  const hasPath = useMemo(() => Array.isArray(segments) && segments.length > 0, [segments])

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) {
      console.warn('MapPreview: Missing VITE_MAPBOX_TOKEN')
      return
    }

    mapboxgl.accessToken = token

    if (!mapContainerRef.current) {
      mapContainerRef.current = document.getElementById(MAP_CONTAINER_ID)
    }

    if (!mapContainerRef.current) {
      console.error('MapPreview: Map container not found')
      return
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: [from?.longitude ?? 21.416, from?.latitude ?? -5.352],
      zoom: 12
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }))
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }))

    map.on('load', () => {
      if (!map.getSource(lineSourceId.current)) {
        map.addSource(lineSourceId.current, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        })
      }

      if (!map.getLayer(lineSourceId.current)) {
        map.addLayer({
          id: lineSourceId.current,
          type: 'line',
          source: lineSourceId.current,
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              4,
              14,
              6
            ],
            'line-opacity': 0.85
          }
        })
      }
    })

    mapRef.current = map

    return () => {
      if (map) {
        map.remove()
      }
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }

    const createMarker = (property, color) => {
      if (!property?.longitude || !property?.latitude) {
        return null
      }

      const element = document.createElement('div')
      element.className = 'nav-map-marker'
      element.style.background = color

      if (property.propertyName) {
        element.title = `${property.propertyName}${property.streetName ? ` on ${property.streetName}` : ''}`
      }

      const marker = new mapboxgl.Marker({
        element,
        anchor: 'center'
      })
        .setLngLat([property.longitude, property.latitude])
        .addTo(map)

      return marker
    }

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    if (from) {
      const fromMarker = createMarker(from, '#16a34a')
      if (fromMarker) {
        markersRef.current.push(fromMarker)
      }
    }

    if (to) {
      const toMarker = createMarker(to, '#dc2626')
      if (toMarker) {
        markersRef.current.push(toMarker)
      }
    }
  }, [from, to])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }

    if (!hasPath) {
      const emptyData = {
        type: 'FeatureCollection',
        features: []
      }

      const source = map.getSource(lineSourceId.current)
      if (source) {
        source.setData(emptyData)
      }
      return
    }

    const features = segments
      .filter((segment) => Array.isArray(segment?.points) && segment.points.length >= 2)
      .map((segment) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: segment.points.map((point) => [point.longitude, point.latitude])
        },
        properties: {}
      }))

    if (features.length === 0) {
      return
    }

    const collection = {
      type: 'FeatureCollection',
      features
    }

    const source = map.getSource(lineSourceId.current)
    if (source) {
      source.setData(collection)
    }

    const allPoints = segments.flatMap((segment) => segment.points ?? [])
    if (allPoints.length >= 2) {
      const bounds = allPoints.reduce(
        (acc, point) =>
          acc.extend([Number(point.longitude), Number(point.latitude)]),
        new mapboxgl.LngLatBounds()
      )

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, duration: 800 })
      }
    }
  }, [segments, hasPath])

  return (
    <div className="navigation-map-wrapper">
      <div id={MAP_CONTAINER_ID} className="navigation-map-canvas" />
      <div className="navigation-map-overlay">
        {loading && <div className="navigation-map-status">Calculating route…</div>}
        {!loading && error && <div className="navigation-map-status error">{error}</div>}
        {!loading && !error && !hasPath && (
          <div className="navigation-map-status">Select two properties to preview a path.</div>
        )}
      </div>
    </div>
  )
}

export default MapPreview


