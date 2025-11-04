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

function MapEditor({ streets, selectedStreet, onStreetSelect, onStreetUpdate, isCreating, isEditing, onDrawingCancel, onLengthChange, onGetCurrentCoordinates, onStartEditing, properties, isAddingProperty, onPropertyClick, selectedProperty, onCancelAddingProperty, referenceCodes = [], showReferenceCodes = true, onToggleReferenceCodes }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingCoordinates, setDrawingCoordinates] = useState([])
  const [editingStreet, setEditingStreet] = useState(null)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [pendingStreetData, setPendingStreetData] = useState(null)
  const [mapStyle, setMapStyle] = useState('satellite') // 'satellite' or 'streets'
  const markersRef = useRef([])
  const drawingMarkersRef = useRef([]) // Track drawing markers separately
  const propertyMarkersRef = useRef([]) // Track property markers
  const referenceCodeMarkersRef = useRef([]) // Track reference code markers
  const tempPropertyMarkerRef = useRef(null) // Temporary marker when placing new property
  // Use refs to track state that needs to be accessed in event handlers
  const isDrawingRef = useRef(false)
  const drawingCoordinatesRef = useRef([])
  const editingStreetRef = useRef(null) // Track editing street in ref for event handlers
  const isAddingPropertyRef = useRef(false)

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
          // Start with satellite style (can be toggled to streets view)
          const initialStyle = mapStyle === 'satellite' 
            ? 'mapbox://styles/mapbox/satellite-streets-v12'
            : 'mapbox://styles/mapbox/streets-v12'
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: initialStyle,
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
      if (properties) {
        updatePropertyMarkers()
      }
    }
  }, [streets, mapLoaded])

  useEffect(() => {
    if (mapLoaded && properties) {
      updatePropertyMarkers()
    }
  }, [properties, mapLoaded, selectedProperty])

  useEffect(() => {
    if (mapLoaded && referenceCodes) {
      updateReferenceCodeMarkers()
    }
  }, [referenceCodes, mapLoaded, showReferenceCodes])

  // Clear temp property marker when exiting property mode
  useEffect(() => {
    if (!isAddingProperty) {
      clearTempPropertyMarker()
    }
  }, [isAddingProperty])

  useEffect(() => {
    // Only highlight if not in drawing/editing mode
    if (mapLoaded && selectedStreet && !isDrawing) {
      highlightStreet(selectedStreet)
    } else if (mapLoaded && isDrawing) {
      // Clear yellow highlight when editing
      const source = map.current?.getSource('selected-street')
      if (source && source.setData) {
        source.setData({
          type: 'FeatureCollection',
          features: []
        })
      }
    }
  }, [selectedStreet, mapLoaded, isDrawing])

  // Sync refs with state
  useEffect(() => {
    isDrawingRef.current = isDrawing
  }, [isDrawing])

  useEffect(() => {
    drawingCoordinatesRef.current = drawingCoordinates
  }, [drawingCoordinates])

  useEffect(() => {
    editingStreetRef.current = editingStreet
  }, [editingStreet])

  useEffect(() => {
    isAddingPropertyRef.current = isAddingProperty
    console.log('isAddingProperty ref updated:', isAddingProperty)
  }, [isAddingProperty])

  // Auto-start drawing when isCreating is true
  useEffect(() => {
    if (isCreating && mapLoaded && !isDrawing) {
      console.log('Auto-starting drawing mode for new street')
      startDrawing()
    }
  }, [isCreating, mapLoaded, isDrawing])

  // Cancel editing mode when isEditing becomes false (e.g., after saving from form)
  // Use a ref to track previous isEditing state to detect when it changes from true to false
  const prevIsEditingRef = useRef(isEditing)
  
  useEffect(() => {
    // Only cancel if isEditing changed from true to false (not if it was already false)
    const wasEditing = prevIsEditingRef.current
    const isNowEditing = isEditing
    
    if (wasEditing && !isNowEditing && editingStreet && isDrawing) {
      console.log('Editing mode closed - clearing editing state')
      cancelDrawing()
      setEditingStreet(null)
    }
    
    // Update ref for next comparison
    prevIsEditingRef.current = isEditing
  }, [isEditing, editingStreet, isDrawing])

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

  const updatePropertyMarkers = () => {
    if (!map.current || !mapLoaded || !properties) return

    // Clear existing property markers
    clearPropertyMarkers()

    // Add markers for each property
    properties.forEach(property => {
      if (property.latitude !== undefined && property.longitude !== undefined) {
        // Create container for icon and label
        const container = document.createElement('div')
        container.style.position = 'relative'
        container.style.display = 'flex'
        container.style.flexDirection = 'column'
        container.style.alignItems = 'center'
        container.style.cursor = 'pointer'
        
        // Create sharp icon (pin/dot)
        const icon = document.createElement('div')
        icon.className = `property-icon ${selectedProperty && selectedProperty.id === property.id ? 'selected' : ''}`
        icon.style.width = '12px'
        icon.style.height = '12px'
        icon.style.borderRadius = '50%'
        icon.style.backgroundColor = selectedProperty && selectedProperty.id === property.id ? '#2196f3' : '#ff6b6b'
        icon.style.border = '2px solid white'
        icon.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)'
        icon.style.position = 'relative'
        icon.style.zIndex = '2'
        
        // Add a small sharp point at the bottom for precision
        icon.style.position = 'relative'
        icon.innerHTML = `
          <div style="
            position: absolute;
            bottom: -4px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 4px solid ${selectedProperty && selectedProperty.id === property.id ? '#2196f3' : '#ff6b6b'};
          "></div>
        `
        
        // Create label above the icon
        const label = document.createElement('div')
        label.className = 'property-label'
        label.textContent = `#${property.number}`
        label.style.position = 'absolute'
        label.style.bottom = '18px'
        label.style.left = '50%'
        label.style.transform = 'translateX(-50%)'
        label.style.backgroundColor = 'rgba(0, 0, 0, 0.75)'
        label.style.color = 'white'
        label.style.padding = '2px 6px'
        label.style.borderRadius = '3px'
        label.style.fontSize = '0.7rem'
        label.style.fontWeight = '600'
        label.style.whiteSpace = 'nowrap'
        label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)'
        label.style.pointerEvents = 'none'
        label.style.zIndex = '3'
        label.title = `Property #${property.number} - Click to edit`
        
        container.appendChild(label)
        container.appendChild(icon)
        
        const marker = new mapboxgl.Marker({ 
          element: container,
          anchor: 'bottom' // Anchor at bottom so the point is precise
        })
          .setLngLat([property.longitude, property.latitude])
          .addTo(map.current)

        container.addEventListener('click', () => {
          if (onPropertyClick) {
            onPropertyClick(property)
          }
        })

        propertyMarkersRef.current.push(marker)
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
    // Don't clear property markers here - they're managed separately
  }

  const clearPropertyMarkers = () => {
    propertyMarkersRef.current.forEach(marker => marker.remove())
    propertyMarkersRef.current = []
  }

  const clearReferenceCodeMarkers = () => {
    referenceCodeMarkersRef.current.forEach(marker => marker.remove())
    referenceCodeMarkersRef.current = []
  }

  const updateReferenceCodeMarkers = () => {
    if (!map.current || !mapLoaded) return
    if (!showReferenceCodes) {
      clearReferenceCodeMarkers()
      return
    }
    if (!referenceCodes || !Array.isArray(referenceCodes) || referenceCodes.length === 0) {
      console.log('No reference codes to display:', { referenceCodes, showReferenceCodes })
      return
    }

    console.log('Updating reference code markers:', referenceCodes.length)

    // Clear existing reference code markers
    clearReferenceCodeMarkers()

    // Add markers for each reference code
    referenceCodes.forEach(refCode => {
      if (refCode.latitude !== undefined && refCode.longitude !== undefined) {
        const el = document.createElement('div')
        el.className = 'reference-code-marker'
        el.title = refCode.code || `ST-${refCode.street_id}-R${refCode.sequence}` // Show code on hover

        const marker = new mapboxgl.Marker(el)
          .setLngLat([refCode.longitude, refCode.latitude])
          .addTo(map.current)

        referenceCodeMarkersRef.current.push(marker)
      }
    })
    
    console.log('Reference code markers added:', referenceCodeMarkersRef.current.length)
  }

  const clearTempPropertyMarker = () => {
    if (tempPropertyMarkerRef.current) {
      tempPropertyMarkerRef.current.remove()
      tempPropertyMarkerRef.current = null
    }
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

    // Recalculate and update length
    updateLengthFromCoordinates(newCoords)

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

    // Recalculate and update length
    updateLengthFromCoordinates(newCoords)
    
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

  // Helper function to calculate distance between two coordinates (simple Euclidean distance)
  const calculateCoordinateDistance = (coord1, coord2) => {
    const [lng1, lat1] = coord1
    const [lng2, lat2] = coord2
    const dx = lng2 - lng1
    const dy = lat2 - lat1
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleMapClick = (e) => {
    // Prevent clicks on controls or markers
    if (e.originalEvent && e.originalEvent.target) {
      const target = e.originalEvent.target
      // Check if click was on a button, marker, or control element
      if (target.closest('.map-controls') || target.closest('.mapboxgl-marker') || target.closest('.mapboxgl-popup')) {
        return
      }
    }
    
    // Check both ref and state to ensure we catch property mode
    const isInPropertyMode = isAddingPropertyRef.current || isAddingProperty
    
    if (isInPropertyMode) {
      const { lng, lat } = e.lngLat
      console.log('Adding property at:', { lng, lat })
      
      // Clear any existing temp marker
      clearTempPropertyMarker()
      
      // Show temporary marker at clicked location - small and precise
      if (map.current) {
        const el = document.createElement('div')
        el.className = 'property-marker temp-property-marker'
        
        // Create a small, precise marker with a dot and crosshair
        el.innerHTML = `
          <div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: #ff9800;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            position: relative;
            cursor: pointer;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 8px;
              height: 8px;
              background-color: white;
              border-radius: 50%;
            "></div>
          </div>
        `
        el.style.width = '20px'
        el.style.height = '20px'
        el.title = 'Property location'
        
        // Use offset to center the marker on the click point
        const marker = new mapboxgl.Marker({ 
          element: el,
          anchor: 'center' // Center the marker on the point
        })
          .setLngLat([lng, lat])
          .addTo(map.current)
        
        tempPropertyMarkerRef.current = marker
      }
      
      if (onPropertyClick) {
        onPropertyClick({ lng, lat })
      } else {
        console.error('onPropertyClick callback not provided!')
      }
      return
    }

    // Use ref to get current state (not closure-captured state)
    if (isDrawingRef.current) {
      const { lng, lat } = e.lngLat
      const clickCoord = [lng, lat]
      const currentCoords = drawingCoordinatesRef.current
      
      let newCoords
      let addedToStart = false
      
      // If editing an existing street (check both state and ref), determine which end is closer
      const isCurrentlyEditing = editingStreetRef.current || editingStreet
      
      if (isCurrentlyEditing && currentCoords.length > 0) {
        const firstPoint = currentCoords[0]
        const lastPoint = currentCoords[currentCoords.length - 1]
        
        const distanceToStart = calculateCoordinateDistance(clickCoord, firstPoint)
        const distanceToEnd = calculateCoordinateDistance(clickCoord, lastPoint)
        
        console.log('Editing mode - distances:', {
          distanceToStart,
          distanceToEnd,
          firstPoint,
          lastPoint,
          clickCoord,
          editingStreet: editingStreetRef.current?.name || editingStreet?.name
        })
        
        // Add to the end that's closer to the click
        if (distanceToStart < distanceToEnd) {
          // Add to beginning
          newCoords = [clickCoord, ...currentCoords]
          addedToStart = true
          console.log('✓ Point added to START (closer to start point)', { 
            lng, lat, 
            distanceToStart, 
            distanceToEnd,
            totalPoints: newCoords.length 
          })
        } else {
          // Add to end (default behavior)
          newCoords = [...currentCoords, clickCoord]
          console.log('✓ Point added to END (closer to end point)', { 
            lng, lat, 
            distanceToStart, 
            distanceToEnd,
            totalPoints: newCoords.length 
          })
        }
      } else {
        // Creating new street - always add to end
        newCoords = [...currentCoords, clickCoord]
        console.log('Point added to END (new street or no editing)', { 
          lng, lat, 
          totalPoints: newCoords.length,
          isCurrentlyEditing,
          currentCoordsLength: currentCoords.length
        })
      }
      
      // Update both state and ref
      drawingCoordinatesRef.current = newCoords
      setDrawingCoordinates(newCoords)

      // Create temporary line on map
      if (newCoords.length > 1) {
        drawTemporaryLine(newCoords)
      }

      // Place marker at click point (draggable)
      const el = document.createElement('div')
      el.className = 'drawing-marker'
      el.title = 'Drag to adjust • Right-click to remove'
      el.style.cursor = 'grab'
      
      const marker = new mapboxgl.Marker({ 
        element: el,
        draggable: true 
      }).setLngLat([lng, lat]).addTo(map.current)
      
      // Handle drag events - find index dynamically to handle removed points
      marker.on('dragstart', () => {
        el.style.cursor = 'grabbing'
      })
      
      marker.on('dragend', () => {
        el.style.cursor = 'grab'
        const newLngLat = marker.getLngLat()
        const currentCoords = drawingCoordinatesRef.current
        
        // Find marker's current index in the array (always in sync with coordinates)
        const markerIndex = drawingMarkersRef.current.indexOf(marker)
        
        if (markerIndex !== -1 && markerIndex < currentCoords.length) {
          const newCoords = [...currentCoords]
          newCoords[markerIndex] = [newLngLat.lng, newLngLat.lat]
          
          drawingCoordinatesRef.current = newCoords
          setDrawingCoordinates(newCoords)
          
          // Update the line
          if (newCoords.length > 1) {
            drawTemporaryLine(newCoords)
          }
          
          // Recalculate and update length
          updateLengthFromCoordinates(newCoords)
          
          console.log('Point moved to:', { lng: newLngLat.lng, lat: newLngLat.lat, index: markerIndex })
        } else {
          console.warn('Could not find marker index for drag update', { markerIndex, coordsLength: currentCoords.length })
        }
      })
      
      // Handle right-click to remove - find index dynamically
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Find marker index dynamically
        const markerArrayIndex = drawingMarkersRef.current.indexOf(marker)
        if (markerArrayIndex !== -1) {
          removePointAtIndex(markerArrayIndex)
        }
      })
      
      // Add marker to the correct position in the array
      if (addedToStart) {
        // Insert at beginning if point was added to start
        drawingMarkersRef.current.unshift(marker)
      } else {
        // Add to end if point was added to end
        drawingMarkersRef.current.push(marker)
      }
      
      // Recalculate and update length after adding point
      updateLengthFromCoordinates(newCoords)
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
    clearTempPropertyMarker()

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

  const calculatedLengthFromCoords = (coords) => {
    if (!coords || coords.length < 2) return 0
    let length = 0
    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1]
      const [lng2, lat2] = coords[i]
      length += calculateDistance(lat1, lng1, lat2, lng2)
    }
    return Math.round(length * 100) / 100
  }

  const updateLengthFromCoordinates = (coords) => {
    if (!coords || coords.length < 2) {
      if (onLengthChange) {
        onLengthChange(0)
      }
      return
    }

    // Calculate total length
    let length = 0
    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1]
      const [lng2, lat2] = coords[i]
      length += calculateDistance(lat1, lng1, lat2, lng2)
    }
    
    const roundedLength = Math.round(length * 100) / 100
    
    // Notify parent component of length change
    if (onLengthChange) {
      onLengthChange(roundedLength)
    }
  }

  const toggleMapStyle = () => {
    if (!map.current || !mapLoaded) return

    const newStyle = mapStyle === 'satellite' ? 'streets' : 'satellite'
    const styleUrl = newStyle === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/streets-v12'

    map.current.setStyle(styleUrl)
    setMapStyle(newStyle)

    // Re-add layers after style change (Mapbox requires this)
    map.current.once('style.load', () => {
      // Wait a bit for style to fully load
      setTimeout(() => {
        setupMapLayers()
        if (streets && streets.length > 0) {
          updateMapStreets()
        }
        if (selectedStreet) {
          highlightStreet(selectedStreet)
        }
      }, 100)
    })
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
    
    // Notify parent that editing has started
    if (onStartEditing) {
      onStartEditing(selectedStreet)
    }

    // Clear yellow highlight when editing
    if (map.current) {
      const source = map.current.getSource('selected-street')
      if (source && source.setData) {
        source.setData({
          type: 'FeatureCollection',
          features: []
        })
      }
    }

    // Add markers for existing points (draggable for editing)
    coords.forEach((coord, index) => {
      const [lng, lat] = coord
      const el = document.createElement('div')
      el.className = 'drawing-marker'
      el.title = 'Drag to adjust • Right-click to remove'
      el.style.cursor = 'grab'
      
      const marker = new mapboxgl.Marker({ 
        element: el,
        draggable: true 
      }).setLngLat([lng, lat]).addTo(map.current)
      
      // Handle drag events
      marker.on('dragstart', () => {
        el.style.cursor = 'grabbing'
      })
      
      marker.on('dragend', () => {
        el.style.cursor = 'grab'
        const newLngLat = marker.getLngLat()
        const currentCoords = drawingCoordinatesRef.current
        
        // Find marker's current index in the array (always in sync with coordinates)
        const markerIndex = drawingMarkersRef.current.indexOf(marker)
        
        if (markerIndex !== -1 && markerIndex < currentCoords.length) {
          const newCoords = [...currentCoords]
          newCoords[markerIndex] = [newLngLat.lng, newLngLat.lat]
          
          drawingCoordinatesRef.current = newCoords
          setDrawingCoordinates(newCoords)
          
          // Update the line
          if (newCoords.length > 1) {
            drawTemporaryLine(newCoords)
          }
          
          // Recalculate and update length
          updateLengthFromCoordinates(newCoords)
          
          console.log('Point moved to:', { lng: newLngLat.lng, lat: newLngLat.lat, index: markerIndex })
        } else {
          console.warn('Could not find marker index for drag update', { markerIndex, coordsLength: currentCoords.length })
        }
      })
      
      // Handle right-click to remove - find index dynamically
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Find marker index in array
        const markerArrayIndex = drawingMarkersRef.current.indexOf(marker)
        if (markerArrayIndex !== -1) {
          removePointAtIndex(markerArrayIndex)
        }
      })
      
      // Handle drag start/end - change cursor
      marker.on('dragstart', () => {
        el.style.cursor = 'grabbing'
      })
      
      marker.on('dragend', () => {
        el.style.cursor = 'grab'
      })
      
      drawingMarkersRef.current.push(marker)
    })

    // Draw the existing path
    if (coords.length > 1) {
      drawTemporaryLine(coords)
    }
    
    // Calculate initial length when starting to edit
    updateLengthFromCoordinates(coords)
  }

  // Expose function to get current coordinates (for form save)
  useEffect(() => {
    if (onGetCurrentCoordinates) {
      onGetCurrentCoordinates(() => {
        if (editingStreet && isDrawing && drawingCoordinatesRef.current.length >= 2) {
          return {
            coordinates: [...drawingCoordinatesRef.current],
            length: calculatedLengthFromCoords(drawingCoordinatesRef.current)
          }
        }
        return null
      })
    }
  }, [editingStreet, isDrawing, onGetCurrentCoordinates])

  const finishEditingStreet = async () => {
    const coords = drawingCoordinatesRef.current
    console.log('Finishing edit with', coords.length, 'points')
    
    if (!editingStreet || coords.length < 2) {
      alert('Please draw at least 2 points')
      return
    }

    // Calculate new length
    const length = calculatedLengthFromCoords(coords)

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
        
        // Notify parent to refresh and update UI immediately
        onStreetUpdate()
        
        // The map will update automatically when streets prop changes
        // But we need to ensure selectedStreet highlight is refreshed too
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
        {/* Map Style Toggle - Always visible */}
        <button 
          className="map-control-btn map-style-toggle" 
          onClick={toggleMapStyle}
          title={mapStyle === 'satellite' ? 'Switch to Streets View' : 'Switch to Satellite View'}
        >
          {mapStyle === 'satellite' ? '🗺️ Streets View' : '🛰️ Satellite View'}
        </button>

        {/* Reference Codes Toggle - Always visible */}
        {onToggleReferenceCodes && (
          <button 
            className={`map-control-btn ${showReferenceCodes ? 'map-control-btn-primary' : ''}`}
            onClick={onToggleReferenceCodes}
            title={showReferenceCodes ? 'Hide Reference Codes' : 'Show Reference Codes'}
          >
            {showReferenceCodes ? '🔴 Hide Reference Codes' : '⚪ Show Reference Codes'}
          </button>
        )}

        {!isDrawing && !isAddingProperty ? (
          <>
            {selectedStreet && (
              <button className="map-control-btn" onClick={startEditingStreet}>
                ✏️ Edit Street Path
              </button>
            )}
          </>
        ) : isAddingProperty ? (
          <>
            <div className="drawing-hint" style={{ background: '#fff3cd', color: '#856404', padding: '0.5rem 1rem', borderRadius: '4px', marginTop: '0.5rem' }}>
              💡 <strong>Click on the map</strong> to place a property marker
            </div>
            <button className="map-control-btn map-control-btn-danger" onClick={() => {
              if (onCancelAddingProperty) {
                onCancelAddingProperty()
              }
            }}>
              ✗ Cancel
            </button>
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
                  💡 <strong>Tip:</strong> Click map to add points • <strong>Drag points</strong> to adjust curves • Right-click point to remove
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
                  💡 <strong>Tip:</strong> Click map to extend street from either end (closer to start adds to beginning, closer to end adds to end) • <strong>Drag points</strong> to adjust curves • Right-click point to remove
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

