import React, { useState, useEffect, useRef } from 'react'
import './NameInputDialog.css'

function NameInputDialog({ isOpen, length, pointCount, onConfirm, onCancel }) {
  const [name, setName] = useState('New Street')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setName('New Street')
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onConfirm(name.trim())
    }
  }

  const handleCancel = () => {
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="name-input-overlay" onClick={handleCancel}>
      <div className="name-input-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="name-input-header">
          <h3>Create New Street</h3>
        </div>
        <div className="name-input-body">
          <div className="street-stats">
            <div className="stat-item">
              <span className="stat-label">Length:</span>
              <span className="stat-value">{length.toFixed(2)} meters</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Points:</span>
              <span className="stat-value">{pointCount}</span>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="street-name-input">Street Name</label>
              <input
                id="street-name-input"
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter street name"
                autoFocus
              />
            </div>
            <div className="name-input-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Street
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default NameInputDialog

