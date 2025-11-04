import React, { useState, useMemo } from 'react'
import './AttributeTable.css'

function AttributeTable({ 
  isOpen, 
  onClose, 
  streets, 
  properties, 
  selectedStreet, 
  selectedProperty,
  onStreetSelect, 
  onPropertySelect,
  onStreetEdit, 
  onPropertyEdit, 
  onStreetDelete, 
  onPropertyDelete 
}) {
  const [activeTab, setActiveTab] = useState('streets') // 'streets' or 'properties'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  // Filter and sort streets
  const filteredAndSortedStreets = useMemo(() => {
    let filtered = streets.filter(street => {
      const search = searchTerm.toLowerCase()
      return (
        street.name?.toLowerCase().includes(search) ||
        street.id?.toString().includes(search) ||
        street.length?.toString().includes(search)
      )
    })

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        if (sortConfig.key === 'name') {
          aVal = aVal || ''
          bVal = bVal || ''
        }
        if (sortConfig.key === 'length') {
          aVal = aVal || 0
          bVal = bVal || 0
        }
        if (sortConfig.key === 'id') {
          aVal = aVal || 0
          bVal = bVal || 0
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [streets, searchTerm, sortConfig])

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties.filter(property => {
      const search = searchTerm.toLowerCase()
      return (
        property.number?.toLowerCase().includes(search) ||
        property.id?.toString().includes(search) ||
        property.street_id?.toString().includes(search)
      )
    })

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        if (sortConfig.key === 'number') {
          aVal = aVal || ''
          bVal = bVal || ''
        }
        if (sortConfig.key === 'id' || sortConfig.key === 'street_id') {
          aVal = aVal || 0
          bVal = bVal || 0
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [properties, searchTerm, sortConfig])

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '⇅'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleRowClick = (item, type) => {
    if (type === 'street') {
      onStreetSelect(item)
    } else {
      onPropertySelect(item)
    }
  }

  if (!isOpen) return null

  return (
    <div className="attribute-table-overlay" onClick={onClose}>
      <div className="attribute-table-container" onClick={(e) => e.stopPropagation()}>
        <div className="attribute-table-header">
          <h2>Attribute Table</h2>
          <button className="attribute-table-close" onClick={onClose}>×</button>
        </div>

        <div className="attribute-table-tabs">
          <button
            className={`attribute-table-tab ${activeTab === 'streets' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('streets')
              setSearchTerm('')
              setSortConfig({ key: null, direction: 'asc' })
            }}
          >
            Streets ({streets.length})
          </button>
          <button
            className={`attribute-table-tab ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('properties')
              setSearchTerm('')
              setSortConfig({ key: null, direction: 'asc' })
            }}
          >
            Properties ({properties.length})
          </button>
        </div>

        <div className="attribute-table-search">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="attribute-table-search-input"
          />
        </div>

        <div className="attribute-table-content">
          {activeTab === 'streets' ? (
            <table className="attribute-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="sortable">
                    ID {getSortIcon('id')}
                  </th>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Name {getSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('length')} className="sortable">
                    Length (m) {getSortIcon('length')}
                  </th>
                  <th>Points</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedStreets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="attribute-table-empty">
                      {searchTerm ? 'No streets match your search' : 'No streets found'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedStreets.map(street => (
                    <tr
                      key={street.id}
                      className={selectedStreet?.id === street.id ? 'selected' : ''}
                      onClick={() => handleRowClick(street, 'street')}
                    >
                      <td>{street.id}</td>
                      <td>{street.name || 'Unnamed Street'}</td>
                      <td>{street.length ? street.length.toFixed(2) : 'N/A'}</td>
                      <td>{street.geometry?.coordinates?.length || street.nodes?.length || 0}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-table-action btn-table-edit"
                          onClick={() => onStreetEdit(street)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-table-action btn-table-delete"
                          onClick={() => onStreetDelete(street.id, street.name)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="attribute-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="sortable">
                    ID {getSortIcon('id')}
                  </th>
                  <th onClick={() => handleSort('number')} className="sortable">
                    Number {getSortIcon('number')}
                  </th>
                  <th onClick={() => handleSort('street_id')} className="sortable">
                    Street ID {getSortIcon('street_id')}
                  </th>
                  <th>Coordinates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProperties.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="attribute-table-empty">
                      {searchTerm ? 'No properties match your search' : 'No properties found'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedProperties.map(property => (
                    <tr
                      key={property.id}
                      className={selectedProperty?.id === property.id ? 'selected' : ''}
                      onClick={() => handleRowClick(property, 'property')}
                    >
                      <td>{property.id}</td>
                      <td>{property.number || 'N/A'}</td>
                      <td>{property.street_id || 'N/A'}</td>
                      <td>
                        {property.longitude && property.latitude
                          ? `${property.longitude.toFixed(6)}, ${property.latitude.toFixed(6)}`
                          : property.lng && property.lat
                          ? `${property.lng.toFixed(6)}, ${property.lat.toFixed(6)}`
                          : 'N/A'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-table-action btn-table-edit"
                          onClick={() => onPropertyEdit(property)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-table-action btn-table-delete"
                          onClick={() => onPropertyDelete(property.id, property.number)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="attribute-table-footer">
          <div className="attribute-table-count">
            {activeTab === 'streets' 
              ? `Showing ${filteredAndSortedStreets.length} of ${streets.length} streets`
              : `Showing ${filteredAndSortedProperties.length} of ${properties.length} properties`
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttributeTable

