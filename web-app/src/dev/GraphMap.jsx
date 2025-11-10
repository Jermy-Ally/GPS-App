import React, { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

import './DeveloperPages.css'

const EDGE_SOURCE_ID = 'dev-graph-edges'
const NODE_SOURCE_ID = 'dev-graph-nodes'

const GraphMap = ({ nodes = [], edges = [] }) => {
  const mapRef = useRef(null)

  const bounds = useMemo(() => {
    if (!nodes.length) {
      return null
    }

    const lngLatBounds = new mapboxgl.LngLatBounds()
    nodes.forEach((node) => {
      if (node.longitude !== undefined && node.latitude !== undefined) {
        lngLatBounds.extend([node.longitude, node.latitude])
      }
    })

    return lngLatBounds.isEmpty() ? null : lngLatBounds
  }, [nodes])

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) {
      console.warn('GraphMap: Missing VITE_MAPBOX_TOKEN')
      return
    }

    mapboxgl.accessToken = token
    const container = document.getElementById('dev-graph-map')

    if (!container) {
      console.error('GraphMap: Map container not found')
      return
    }

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [21.416, -5.352],
      zoom: 12
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }))
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }))

    map.on('load', () => {
      if (!map.getSource(EDGE_SOURCE_ID)) {
        map.addSource(EDGE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        })
      }

      if (!map.getLayer(EDGE_SOURCE_ID)) {
        map.addLayer({
          id: EDGE_SOURCE_ID,
          type: 'line',
          source: EDGE_SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              1,
              14,
              4
            ],
            'line-opacity': 0.6
          }
        })
      }

      if (!map.getSource(NODE_SOURCE_ID)) {
        map.addSource(NODE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        })
      }

      if (!map.getLayer(NODE_SOURCE_ID)) {
        map.addLayer({
          id: NODE_SOURCE_ID,
          type: 'circle',
          source: NODE_SOURCE_ID,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              3,
              14,
              6
            ],
            'circle-color': '#1d4ed8',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
          }
        })
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const nodeLookup = new Map(nodes.map((node) => [node.id, node]))

    const edgeFeatures = edges
      .map((edge) => {
        const from = nodeLookup.get(edge.from)
        const to = nodeLookup.get(edge.to)

        if (!from || !to) {
          return null
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [from.longitude, from.latitude],
              [to.longitude, to.latitude]
            ]
          },
          properties: {
            from: edge.from,
            to: edge.to,
            cost: edge.cost
          }
        }
      })
      .filter(Boolean)

    const nodeFeatures = nodes.map((node) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [node.longitude, node.latitude]
      },
      properties: {
        id: node.id,
        streetId: node.streetId,
        sequence: node.sequence
      }
    }))

    const updateSources = () => {
      const edgeSource = map.getSource(EDGE_SOURCE_ID)
      if (edgeSource) {
        edgeSource.setData({
          type: 'FeatureCollection',
          features: edgeFeatures
        })
      }

      const nodeSource = map.getSource(NODE_SOURCE_ID)
      if (nodeSource) {
        nodeSource.setData({
          type: 'FeatureCollection',
          features: nodeFeatures
        })
      }

      if (bounds) {
        map.fitBounds(bounds, { padding: 40, duration: 0 })
      }
    }

    if (map.isStyleLoaded()) {
      updateSources()
    } else {
      const onLoad = () => {
        updateSources()
        map.off('load', onLoad)
      }
      map.on('load', onLoad)
      return () => {
        map.off('load', onLoad)
      }
    }
  }, [nodes, edges, bounds])

  return (
    <div className="dev-map-wrapper">
      <div id="dev-graph-map" className="dev-map-canvas" />
    </div>
  )
}

export default GraphMap


