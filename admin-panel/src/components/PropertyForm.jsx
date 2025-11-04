import React, { useState, useEffect } from 'react'
import { API_URL } from '../config/api'
import './PropertyForm.css'

function PropertyForm({ property, isCreating, onSave, onCancel, coordinates, streets }) {
  const [number, setNumber] = useState('')
  const [streetId, setStreetId] = useState('')

  useEffect(() => {
    if (property) {
      setNumber(property.number || '')
      setStreetId(property.street_id || '')
    } else {
      setNumber('')
      setStreetId('')
    }
  }, [property])

  useEffect(() => {
    console.log('PropertyForm coordinates changed:', coordinates)
  }, [coordinates])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!number.trim()) {
      alert('Please enter a property number')
      return
    }

    console.log('PropertyForm submit:', { coordinates, isCreating, property })
    
    if (!coordinates && isCreating) {
      alert('Please click on the map to place the property')
      return
    }

    // Handle both lng/lat and longitude/latitude formats
    const lat = coordinates ? (coordinates.lat !== undefined ? coordinates.lat : coordinates.latitude) : property?.latitude
    const lng = coordinates ? (coordinates.lng !== undefined ? coordinates.lng : coordinates.longitude) : property?.longitude
    
    const propertyData = {
      number: number.trim(),
      latitude: lat,
      longitude: lng,
      street_id: streetId ? parseInt(streetId) : null
    }
    
    console.log('Submitting property data:', propertyData)

    try {
      if (isCreating) {
        const response = await fetch(`${API_URL}/properties`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(propertyData)
        })

        if (response.ok) {
          onSave()
        } else {
          alert('Failed to create property')
        }
      } else {
        const response = await fetch(`${API_URL}/properties/${property.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(propertyData)
        })

        if (response.ok) {
          onSave()
        } else {
          alert('Failed to update property')
        }
      }
    } catch (error) {
      console.error('Error saving property:', error)
      alert('Failed to save property')
    }
  }

  return (
    <div className="property-form">
      <div className="form-header">
        <h3>{isCreating ? 'Add Property' : 'Edit Property'}</h3>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="property-number">Property Number</label>
          <input
            id="property-number"
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g., 123, A-456, 789B"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="property-street">Street (Optional)</label>
          <select
            id="property-street"
            value={streetId}
            onChange={(e) => setStreetId(e.target.value)}
          >
            <option value="">None</option>
            {streets && streets.map(street => (
              <option key={street.id} value={street.id}>
                {street.name}
              </option>
            ))}
          </select>
        </div>

        {isCreating && (
          <div className="form-note">
            <p>💡 Click on the map to place this property</p>
            {coordinates ? (
              <p style={{ color: '#10b981', marginTop: '0.5rem' }}>
                ✓ Location selected: {coordinates.lat?.toFixed(6) || coordinates.latitude?.toFixed(6) || 'N/A'}, {coordinates.lng?.toFixed(6) || coordinates.longitude?.toFixed(6) || 'N/A'}
              </p>
            ) : (
              <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                ⚠ No location selected yet
              </p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {isCreating ? 'Create' : 'Save'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default PropertyForm

