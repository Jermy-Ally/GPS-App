const express = require('express')
const router = express.Router()

const { getDb } = require('../database/db')

/**
 * GET /api/navigation/path?from=<propertyId>&to=<propertyId>
 *
 * Temporary stub that returns a trivial path consisting of the origin and
 * destination property coordinates. This will be replaced with real pathfinding.
 */
router.get('/path', (req, res) => {
  try {
    const fromId = Number(req.query.from)
    const toId = Number(req.query.to)

    if (!fromId || !toId || Number.isNaN(fromId) || Number.isNaN(toId)) {
      return res.status(400).json({
        error: 'Query parameters "from" and "to" are required property IDs'
      })
    }

    const db = getDb()
    const fromProperty = db.getPropertyById(fromId)
    const toProperty = db.getPropertyById(toId)

    if (!fromProperty) {
      return res.status(404).json({ error: `Property with id ${fromId} not found` })
    }

    if (!toProperty) {
      return res.status(404).json({ error: `Property with id ${toId} not found` })
    }

    const path = [
      {
        latitude: fromProperty.latitude,
        longitude: fromProperty.longitude,
        propertyId: fromProperty.id,
        step: 'from'
      },
      {
        latitude: toProperty.latitude,
        longitude: toProperty.longitude,
        propertyId: toProperty.id,
        step: 'to'
      }
    ]

    res.json({
      from: {
        id: fromProperty.id,
        latitude: fromProperty.latitude,
        longitude: fromProperty.longitude
      },
      to: {
        id: toProperty.id,
        latitude: toProperty.latitude,
        longitude: toProperty.longitude
      },
      segments: [
        {
          points: path
        }
      ]
    })
  } catch (error) {
    console.error('Error computing navigation path:', error)
    res.status(500).json({ error: 'Failed to compute navigation path' })
  }
})

module.exports = router


