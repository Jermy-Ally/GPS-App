import React from 'react'
import './PropertyList.css'

function PropertyList({ properties, selectedProperty, onSelect, onEdit, onDelete }) {
  if (!properties || properties.length === 0) {
    return (
      <div className="property-list-empty">
        <p>No properties yet. Click "Add Property" to create one.</p>
      </div>
    )
  }

  return (
    <div className="property-list">
      {properties.map(property => (
        <div
          key={property.id}
          className={`property-item ${selectedProperty && selectedProperty.id === property.id ? 'selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(property)
          }}
        >
          <div className="property-info">
            <div className="property-number">#{property.number}</div>
            {property.street_id && (
              <div className="property-street">Street ID: {property.street_id}</div>
            )}
          </div>
          <div className="property-actions">
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(property)
              }}
              title="Edit property"
            >
              ✏️
            </button>
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(property.id, property.number)
              }}
              title="Delete property"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PropertyList

