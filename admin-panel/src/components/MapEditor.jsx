import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import axios from 'axios'
import NameInputDialog from './NameInputDialog'
import { API_URL } from '../config/api'
import './MapEditor.css'

// You'll need to add your Mapbox token here
// Get one free at https://account.mapbox.com/access-tokens/
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE'

// Default center: Luebo, Democratic Republic of the Congo
// Coordinates from client's Google Maps URL
const DEFAULT_CENTER = [21.4102312, -5.355093] // [longitude, latitude] - Note: Mapbox uses [lng, lat] format
const DEFAULT_ZOOM = 15 // Increased zoom for better visibility

function MapEditor({ streets, selectedStreet, onStreetSelect, onStreetUpdate, isCreating, onDrawingCancel }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingCoordinates, setDrawingCoordinates] = useState([])
  const [editingStreet, setEditingStreet] = useState(null)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [pendingStreetData, setPendingStreetData] = useState(null)
  const markersRef = useRef([])
  const drawingMarkersRef = useRef([]) // Track drawing markers separately
  // Use refs to track state that needs to be accessed in event handlers
  const isDrawingRef = useRef(false)
  const drawingCoordinatesRef = useRef([])

  useEffect(() => {
    // Prevent double initialization (React Strict Mode)
    if (map.current) {
      console.log('Map already initialized, skipping...')
      return
    }

    // Store ref to prevent cleanup during initialization
    let isMounted = true

    // Debug: log token status (check browser console)
    console.log('Mapbox token check:', {
      token: MAPBOX_TOKEN ? `${MAPBOX_TOKEN.substring(0, 10)}...` : 'MISSING',
      hasToken: !!MAPBOX_TOKEN,
      isPlaceholder: MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE'
    })

    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE') {
      console.error('Mapbox token is missing! Please create admin-panel/.env file with VITE_MAPBOX_TOKEN=your_token')
      // Show a visible error message on the map container
      if (mapContainer.current) {
        mapContainer.current.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; background: #f5f5f5;">
            <h2 style="color: #dc3545; margin-bottom: 10px;">⚠️ Mapbox Token Required</h2>
            <p style="color: #666; margin-bottom: 15px;">The map cannot load without a Mapbox access token.</p>
            <div style="background: white; padding: 15px; border-radius: 8px; max-width: 500px; text-align: left;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">To fix this:</p>
              <ol style="margin: 0; padding-left: 20px; color: #333;">
                <li>Get a free token at <a href="https://account.mapbox.com/access-tokens/" target="_blank" style="color: #007bff;">account.mapbox.com</a></li>
                <li>Create a file named <code>.env</code> in the <code>admin-panel</code> folder</li>
                <li>Add this line: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">VITE_MAPBOX_TOKEN=your_token_here</code></li>
                <li><strong>Restart the dev server</strong> (Ctrl+C then npm run dev)</li>
              </ol>
              <p style="margin: 10px 0 0 0; color: #dc3545; font-size: 0.9em;"><strong>Important:</strong> After adding the token, you MUST restart the server!</p>
            </div>
          </div>
        `
      }
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    // Debug: Check container dimensions
    if (mapContainer.current) {
      const rect = mapContainer.current.getBoundingClientRect()
      console.log('Map container dimensions:', {
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      })
    }

    console.log('Initializing Mapbox map...')
    
    try {
      // Use satellite style to see the terrain clearly (as client provided Google Maps satellite view)
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12', // Satellite view like Google Maps
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
        // Ensure map is visible
        antialias: true
      })
      
      console.log('Map initialized with center:', DEFAULT_CENTER, 'zoom:', DEFAULT_ZOOM)
      
      console.log('Map configuration:', {
        container: mapContainer.current ? 'exists' : 'missing',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        token: MAPBOX_TOKEN.substring(0, 15) + '...'
      })

      console.log('Mapbox Map object created successfully')

      // Add timeout to detect if map never loads
      const loadTimeout = setTimeout(() => {
        if (!mapLoaded) {
          console.warn('Map load timeout - map did not load within 10 seconds')
          console.log('Map state:', {
            loaded: map.current?.loaded(),
            style: map.current?.getStyle(),
            bounds: map.current?.getBounds()
          })
        }
      }, 10000)

      map.current.on('load', () => {
        if (!isMounted) {
          console.log('Map loaded but component unmounted, cleaning up...')
          if (map.current) {
            map.current.remove()
            map.current = null
          }
          return
        }
        console.log('Map loaded successfully!')
        clearTimeout(loadTimeout)
        setMapLoaded(true)
        setupMapLayers()
        
        // Ensure map is properly centered and visible
        if (map.current) {
          map.current.resize() // Resize to ensure tiles load properly
          console.log('Map resized, current center:', map.current.getCenter())
          console.log('Map zoom level:', map.current.getZoom())
        }
      })

      map.current.on('error', (e) => {
        console.error('Mapbox error event:', e)
        console.error('Error details:', {
          type: e.type,
          error: e.error,
          message: e.error?.message,
          status: e.error?.status
        })
        
        if (mapContainer.current) {
          const errorMsg = e.error?.message || 'Unknown error loading map'
          const statusCode = e.error?.status
          
          mapContainer.current.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; background: #f5f5f5;">
              <h2 style="color: #dc3545; margin-bottom: 10px;">⚠️ Map Load Error</h2>
              <p style="color: #666; margin-bottom: 5px;"><strong>Error:</strong> ${errorMsg}</p>
              ${statusCode ? `<p style="color: #666; margin-bottom: 10px;"><strong>Status:</strong> ${statusCode}</p>` : ''}
              <p style="color: #666; font-size: 0.9em; margin-top: 10px;">Check Network tab for failed requests to api.mapbox.com</p>
              <p style="color: #666; font-size: 0.85em; margin-top: 5px;">Common issues: Network blocking, firewall, or token permissions</p>
            </div>
          `
        }
      })

      map.current.on('style.load', () => {
        console.log('Map style loaded')
      })

      map.current.on('data', (e) => {
        if (e.dataType === 'style') {
          console.log('Map style data loaded')
        }
      })

      map.current.on('styledata', () => {
        console.log('Map style data event fired')
      })

      map.current.on('sourcedata', () => {
        console.log('Map source data event fired')
      })

      // Check if map canvas exists after a short delay
      setTimeout(() => {
        const canvas = mapContainer.current?.querySelector('canvas')
        console.log('Map canvas check:', {
          containerExists: !!mapContainer.current,
          canvasExists: !!canvas,
          canvasVisible: canvas ? window.getComputedStyle(canvas).display !== 'none' : false,
          canvasZIndex: canvas ? window.getComputedStyle(canvas).zIndex : 'N/A'
        })
      }, 2000)

      // Attach click handler with current state closure
      const clickHandler = (e) => {
        // Use a ref to get current isDrawing state
        handleMapClick(e)
      }
      
      map.current.on('click', clickHandler)
      
      // Store handler reference for cleanup
      map.current._clickHandler = clickHandler
    } catch (error) {
      console.error('Error creating Mapbox map:', error)
    }

    return () => {
      console.log('MapEditor cleanup - removing map')
      if (map.current) {
        try {
          // Remove click handler
          if (map.current._clickHandler) {
            map.current.off('click', map.current._clickHandler)
          }
          map.current.remove()
          map.current = null
        } catch (e) {
          console.warn('Error removing map:', e)
        }
      }
    }
  }, []) // Empty dependency array - only run once on mount

  useEffect(() => {
    if (mapLoaded) {
      updateMapStreets()
    }
  }, [streets, mapLoaded])

  useEffect(() => {
    if (mapLoaded && selectedStreet) {
      highlightStreet(selectedStreet)
    }
  }, [selectedStreet, mapLoaded])

  // Sync refs with state
  useEffect(() => {
    isDrawingRef.current = isDrawing
  }, [isDrawing])

  useEffect(() => {
    drawingCoordinatesRef.current = drawingCoordinates
  }, [drawingCoordinates])

  // Auto-start drawing when isCreating is true
  useEffect(() => {
    if (isCreating && mapLoaded && !isDrawing) {
      console.log('Auto-starting drawing mode for new street')
      startDrawing()
    }
  }, [isCreating, mapLoaded, isDrawing])

  const setupMapLayers = () => {
    if (!map.current) return

    // Add source for streets
    if (!map.current.getSource('streets')) {
      map.current.addSource('streets', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
    }

    // Add layer for streets
    if (!map.current.getLayer('streets-layer')) {
      map.current.addLayer({
        id: 'streets-layer',
        type: 'line',
        source: 'streets',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8
        }
      })
    }

    // Add source for selected street highlight
    if (!map.current.getSource('selected-street')) {
      map.current.addSource('selected-street', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
    }

    // Add selected street highlight layer
    if (!map.current.getLayer('selected-street-layer')) {
      map.current.addLayer({
        id: 'selected-street-layer',
        type: 'line',
        source: 'selected-street',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#fbbf24',
          'line-width': 6,
          'line-opacity': 1
        }
      })
    }
  }

  const updateMapStreets = () => {
    if (!map.current || !mapLoaded) return

    const features = streets.map(street => ({
      type: 'Feature',
      geometry: street.geometry,
      properties: {
        id: street.id,
        name: street.name,
        length: street.length
      }
    }))

    const source = map.current.getSource('streets')
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      })
    }

    // Add markers for street names
    clearMarkers()
    streets.forEach(street => {
      if (street.geometry && street.geometry.coordinates && street.geometry.coordinates.length > 0) {
        // Place marker at midpoint of street
        const midIndex = Math.floor(street.geometry.coordinates.length / 2)
        const [lng, lat] = street.geometry.coordinates[midIndex]

        const el = document.createElement('div')
        el.className = 'street-label-marker'
        el.textContent = street.name
        el.style.cursor = 'pointer'

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current)

        el.addEventListener('click', () => {
          onStreetSelect(street)
        })

        markersRef.current.push(marker)
      }
    })
  }

  const highlightStreet = (street) => {
    if (!map.current || !street.geometry) return

    const source = map.current.getSource('selected-street')
    if (source && source.setData) {
      source.setData({
        type: 'Feature',
        geometry: street.geometry,
        properties: {}
      })

      // Zoom to street
      if (street.geometry.coordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds()
        street.geometry.coordinates.forEach(coord => {
          bounds.extend(coord)
        })

        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 18
        })
      }
    }
  }

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    drawingMarkersRef.current.forEach(marker => marker.remove())
    drawingMarkersRef.current = []
  }

  const removeLastPoint = () => {
    if (drawingCoordinatesRef.current.length === 0) return

    // Remove last coordinate
    const newCoords = drawingCoordinatesRef.current.slice(0, -1)
    drawingCoordinatesRef.current = newCoords
    setDrawingCoordinates(newCoords)

    // Remove last marker
    if (drawingMarkersRef.current.length > 0) {
      const lastMarker = drawingMarkersRef.current.pop()
      lastMarker.remove()
    }

    // Update the temporary line
    if (newCoords.length > 1) {
      drawTemporaryLine(newCoords)
    } else if (newCoords.length === 1) {
      // If only one point left, remove the line
      if (map.current) {
        const tempSourceId = 'temp-drawing-line'
        const tempLayerId = 'temp-drawing-layer'
        if (map.current.getLayer(tempLayerId)) {
          map.current.removeLayer(tempLayerId)
        }
        if (map.current.getSource(tempSourceId)) {
          map.current.removeSource(tempSourceId)
        }
      }
    } else {
      // No points left
      if (map.current) {
        const tempSourceId = 'temp-drawing-line'
        const tempLayerId = 'temp-drawing-layer'
        if (map.current.getLayer(tempLayerId)) {
          map.current.removeLayer(tempLayerId)
        }
        if (map.current.getSource(tempSourceId)) {
          map.current.removeSource(tempSourceId)
        }
      }
    }

    console.log('Last point removed. Points remaining:', newCoords.length)
  }

  const removePointAtIndex = (index) => {
    if (index < 0 || index >= drawingCoordinatesRef.current.length) return

    // Remove coordinate at index
    const newCoords = drawingCoordinatesRef.current.filter((_, i) => i !== index)
    drawingCoordinatesRef.current = newCoords
    setDrawingCoordinates(newCoords)

    // Remove marker at index
    if (drawingMarkersRef.current[index]) {
      const marker = drawingMarkersRef.current[index]
      marker.remove()
      drawingMarkersRef.current.splice(index, 1)
    }

    // Update the temporary line
    if (newCoords.length > 1) {
      drawTemporaryLine(newCoords)
    } else if (newCoords.length === 1) {
      // If only one point left, remove the line
      if (map.current) {
        const tempSourceId = 'temp-drawing-line'
        const tempLayerId = 'temp-drawing-layer'
        if (map.current.getLayer(tempLayerId)) {
          map.current.removeLayer(tempLayerId)
        }
        if (map.current.getSource(tempSourceId)) {
          map.current.removeSource(tempSourceId)
        }
      }
    } else {
      // No points left
      if (map.current) {
        const tempSourceId = 'temp-drawing-line'
        const tempLayerId = 'temp-drawing-layer'
        if (map.current.getLayer(tempLayerId)) {
          map.current.removeLayer(tempLayerId)
        }
        if (map.current.getSource(tempSourceId)) {
          map.current.removeSource(tempSourceId)
        }
      }
    }

    console.log('Point removed at index', index, '. Points remaining:', newCoords.length)
  }

  const handleMapClick = (e) => {
    // Use ref to get current state (not closure-captured state)
    if (isDrawingRef.current) {
      const { lng, lat } = e.lngLat
      const currentCoords = [...drawingCoordinatesRef.current, [lng, lat]]
      
      // Update both state and ref
      drawingCoordinatesRef.current = currentCoords
      setDrawingCoordinates(currentCoords)

      console.log('Point added:', { lng, lat, totalPoints: currentCoords.length })

      // Create temporary line on map
      if (currentCoords.length > 1) {
        drawTemporaryLine(currentCoords)
      }

      // Place marker at click point
      const el = document.createElement('div')
      el.className = 'drawing-marker'
      el.title = 'Click to remove this point'
      el.style.cursor = 'pointer'
      
      // Add click handler to remove this specific point
      el.addEventListener('click', (e) => {
        e.stopPropagation() // Prevent triggering map click
        const markerIndex = drawingMarkersRef.current.findIndex(m => {
          const markerEl = m.getElement()
          return markerEl === el
        })
        if (markerIndex !== -1) {
          removePointAtIndex(markerIndex)
        }
      })
      
      const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current)
      drawingMarkersRef.current.push(marker)
    }
  }

  const drawTemporaryLine = (coordinates) => {
    if (!map.current) return

    const tempSourceId = 'temp-drawing-line'
    const tempLayerId = 'temp-drawing-layer'

    if (!map.current.getSource(tempSourceId)) {
      map.current.addSource(tempSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      })
    } else {
      map.current.getSource(tempSourceId).setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates
        }
      })
    }

    if (!map.current.getLayer(tempLayerId)) {
      map.current.addLayer({
        id: tempLayerId,
        type: 'line',
        source: tempSourceId,
        paint: {
          'line-color': '#10b981',
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      })
    }
  }

  const startDrawing = () => {
    console.log('Starting drawing mode')
    isDrawingRef.current = true
    drawingCoordinatesRef.current = []
    setIsDrawing(true)
    setDrawingCoordinates([])
    clearMarkers()
    setEditingStreet(null)
    
    // Clean up any existing temporary drawing layers
    if (map.current) {
      const tempSourceId = 'temp-drawing-line'
      const tempLayerId = 'temp-drawing-layer'
      if (map.current.getLayer(tempLayerId)) {
        map.current.removeLayer(tempLayerId)
      }
      if (map.current.getSource(tempSourceId)) {
        map.current.removeSource(tempSourceId)
      }
    }
  }

  const cancelDrawing = () => {
    console.log('Canceling drawing')
    isDrawingRef.current = false
    drawingCoordinatesRef.current = []
    setIsDrawing(false)
    setDrawingCoordinates([])
    clearMarkers()

    // Remove temporary drawing layer
    if (map.current) {
      const tempSourceId = 'temp-drawing-line'
      const tempLayerId = 'temp-drawing-layer'
      if (map.current.getLayer(tempLayerId)) {
        map.current.removeLayer(tempLayerId)
      }
      if (map.current.getSource(tempSourceId)) {
        map.current.removeSource(tempSourceId)
      }
    }

    // Notify parent to cancel creation
    if (onDrawingCancel) {
      onDrawingCancel()
    }
  }

  const finishDrawing = async () => {
    const coords = drawingCoordinatesRef.current
    console.log('Drawing finished with', coords.length, 'points')
    
    if (coords.length < 2) {
      alert('Please draw at least 2 points to create a street')
      return
    }

    // If creating new street, show name input dialog
    if (isCreating) {
      // Calculate length
      let length = 0
      for (let i = 1; i < coords.length; i++) {
        const [lng1, lat1] = coords[i - 1]
        const [lng2, lat2] = coords[i]
        length += calculateDistance(lat1, lng1, lat2, lng2)
      }
      const roundedLength = Math.round(length * 100) / 100

      // Store the street data and show dialog
      setPendingStreetData({
        coordinates: coords,
        length: roundedLength,
        pointCount: coords.length
      })
      setShowNameDialog(true)
      // Don't exit drawing mode yet - wait for user to confirm name
    } else {
      // Just stop drawing mode (for editing)
      setIsDrawing(false)
      isDrawingRef.current = false
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000 // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const startEditingStreet = () => {
    if (!selectedStreet) {
      alert('Please select a street first')
      return
    }
    console.log('Starting to edit street:', selectedStreet.name)
    const coords = selectedStreet.geometry.coordinates.map(coord => [coord[0], coord[1]])
    isDrawingRef.current = true
    drawingCoordinatesRef.current = coords
    setEditingStreet(selectedStreet)
    setIsDrawing(true)
    setDrawingCoordinates(coords)
    clearMarkers()

    // Add markers for existing points (so they can be clicked to remove)
    coords.forEach((coord) => {
      const [lng, lat] = coord
      const el = document.createElement('div')
      el.className = 'drawing-marker'
      el.title = 'Click to remove this point'
      el.style.cursor = 'pointer'
      
      // Add click handler to remove this specific point
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        const markerIndex = drawingMarkersRef.current.findIndex(m => {
          const markerEl = m.getElement()
          return markerEl === el
        })
        if (markerIndex !== -1) {
          removePointAtIndex(markerIndex)
        }
      })
      
      const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current)
      drawingMarkersRef.current.push(marker)
    })

    // Draw the existing path
    if (coords.length > 1) {
      drawTemporaryLine(coords)
    }
  }

  const finishEditingStreet = async () => {
    const coords = drawingCoordinatesRef.current
    console.log('Finishing edit with', coords.length, 'points')
    
    if (!editingStreet || coords.length < 2) {
      alert('Please draw at least 2 points')
      return
    }

    // Calculate new length
    let length = 0
    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1]
      const [lng2, lat2] = coords[i]
      length += calculateDistance(lat1, lng1, lat2, lng2)
    }

    const nodes = coords.map((coord, index) => ({
      latitude: coord[1],
      longitude: coord[0],
      sequence: index
    }))

    const geometry = {
      type: 'LineString',
      coordinates: coords
    }

    try {
      const response = await axios.put(`${API_URL}/streets/${editingStreet.id}`, {
        name: editingStreet.name,
        length: length,
        geometry: geometry,
        nodes: nodes
      })

      if (response.status === 200) {
        console.log('Street updated successfully')
        isDrawingRef.current = false
        drawingCoordinatesRef.current = []
        cancelDrawing()
        setEditingStreet(null)
        onStreetUpdate()
      }
    } catch (error) {
      console.error('Error updating street:', error)
      alert('Failed to update street. Please try again.')
    }
  }

  return (
    <div className="map-editor">
      <div ref={mapContainer} className="map-container" />
      
      <div className="map-controls">
        {!isDrawing ? (
          <>
            {selectedStreet && (
              <button className="map-control-btn" onClick={startEditingStreet}>
                ✏️ Edit Street Path
              </button>
            )}
          </>
        ) : (
          <>
            {isCreating ? (
              <>
                <button className="map-control-btn map-control-btn-primary" onClick={finishDrawing}>
                  ✓ Finish Drawing
                </button>
                <button 
                  className="map-control-btn" 
                  onClick={removeLastPoint}
                  disabled={drawingCoordinates.length === 0}
                  title="Remove last point"
                >
                  ↶ Undo Last Point
                </button>
                <button className="map-control-btn map-control-btn-danger" onClick={cancelDrawing}>
                  ✗ Cancel
                </button>
                <div className="drawing-hint">
                  Click on the map to add points. Click a point marker to remove it. Click "Finish Drawing" when done to name and save the street.
                </div>
              </>
            ) : (
              <>
                <button className="map-control-btn map-control-btn-primary" onClick={finishEditingStreet}>
                  ✓ Finish Editing
                </button>
                <button 
                  className="map-control-btn" 
                  onClick={removeLastPoint}
                  disabled={drawingCoordinates.length === 0}
                  title="Remove last point"
                >
                  ↶ Undo Last Point
                </button>
                <button className="map-control-btn map-control-btn-danger" onClick={cancelDrawing}>
                  ✗ Cancel
                </button>
                <div className="drawing-hint">
                  Click on the map to add points. Click a point marker to remove it. Click "Finish Editing" when done.
                </div>
              </>
            )}
          </>
        )}
      </div>

      <NameInputDialog
        isOpen={showNameDialog}
        length={pendingStreetData?.length || 0}
        pointCount={pendingStreetData?.pointCount || 0}
        onConfirm={async (streetName) => {
          if (!pendingStreetData) return

          // Create nodes from coordinates
          const nodes = pendingStreetData.coordinates.map((coord, index) => ({
            latitude: coord[1],
            longitude: coord[0],
            sequence: index
          }))

          const geometry = {
            type: 'LineString',
            coordinates: pendingStreetData.coordinates
          }

          // Save the street
          try {
            const response = await axios.post(`${API_URL}/streets`, {
              name: streetName,
              length: pendingStreetData.length,
              geometry: geometry,
              nodes: nodes
            })

            if (response.status === 201) {
              console.log('Street created successfully')
              // Reset drawing state
              isDrawingRef.current = false
              drawingCoordinatesRef.current = []
              setIsDrawing(false)
              setDrawingCoordinates([])
              clearMarkers()
              
              // Close dialog and reset pending data
              setShowNameDialog(false)
              setPendingStreetData(null)
              
              // Notify parent
              onStreetUpdate()
              
              // Clean up temporary drawing layer
              if (map.current) {
                const tempSourceId = 'temp-drawing-line'
                const tempLayerId = 'temp-drawing-layer'
                if (map.current.getLayer(tempLayerId)) {
                  map.current.removeLayer(tempLayerId)
                }
                if (map.current.getSource(tempSourceId)) {
                  map.current.removeSource(tempSourceId)
                }
              }
            } else {
              alert('Failed to create street')
              setShowNameDialog(false)
              setPendingStreetData(null)
            }
          } catch (error) {
            console.error('Error creating street:', error)
            alert('Failed to create street. Please try again.')
            setShowNameDialog(false)
            setPendingStreetData(null)
          }
        }}
        onCancel={() => {
          // User cancelled - keep drawing mode active
          setShowNameDialog(false)
          setPendingStreetData(null)
        }}
      />
    </div>
  )
}

export default MapEditor

