import React, { useState, useEffect, useRef } from 'react'
import MapEditor from './components/MapEditor'
import StreetForm from './components/StreetForm'
import PropertyForm from './components/PropertyForm'
import ConfirmDialog from './components/ConfirmDialog'
import AttributeTable from './components/AttributeTable'
import { API_URL } from './config/api'
import './App.css'

function App() {
  const [streets, setStreets] = useState([])
  const [selectedStreet, setSelectedStreet] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [isAddingProperty, setIsAddingProperty] = useState(false)
  const [isEditingProperty, setIsEditingProperty] = useState(false)
  const [propertyCoordinates, setPropertyCoordinates] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, streetId: null, streetName: '' })
  const [propertyDeleteConfirm, setPropertyDeleteConfirm] = useState({ isOpen: false, propertyId: null, propertyNumber: '' })
  const [calculatedLength, setCalculatedLength] = useState(0)
  const [showAttributeTable, setShowAttributeTable] = useState(false)
  const [referenceCodes, setReferenceCodes] = useState([])
  const [showReferenceCodes, setShowReferenceCodes] = useState(true)
  const getCurrentCoordinatesRef = useRef(null)

  useEffect(() => {
    fetchStreets()
    fetchProperties()
    fetchReferenceCodes()
  }, [])

  const fetchStreets = async (preserveSelection = true) => {
    try {
      const response = await fetch(`${API_URL}/streets`)
      const data = await response.json()
      setStreets(data)
      
      // Update selectedStreet if it exists to point to the updated street from the list
      // Only if preserveSelection is true (default behavior)
      if (preserveSelection && selectedStreet) {
        const updatedStreet = data.find(s => s.id === selectedStreet.id)
        if (updatedStreet) {
          setSelectedStreet(updatedStreet)
        }
      }
    } catch (error) {
      console.error('Error fetching streets:', error)
    }
  }

  const handleStreetSelect = (street) => {
    setSelectedStreet(street)
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleStreetEdit = (street) => {
    setSelectedStreet(street)
    setIsEditing(true)
    setIsCreating(false)
    setCalculatedLength(street.length || 0) // Initialize with current length
  }

  const handleCreateNew = () => {
    setSelectedStreet(null)
    setIsEditing(false)
    setIsCreating(true)
    // Just start drawing - the map editor will handle everything in one flow
  }

  const handleStreetSaved = () => {
    setIsEditing(false)
    setIsCreating(false)
    setSelectedStreet(null) // Clear selection
    fetchStreets(false) // Don't preserve selection - clear it
    fetchReferenceCodes() // Refresh reference codes after street update
  }

  const handleStreetDelete = (streetId, streetName) => {
    setDeleteConfirm({
      isOpen: true,
      streetId: streetId,
      streetName: streetName || 'this street'
    })
  }

  const confirmDelete = async () => {
    const { streetId } = deleteConfirm
    try {
      const response = await fetch(`${API_URL}/streets/${streetId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchStreets()
        if (selectedStreet && selectedStreet.id === streetId) {
          setSelectedStreet(null)
        }
        setDeleteConfirm({ isOpen: false, streetId: null, streetName: '' })
      } else {
        alert('Failed to delete street')
        setDeleteConfirm({ isOpen: false, streetId: null, streetName: '' })
      }
    } catch (error) {
      console.error('Error deleting street:', error)
      alert('Failed to delete street')
      setDeleteConfirm({ isOpen: false, streetId: null, streetName: '' })
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, streetId: null, streetName: '' })
  }

  const fetchProperties = async () => {
    try {
      const response = await fetch(`${API_URL}/properties`)
      const data = await response.json()
      setProperties(data)
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  const fetchReferenceCodes = async () => {
    try {
      const response = await fetch(`${API_URL}/reference-codes`)
      const data = await response.json()
      console.log('Fetched reference codes:', data.length, data)
      setReferenceCodes(data)
    } catch (error) {
      console.error('Error fetching reference codes:', error)
    }
  }

  const handleRegenerateReferenceCodes = async () => {
    try {
      const response = await fetch(`${API_URL}/reference-codes/regenerate-all`, {
        method: 'POST'
      })
      const result = await response.json()
      console.log('Reference codes regeneration result:', result)
      if (response.ok) {
        alert(`Reference codes regenerated! Generated ${result.totalCodesGenerated} codes for ${result.streetsProcessed} streets.`)
        fetchReferenceCodes() // Refresh the list
      } else {
        alert('Failed to regenerate reference codes')
      }
    } catch (error) {
      console.error('Error regenerating reference codes:', error)
      alert('Failed to regenerate reference codes')
    }
  }

  const handlePropertySelect = (property) => {
    // Only clear adding mode if we're actually selecting an existing property
    // Don't clear if we're in the middle of adding a new one
    if (property && property.id) {
      setSelectedProperty(property)
      setIsAddingProperty(false)
      setIsEditingProperty(false)
      setPropertyCoordinates(null)
      console.log('Property selected, isAddingProperty set to false')
    }
  }

  const handleAddProperty = () => {
    setSelectedProperty(null)
    setIsAddingProperty(true)
    setIsEditingProperty(true)
    setPropertyCoordinates(null)
  }

  const handlePropertyClick = (propertyOrCoords) => {
    console.log('handlePropertyClick called:', { propertyOrCoords, isAddingProperty })
    
    // Check if it's coordinates (new property placement) - has lng/lat but no id
    if (propertyOrCoords && 
        (propertyOrCoords.lng !== undefined || propertyOrCoords.longitude !== undefined) && 
        (propertyOrCoords.lat !== undefined || propertyOrCoords.latitude !== undefined) &&
        !propertyOrCoords.id) {
      // This is a new property placement (coordinates from map click, not an existing property)
      // Normalize coordinates to use lng/lat format
      const coords = {
        lng: propertyOrCoords.lng !== undefined ? propertyOrCoords.lng : propertyOrCoords.longitude,
        lat: propertyOrCoords.lat !== undefined ? propertyOrCoords.lat : propertyOrCoords.latitude
      }
      console.log('Setting property coordinates (new placement):', coords)
      console.log('Current isAddingProperty before setting:', isAddingProperty)
      
      // Always set coordinates and enable form, regardless of isAddingProperty state
      setPropertyCoordinates(coords)
      setIsEditingProperty(true)
      setIsAddingProperty(true)
      
      console.log('State updated - coordinates should be:', coords)
    } else if (propertyOrCoords && propertyOrCoords.id) {
      // Clicked on existing property marker
      setSelectedProperty(propertyOrCoords)
      setIsEditingProperty(true)
      setIsAddingProperty(false)
      setPropertyCoordinates(null)
    } else {
      console.warn('handlePropertyClick: Unrecognized propertyOrCoords format:', propertyOrCoords)
    }
  }

  const handlePropertyEdit = (property) => {
    setSelectedProperty(property)
    setIsEditingProperty(true)
    setIsAddingProperty(false)
    setPropertyCoordinates({ lng: property.longitude, lat: property.latitude })
  }

  const handlePropertySaved = () => {
    fetchProperties()
    setIsAddingProperty(false)
    setIsEditingProperty(false)
    setSelectedProperty(null)
    setPropertyCoordinates(null)
  }

  const handlePropertyCancel = () => {
    setIsAddingProperty(false)
    setIsEditingProperty(false)
    setSelectedProperty(null)
    setPropertyCoordinates(null)
  }

  const handleCancelAddingProperty = () => {
    handlePropertyCancel()
  }

  const handlePropertyDelete = (propertyId, propertyNumber) => {
    setPropertyDeleteConfirm({
      isOpen: true,
      propertyId: propertyId,
      propertyNumber: propertyNumber || 'this property'
    })
  }

  const confirmPropertyDelete = async () => {
    const { propertyId } = propertyDeleteConfirm
    try {
      const response = await fetch(`${API_URL}/properties/${propertyId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchProperties()
        if (selectedProperty && selectedProperty.id === propertyId) {
          setSelectedProperty(null)
        }
        setPropertyDeleteConfirm({ isOpen: false, propertyId: null, propertyNumber: '' })
      } else {
        alert('Failed to delete property')
        setPropertyDeleteConfirm({ isOpen: false, propertyId: null, propertyNumber: '' })
      }
    } catch (error) {
      console.error('Error deleting property:', error)
      alert('Failed to delete property')
      setPropertyDeleteConfirm({ isOpen: false, propertyId: null, propertyNumber: '' })
    }
  }

  const cancelPropertyDelete = () => {
    setPropertyDeleteConfirm({ isOpen: false, propertyId: null, propertyNumber: '' })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>GPS Navigation Admin Panel</h1>
        <p>Edit streets, names, lengths, and property numbers</p>
      </header>
      
      <div className="app-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <h2>Streets</h2>
              <div className="sidebar-header-actions">
                <button className="btn btn-secondary btn-small" onClick={() => setShowAttributeTable(true)} title="Open Attribute Table">
                  📊 Table
                </button>
                <button className="btn btn-primary" onClick={handleCreateNew}>
                  + New Street
                </button>
              </div>
            </div>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <button 
                className="btn btn-secondary btn-small" 
                onClick={handleRegenerateReferenceCodes}
                title="Generate reference codes for all existing streets"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                🔄 Generate Reference Codes
              </button>
            </div>

            {isEditing && (
              <StreetForm
                street={selectedStreet}
                isCreating={false}
                calculatedLength={calculatedLength}
                getCurrentCoordinates={() => {
                  if (getCurrentCoordinatesRef.current) {
                    return getCurrentCoordinatesRef.current()
                  }
                  return null
                }}
                onSave={handleStreetSaved}
                onCancel={() => {
                  setIsEditing(false)
                  setSelectedStreet(null)
                  setCalculatedLength(0)
                }}
              />
            )}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-header">
              <h2>Properties</h2>
              <div className="sidebar-header-actions">
                <button className="btn btn-secondary btn-small" onClick={() => setShowAttributeTable(true)} title="Open Attribute Table">
                  📊 Table
                </button>
                <button className="btn btn-primary" onClick={handleAddProperty}>
                  + Add Property
                </button>
              </div>
            </div>

            {(isAddingProperty || isEditingProperty) && (
              <PropertyForm
                property={selectedProperty}
                isCreating={isAddingProperty}
                coordinates={propertyCoordinates}
                streets={streets}
                onSave={handlePropertySaved}
                onCancel={handlePropertyCancel}
              />
            )}
          </div>
        </div>

        <div className="map-container">
          <MapEditor
            streets={streets}
            selectedStreet={selectedStreet}
            onStreetSelect={handleStreetSelect}
            onStreetEdit={handleStreetEdit}
            onStreetUpdate={() => {
              fetchStreets()
              fetchReferenceCodes() // Refresh reference codes after street update
              setIsCreating(false)
            }}
            isCreating={isCreating}
            isEditing={isEditing}
            onStartEditing={(street) => {
              setSelectedStreet(street)
              setIsEditing(true)
              setCalculatedLength(street.length || 0)
            }}
            onDrawingCancel={() => {
              setIsCreating(false)
              setCalculatedLength(0)
            }}
            onLengthChange={(length) => {
              if (isEditing) {
                setCalculatedLength(length)
              }
            }}
            onGetCurrentCoordinates={(getFn) => {
              getCurrentCoordinatesRef.current = getFn
            }}
            properties={properties}
            isAddingProperty={isAddingProperty}
            onPropertyClick={handlePropertyClick}
            selectedProperty={selectedProperty}
            onCancelAddingProperty={handleCancelAddingProperty}
            referenceCodes={referenceCodes}
            showReferenceCodes={showReferenceCodes}
            onToggleReferenceCodes={() => setShowReferenceCodes(!showReferenceCodes)}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        message={`Are you sure you want to delete "${deleteConfirm.streetName}"?`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      
      <ConfirmDialog
        isOpen={propertyDeleteConfirm.isOpen}
        message={`Are you sure you want to delete property "${propertyDeleteConfirm.propertyNumber}"?`}
        onConfirm={confirmPropertyDelete}
        onCancel={cancelPropertyDelete}
      />

      <AttributeTable
        isOpen={showAttributeTable}
        onClose={() => setShowAttributeTable(false)}
        streets={streets}
        properties={properties}
        selectedStreet={selectedStreet}
        selectedProperty={selectedProperty}
        onStreetSelect={handleStreetSelect}
        onPropertySelect={handlePropertySelect}
        onStreetEdit={handleStreetEdit}
        onPropertyEdit={handlePropertyEdit}
        onStreetDelete={handleStreetDelete}
        onPropertyDelete={handlePropertyDelete}
      />
    </div>
  )
}

export default App


