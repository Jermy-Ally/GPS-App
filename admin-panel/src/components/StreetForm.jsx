import React, { useState, useEffect } from 'react'
import { API_URL } from '../config/api'
import './StreetForm.css'

function StreetForm({ street, isCreating, onSave, onCancel, drawingCoordinates, drawingLength, onDrawComplete }) {
  const [name, setName] = useState('')
  const [length, setLength] = useState(0)

  useEffect(() => {
    if (street) {
      setName(street.name || '')
      setLength(street.length || 0)
    } else {
      setName('')
      setLength(0)
    }
  }, [street])

  // Update length when drawing coordinates change (for new street creation)
  useEffect(() => {
    if (isCreating && drawingLength !== undefined) {
      // Round to 2 decimal places for display (but keep full precision in calculations)
      const roundedLength = Math.round(drawingLength * 100) / 100
      setLength(roundedLength)
    }
  }, [drawingLength, isCreating])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('Please enter a street name')
      return
    }

    // If creating, pass drawing data to parent
    if (isCreating) {
      if (!drawingCoordinates || drawingCoordinates.length < 2) {
        alert('Please draw the street path on the map first (click at least 2 points)')
        return
      }
      if (onDrawComplete) {
        onDrawComplete(name.trim(), parseFloat(length) || 0)
      }
      return
    }

    // If we're editing, we need to update the street
    // The map editor handles the geometry/nodes update
    if (!isCreating && street) {
      try {
        const response = await fetch(`${API_URL}/streets/${street.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: name.trim(),
            length: parseFloat(length) || 0,
            geometry: street.geometry,
            nodes: street.nodes || []
          })
        })

        if (response.ok) {
          onSave()
        } else {
          alert('Failed to update street')
        }
      } catch (error) {
        console.error('Error updating street:', error)
        alert('Failed to update street')
      }
    }
  }

  return (
    <div className="street-form">
      <div className="form-header">
        <h3>{isCreating ? 'Create New Street' : 'Edit Street'}</h3>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="street-name">Street Name</label>
          <input
            id="street-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter street name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="street-length">Length (meters)</label>
          <input
            id="street-length"
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="0"
            min="0"
            step="any"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {isCreating ? 'Create' : 'Save'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>

      {isCreating && (
        <div className="form-note">
          <p>💡 <strong>Step 1:</strong> Click points on the map to draw the street path.</p>
          <p>💡 <strong>Step 2:</strong> Enter the street name above, then click "Create".</p>
          {drawingCoordinates && drawingCoordinates.length > 0 && (
            <p style={{ color: '#10b981', marginTop: '0.5rem' }}>
              ✓ {drawingCoordinates.length} point{drawingCoordinates.length !== 1 ? 's' : ''} drawn
            </p>
          )}
        </div>
      )}
      {!isCreating && (
        <div className="form-note">
          <p>💡 Tip: Draw or edit the street path directly on the map. Then update the name and length here.</p>
        </div>
      )}
    </div>
  )
}

export default StreetForm


