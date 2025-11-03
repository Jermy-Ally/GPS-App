import React, { useState, useEffect } from 'react'
import MapEditor from './components/MapEditor'
import StreetList from './components/StreetList'
import StreetForm from './components/StreetForm'
import ConfirmDialog from './components/ConfirmDialog'
import './App.css'

function App() {
  const [streets, setStreets] = useState([])
  const [selectedStreet, setSelectedStreet] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, streetId: null, streetName: '' })

  useEffect(() => {
    fetchStreets()
  }, [])

  const fetchStreets = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/streets')
      const data = await response.json()
      setStreets(data)
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
  }

  const handleCreateNew = () => {
    setSelectedStreet(null)
    setIsEditing(false)
    setIsCreating(true)
    // Just start drawing - the map editor will handle everything in one flow
  }

  const handleStreetSaved = () => {
    fetchStreets()
    setIsEditing(false)
    setIsCreating(false)
    setSelectedStreet(null)
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
      const response = await fetch(`http://localhost:3001/api/streets/${streetId}`, {
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>GPS Navigation Admin Panel</h1>
        <p>Edit streets, names, and lengths</p>
      </header>
      
      <div className="app-content">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>Streets</h2>
            <button className="btn btn-primary" onClick={handleCreateNew}>
              + New Street
            </button>
          </div>
          
          <StreetList
            streets={streets}
            selectedStreet={selectedStreet}
            onSelect={handleStreetSelect}
            onEdit={handleStreetEdit}
            onDelete={handleStreetDelete}
          />

          {isEditing && (
            <StreetForm
              street={selectedStreet}
              isCreating={false}
              onSave={handleStreetSaved}
              onCancel={() => {
                setIsEditing(false)
                setSelectedStreet(null)
              }}
            />
          )}
        </div>

        <div className="map-container">
          <MapEditor
            streets={streets}
            selectedStreet={selectedStreet}
            onStreetSelect={handleStreetSelect}
            onStreetUpdate={() => {
              fetchStreets()
              setIsCreating(false)
            }}
            isCreating={isCreating}
            onDrawingCancel={() => {
              setIsCreating(false)
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        message={`Are you sure you want to delete "${deleteConfirm.streetName}"?`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

export default App


