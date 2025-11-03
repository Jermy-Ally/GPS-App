import React from 'react'
import './StreetList.css'

function StreetList({ streets, selectedStreet, onSelect, onEdit, onDelete }) {
  return (
    <div className="street-list">
      {streets.length === 0 ? (
        <div className="empty-state">
          <p>No streets yet. Click "New Street" to add one.</p>
        </div>
      ) : (
        <ul>
          {streets.map(street => (
            <li
              key={street.id}
              className={selectedStreet?.id === street.id ? 'selected' : ''}
              onClick={() => onSelect(street)}
            >
              <div className="street-item">
                <div className="street-info">
                  <h3>{street.name || 'Unnamed Street'}</h3>
                  <p className="street-meta">
                    {street.length ? `${street.length.toFixed(2)} m` : 'Length not set'} • 
                    {street.nodes?.length || 0} points
                  </p>
                </div>
                <div className="street-actions">
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(street)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(street.id, street.name)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default StreetList


