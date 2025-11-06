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

function MapEditor({ streets, selectedStreet, onStreetSelect, onStreetEdit, onStreetUpdate, isCreating, isEditing, onDrawingCancel, onLengthChange, onGetCurrentCoordinates, onStartEditing, properties, isAddingProperty, onPropertyClick, selectedProperty, onPropertyUpdate, onCancelAddingProperty, referenceCodes = [], showReferenceCodes = true, onToggleReferenceCodes }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingCoordinates, setDrawingCoordinates] = useState([])
  const [editingStreet, setEditingStreet] = useState(null)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [pendingStreetData, setPendingStreetData] = useState(null)
  const [mapStyle, setMapStyle] = useState('satellite') // 'satellite' or 'streets'
  const [lineTooltip, setLineTooltip] = useState({ show: false, x: 0, y: 0 })
  const markersRef = useRef([])
  const drawingMarkersRef = useRef([]) // Track drawing markers separately
  const propertyMarkersRef = useRef([]) // Track property markers
  const referenceCodeMarkersRef = useRef([]) // Track reference code markers
  const tempPropertyMarkerRef = useRef(null) // Temporary marker when placing new property
  const draggedPropertyPositionRef = useRef(null) // Track position of property being dragged to prevent revert
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
        
        // Setup street click handler after layers are created
        setupStreetLayerClickHandler()
        
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
          // Remove click handlers
          if (map.current._clickHandler) {
            map.current.off('click', map.current._clickHandler)
          }
          // Remove street layer click handlers
          map.current.off('click', 'streets-layer')
          map.current.off('mouseenter', 'streets-layer')
          map.current.off('mouseleave', 'streets-layer')
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
  
  // Re-setup street click handler when streets change or drawing mode changes
  useEffect(() => {
    if (mapLoaded && map.current && map.current.getLayer('streets-layer')) {
      setupStreetLayerClickHandler()
    }
  }, [streets, mapLoaded, isDrawing])

  useEffect(() => {
    if (mapLoaded && properties) {
      updatePropertyMarkers()
      // Clear dragged position ref when properties update - the server should have the correct coordinates
      draggedPropertyPositionRef.current = null
    }
  }, [properties, mapLoaded, selectedProperty])

  useEffect(() => {
    if (mapLoaded) {
      console.log('Reference codes prop changed, updating markers:', referenceCodes?.length || 0)
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
    } else if (mapLoaded && (!selectedStreet || isDrawing)) {
      // Clear yellow highlight when no street is selected or when editing
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

  // Setup click handler for streets layer
  const setupStreetLayerClickHandler = () => {
    if (!map.current) return
    
    // Remove existing handlers if any
    map.current.off('click', 'streets-layer')
    map.current.off('mouseenter', 'streets-layer')
    map.current.off('mouseleave', 'streets-layer')
    
    // Only setup if not in drawing/editing mode
    if (!isDrawingRef.current) {
      // Click handler for streets
      map.current.on('click', 'streets-layer', (e) => {
        // Don't handle street clicks if in drawing/editing mode
        if (isDrawingRef.current) {
          return
        }
        
        // Don't handle if clicking on controls or other elements
        if (e.originalEvent && e.originalEvent.target) {
          const target = e.originalEvent.target
          if (target.closest('.map-controls') || target.closest('.mapboxgl-marker') || target.closest('.mapboxgl-popup')) {
            return
          }
        }
        
        // Stop event propagation to prevent map click handler
        e.originalEvent.stopPropagation()
        
        // Find the clicked street
        if (e.features && e.features.length > 0) {
          const clickedFeature = e.features[0]
          const streetId = clickedFeature.properties?.id
          
          if (streetId) {
            // Find the street object from the current streets array
            // Use the streets prop directly (closure will capture current value)
            const clickedStreet = streets.find(s => s.id === streetId)
            if (clickedStreet) {
              console.log('Street clicked on map, entering edit mode:', clickedStreet.name)
              // Same effect as clicking "Edit" button in streets table
              if (onStreetEdit) {
                onStreetEdit(clickedStreet)
              }
            }
          }
        }
      })
      
      // Change cursor to pointer when hovering over streets
      map.current.on('mouseenter', 'streets-layer', () => {
        if (!isDrawingRef.current && map.current) {
          map.current.getCanvas().style.cursor = 'pointer'
        }
      })
      
      map.current.on('mouseleave', 'streets-layer', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = ''
        }
      })
    }
  }

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

    // Re-setup click handler after updating streets data
    if (map.current.getLayer('streets-layer')) {
      setupStreetLayerClickHandler()
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
        const isSelected = selectedProperty && selectedProperty.id === property.id
        container.style.position = 'relative'
        container.style.display = 'flex'
        container.style.flexDirection = 'column'
        container.style.alignItems = 'center'
        container.style.cursor = isSelected ? 'move' : 'pointer'
        
        // Create sharp icon (pin/dot)
        const icon = document.createElement('div')
        icon.className = `property-icon ${isSelected ? 'selected' : ''}`
        icon.style.width = '12px'
        icon.style.height = '12px'
        icon.style.borderRadius = '50%'
        icon.style.backgroundColor = isSelected ? '#facc15' : '#ff6b6b'
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
            border-top: 4px solid ${isSelected ? '#facc15' : '#ff6b6b'};
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
        
        // Use dragged position if available, otherwise use property coordinates
        const draggedPos = draggedPropertyPositionRef.current
        const useDraggedPos = draggedPos && draggedPos.propertyId === property.id
        const markerLng = useDraggedPos ? draggedPos.longitude : property.longitude
        const markerLat = useDraggedPos ? draggedPos.latitude : property.latitude
        
        const marker = new mapboxgl.Marker({ 
          element: container,
          anchor: 'bottom', // Anchor at bottom so the point is precise
          draggable: isSelected // Make draggable only when selected
        })
          .setLngLat([markerLng, markerLat])
          .addTo(map.current)

        container.addEventListener('click', () => {
          if (onPropertyClick) {
            onPropertyClick(property)
          }
        })

        // Setup drag handlers for selected properties
        if (isSelected) {
          setupPropertyDragHandlers(marker, container, property)
        }

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
    if (!map.current || !mapLoaded) {
      console.log('Cannot update reference code markers: map not loaded')
      return
    }
    if (!showReferenceCodes) {
      console.log('Reference codes hidden, clearing markers')
      clearReferenceCodeMarkers()
      return
    }
    if (!referenceCodes || !Array.isArray(referenceCodes) || referenceCodes.length === 0) {
      console.log('No reference codes to display, clearing markers:', { referenceCodes, showReferenceCodes })
      clearReferenceCodeMarkers()
      return
    }

    console.log('Updating reference code markers:', referenceCodes.length, 'codes')

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

  // Helper function to clear temporary drawing layer and source
  const clearTempDrawingLayer = () => {
    if (!map.current) return
    
    const tempSourceId = 'temp-drawing-line'
    const tempLayerId = 'temp-drawing-layer'
    
    // Remove event handlers if layer exists
    if (map.current.getLayer(tempLayerId)) {
      map.current.off('mousemove', tempLayerId)
      map.current.off('mouseleave', tempLayerId)
      map.current.off('click', tempLayerId)
      map.current.removeLayer(tempLayerId)
    }
    if (map.current.getSource(tempSourceId)) {
      map.current.removeSource(tempSourceId)
    }
  }

  // Helper function to convert coordinates array to nodes array
  const coordinatesToNodes = (coords) => {
    return coords.map((coord, index) => ({
      latitude: coord[1],
      longitude: coord[0],
      sequence: index
    }))
  }

  // Helper function to create geometry object from coordinates
  const createGeometry = (coordinates) => {
    return {
      type: 'LineString',
      coordinates
    }
  }

  // Helper function to reset drawing state
  const resetDrawingState = () => {
    isDrawingRef.current = false
    drawingCoordinatesRef.current = []
    setIsDrawing(false)
    setDrawingCoordinates([])
    clearMarkers()
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
    } else {
      // If one or zero points left, remove the line
      clearTempDrawingLayer()
    }

    console.log('Last point removed. Points remaining:', newCoords.length)
  }

  // Helper function to create a draggable drawing marker with all handlers
  const createDrawingMarker = (lng, lat) => {
    // Create marker element
    const el = document.createElement('div')
    el.className = 'drawing-marker'
    el.title = 'Drag to adjust • Right-click to remove'
    
    // Create and configure marker
    const marker = new mapboxgl.Marker({ 
      element: el,
      draggable: true,
      anchor: 'center'
    }).setLngLat([lng, lat]).addTo(map.current)
    
    // Setup drag event handlers
    setupMarkerDragHandlers(marker, el)
    
    return marker
  }

  // Helper function to setup drag event handlers for a property marker
  const setupPropertyDragHandlers = (marker, el, property) => {
    // Handle drag start - disable map panning
    marker.on('dragstart', () => {
      if (map.current) {
        map.current.dragPan.disable()
      }
    })
    
    // Handle drag end - update property coordinates
    marker.on('dragend', async () => {
      // Re-enable map panning after drag
      if (map.current) {
        map.current.dragPan.enable()
      }
      
      const newLngLat = marker.getLngLat()
      
      // Store the new position to prevent revert when markers are recreated
      draggedPropertyPositionRef.current = {
        propertyId: property.id,
        latitude: newLngLat.lat,
        longitude: newLngLat.lng
      }
      
      try {
        // Update property via API
        const response = await axios.put(`${API_URL}/properties/${property.id}`, {
          number: property.number,
          latitude: newLngLat.lat,
          longitude: newLngLat.lng,
          street_id: property.street_id || null
        })
        
        if (response.status === 200) {
          console.log('Property coordinates updated:', { lng: newLngLat.lng, lat: newLngLat.lat })
          if (onPropertyUpdate) {
            onPropertyUpdate({
              ...property,
              latitude: newLngLat.lat,
              longitude: newLngLat.lng
            })
          }
        } else {
          console.error('Failed to update property coordinates')
          draggedPropertyPositionRef.current = null
          // Revert marker position on error
          marker.setLngLat([property.longitude, property.latitude])
        }
      } catch (error) {
        console.error('Error updating property coordinates:', error)
        draggedPropertyPositionRef.current = null
        // Revert marker position on error
        marker.setLngLat([property.longitude, property.latitude])
        alert('Failed to update property coordinates. Please try again.')
      }
    })
  }

  // Helper function to setup drag event handlers for a drawing marker
  const setupMarkerDragHandlers = (marker, el) => {
    // Handle drag start - disable map panning
    marker.on('dragstart', () => {
      // Prevent map panning during drag
      if (map.current) {
        map.current.dragPan.disable()
      }
    })
    
    // Handle drag - update line in real-time
    marker.on('drag', () => {
      // Update line during drag for real-time feedback
      const newLngLat = marker.getLngLat()
      const currentCoords = drawingCoordinatesRef.current
      const markerIndex = drawingMarkersRef.current.indexOf(marker)
      
      if (markerIndex !== -1 && markerIndex < currentCoords.length) {
        const updatedCoords = [...currentCoords]
        updatedCoords[markerIndex] = [newLngLat.lng, newLngLat.lat]
        drawingCoordinatesRef.current = updatedCoords
        
        // Update the line in real-time
        if (updatedCoords.length > 1) {
          drawTemporaryLine(updatedCoords)
        }
      }
    })
    
    // Handle drag end - finalize update and re-enable panning
    marker.on('dragend', () => {
      // Re-enable map panning after drag
      if (map.current) {
        map.current.dragPan.enable()
      }
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
    
    // Handle right-click to remove
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      const markerArrayIndex = drawingMarkersRef.current.indexOf(marker)
      if (markerArrayIndex !== -1) {
        removePointAtIndex(markerArrayIndex)
      }
    })
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
    } else {
      // If one or zero points left, remove the line
      clearTempDrawingLayer()
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
    
    // If in editing mode, check if click was on a line segment
    if (isDrawingRef.current && editingStreetRef.current) {
      const { lng, lat } = e.lngLat
      const [segmentIndex, pointOnSegment] = findClickedSegmentIndex(lng, lat)
      
      // If click was on a line segment, insert point on that segment
      if (segmentIndex >= 0 && pointOnSegment) {
        insertPointOnLine(segmentIndex, pointOnSegment)
        return
      }
      // Otherwise, continue to add point to end (for extending street)
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
      // Use the EXACT coordinates from the click event
      const marker = createDrawingMarker(lng, lat)
      
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

  // Helper function to find closest point on a line segment
  const findClosestPointOnSegment = (point, segmentStart, segmentEnd) => {
    const [result, _] = findClosestPointOnSegmentWithT(point, segmentStart, segmentEnd)
    return result
  }

  // Helper function to find closest point on a line segment and return the t parameter
  // Returns [point, t] where t is 0-1 (0 = at start, 1 = at end)
  const findClosestPointOnSegmentWithT = (point, segmentStart, segmentEnd) => {
    const [px, py] = point
    const [x1, y1] = segmentStart
    const [x2, y2] = segmentEnd

    // Vector from segment start to end
    const dx = x2 - x1
    const dy = y2 - y1
    
    // If segment is zero length, return start point
    const lengthSquared = dx * dx + dy * dy
    if (lengthSquared === 0) return [segmentStart, 0]

    // Calculate t, the parameter for the closest point on the line segment
    // t = 0 means at segmentStart, t = 1 means at segmentEnd
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared
    
    // Clamp t to [0, 1] to keep point on segment
    t = Math.max(0, Math.min(1, t))
    
    // Return the closest point on the segment and the t parameter
    return [[x1 + t * dx, y1 + t * dy], t]
  }

  // Helper function to check if a point is near an existing marker
  // Uses a threshold that's approximately equivalent to ~20 pixels on screen
  // (adjusted based on zoom level for better accuracy)
  const isClickNearMarker = (clickLng, clickLat) => {
    const coords = drawingCoordinatesRef.current
    if (coords.length === 0) return false

    // Calculate threshold based on zoom level for better accuracy
    // At zoom 15, 0.0001 degrees ≈ 11 meters ≈ ~20 pixels
    // We'll use a base threshold and adjust if needed
    const baseThreshold = 0.00015 // Slightly larger for better usability
    let threshold = baseThreshold
    
    // Optionally adjust based on zoom level (if map is available)
    if (map.current) {
      const zoom = map.current.getZoom()
      // At higher zoom, we can use smaller threshold
      // At lower zoom, use larger threshold
      threshold = baseThreshold * Math.pow(1.2, 15 - zoom)
    }

    const clickPoint = [clickLng, clickLat]
    
    // Check distance to each existing marker coordinate
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i]
      const dx = clickPoint[0] - lng
      const dy = clickPoint[1] - lat
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < threshold) {
        return true // Click is too close to an existing marker
      }
    }
    
    return false
  }

  // Helper function to find which segment index was clicked and return the closest point on that segment
  // Returns [segmentIndex, pointOnSegment] or [-1, null] if no valid segment found
  const findClickedSegmentIndex = (clickLng, clickLat) => {
    const coords = drawingCoordinatesRef.current
    if (coords.length < 2) return [-1, null]

    const clickPoint = [clickLng, clickLat]
    let closestSegmentIndex = -1
    let closestPointOnSegment = null
    let minDistance = Infinity

    // Find the closest segment to the click point
    for (let i = 0; i < coords.length - 1; i++) {
      const segmentStart = coords[i]
      const segmentEnd = coords[i + 1]
      
      // Find closest point on this segment
      const pointOnSegment = findClosestPointOnSegment(clickPoint, segmentStart, segmentEnd)
      
      // Calculate distance from click to point on segment
      const dx = clickPoint[0] - pointOnSegment[0]
      const dy = clickPoint[1] - pointOnSegment[1]
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < minDistance) {
        minDistance = distance
        closestSegmentIndex = i
        closestPointOnSegment = pointOnSegment
      }
    }

    // Only return segment index if click is close enough to the line
    if (minDistance < 0.01) {
      return [closestSegmentIndex, closestPointOnSegment]
    }
    
    return [-1, null]
  }

  // Helper function to insert point at clicked location on a specific segment
  // pointOnSegment is the exact point on the segment where the click occurred (already calculated)
  const insertPointOnLine = (segmentIndex, pointOnSegment) => {
    const coords = drawingCoordinatesRef.current
    if (coords.length < 2) return
    if (segmentIndex < 0 || segmentIndex >= coords.length - 1) return
    if (!pointOnSegment || !Array.isArray(pointOnSegment)) return

    // First check if click is near an existing marker - if so, don't insert
    // This allows the marker to handle drag-drop instead
    const [clickLng, clickLat] = pointOnSegment
    if (isClickNearMarker(clickLng, clickLat)) {
      console.log('Click too close to existing marker, skipping insertion')
      return
    }
    
    // Insert point at segmentIndex + 1 (after the start point of the segment)
    const insertIndex = segmentIndex + 1
    const newCoords = [...coords]
    newCoords.splice(insertIndex, 0, pointOnSegment)
    
    drawingCoordinatesRef.current = newCoords
    setDrawingCoordinates(newCoords)
    
    // Update the line
    drawTemporaryLine(newCoords)
    // Re-setup interactivity after updating line
    setTimeout(() => {
      setupLineInteractivity()
    }, 50)
    
    // Create marker for new point using the exact point on segment
    const [lng, lat] = pointOnSegment
    const marker = createDrawingMarker(lng, lat)
    
    // Insert marker at correct position
    drawingMarkersRef.current.splice(insertIndex, 0, marker)
    
    // Recalculate length
    updateLengthFromCoordinates(newCoords)
  }

  // Setup interactive handlers for line layer (for inserting points)
  const setupLineInteractivity = () => {
    if (!map.current || !mapContainer.current) return
    
    const tempLayerId = 'temp-drawing-layer'
    if (!map.current.getLayer(tempLayerId)) return

    // Remove existing handlers if any
    map.current.off('mousemove', tempLayerId)
    map.current.off('mouseleave', tempLayerId)
    map.current.off('click', tempLayerId)

    // Only setup if in editing mode
    if (isDrawingRef.current && editingStreetRef.current) {
      // Setup hover handler
      map.current.on('mousemove', tempLayerId, (e) => {
        if (isDrawingRef.current && editingStreetRef.current && mapContainer.current) {
          const { lng, lat } = e.lngLat
          
          // Don't show tooltip or change cursor if mouse is near a marker
          // Let the marker element handle its own cursor and drag behavior
          if (isClickNearMarker(lng, lat)) {
            // Reset cursor to default - let the marker handle it
            map.current.getCanvas().style.cursor = ''
            setLineTooltip({ show: false, x: 0, y: 0 })
          } else {
            map.current.getCanvas().style.cursor = 'crosshair'
            setLineTooltip({
              show: true,
              x: e.point.x,
              y: e.point.y
            })
          }
        }
      })

      map.current.on('mouseleave', tempLayerId, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = ''
        }
        setLineTooltip({ show: false, x: 0, y: 0 })
      })

      // No click handler needed here - clicks are handled by the main map click handler
      // The line layer handler is only for hover tooltip (mousemove/mouseleave)
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

    // Setup interactivity after layer is created or updated
    setupLineInteractivity()
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
    clearTempDrawingLayer()
  }

  const cancelDrawing = () => {
    console.log('Canceling drawing')
    isDrawingRef.current = false
    drawingCoordinatesRef.current = []
    setIsDrawing(false)
    setDrawingCoordinates([])
    clearMarkers()
    clearTempPropertyMarker()
    setLineTooltip({ show: false, x: 0, y: 0 })

    // Remove temporary drawing layer
    clearTempDrawingLayer()
    
    // Reset cursor
    if (map.current && map.current.getCanvas()) {
      map.current.getCanvas().style.cursor = ''
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
      // Calculate length using helper function
      const roundedLength = calculatedLengthFromCoords(coords)

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
    // Use coordinates DIRECTLY from geometry - don't map them
    // Backend returns [longitude, latitude] which is correct for Mapbox
    const coords = [...selectedStreet.geometry.coordinates]
    
    console.log('Street coordinates:', coords.length)
    if (coords.length > 0) {
      console.log('First coord:', coords[0], 'Last coord:', coords[coords.length - 1])
    }
    
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

    // IMPORTANT: Draw the line FIRST so markers use the exact same coordinates
    if (coords.length > 1) {
      drawTemporaryLine(coords)
    }

    // Add markers for existing points (draggable for editing)
    // Use the EXACT same coordinates array that was used for the line above
    coords.forEach((coord, index) => {
      // Coordinates are already in [lng, lat] format from backend
      const [lng, lat] = coord
      const marker = createDrawingMarker(lng, lat)
      drawingMarkersRef.current.push(marker)
    })

    // Setup interactivity after a short delay to ensure layer is ready
    if (coords.length > 1) {
      setTimeout(() => {
        setupLineInteractivity()
      }, 100)
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
    const nodes = coordinatesToNodes(coords)
    const geometry = createGeometry(coords)

    try {
      const response = await axios.put(`${API_URL}/streets/${editingStreet.id}`, {
        name: editingStreet.name,
        length: length,
        geometry: geometry,
        nodes: nodes
      })

      if (response.status === 200) {
        console.log('Street updated successfully')
        resetDrawingState()
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
    <div className="map-editor" style={{ position: 'relative' }}>
      {/* Tip for editing mode - displayed at top */}
      {isDrawing && !isCreating && editingStreet && (
        <div className="editing-tip">
          💡 <strong>Tip:</strong> Click map to extend street from either end (closer to start adds to beginning, closer to end adds to end) • <strong>Drag points</strong> to adjust curves • Right-click point to remove
        </div>
      )}
      {/* Tip for creating mode - displayed at top */}
      {isDrawing && isCreating && (
        <div className="editing-tip">
          💡 <strong>Tip:</strong> Click map to add points • <strong>Drag points</strong> to adjust curves • Right-click point to remove
        </div>
      )}
      {/* Tip for property adding mode - displayed at top */}
      {isAddingProperty && (
        <div className="editing-tip">
          💡 <strong>Click on the map</strong> to place a property marker
        </div>
      )}
      <div ref={mapContainer} className="map-container" />
      
      {/* Tooltip for line segment hover */}
      {lineTooltip.show && (
        <div
          className="line-tooltip"
          style={{
            position: 'absolute',
            left: `${lineTooltip.x + 10}px`,
            top: `${lineTooltip.y - 10}px`,
            pointerEvents: 'none',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          Click to insert point
        </div>
      )}
      
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

          // Create nodes and geometry from coordinates
          const nodes = coordinatesToNodes(pendingStreetData.coordinates)
          const geometry = createGeometry(pendingStreetData.coordinates)

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
              resetDrawingState()
              
              // Close dialog and reset pending data
              setShowNameDialog(false)
              setPendingStreetData(null)
              
              // Notify parent
              onStreetUpdate()
              
              // Clean up temporary drawing layer
              clearTempDrawingLayer()
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

