const express = require('express');
const router = express.Router();
const db = require('../database/db').getDb();

// Get all streets with their nodes
router.get('/', (req, res) => {
  try {
    const streets = db.getAllStreets();
    res.json(streets);
  } catch (error) {
    console.error('Error fetching streets:', error);
    res.status(500).json({ error: 'Failed to fetch streets' });
  }
});

// Get a single street by ID
router.get('/:id', (req, res) => {
  try {
    const streetId = parseInt(req.params.id);
    const street = db.getStreetById(streetId);

    if (!street) {
      return res.status(404).json({ error: 'Street not found' });
    }

    res.json(street);
  } catch (error) {
    console.error('Error fetching street:', error);
    res.status(500).json({ error: 'Failed to fetch street' });
  }
});

// Create a new street
router.post('/', (req, res) => {
  try {
    const { name, length, geometry, nodes } = req.body;

    if (!name || !geometry || !nodes || nodes.length < 2) {
      return res.status(400).json({ 
        error: 'Name, geometry, and at least 2 nodes are required' 
      });
    }

    const streetId = db.createStreet({
      name: name.trim(),
      length: length || 0,
      nodes: nodes
    });

    // Auto-generate reference codes every 25 meters
    if (geometry && geometry.coordinates && geometry.coordinates.length >= 2) {
      try {
        db.generateReferenceCodesForStreet(streetId, name.trim(), geometry.coordinates);
      } catch (error) {
        console.error('Error generating reference codes:', error);
        // Don't fail the street creation if reference code generation fails
      }
    }

    res.status(201).json({ 
      id: streetId,
      message: 'Street created successfully' 
    });
  } catch (error) {
    console.error('Error creating street:', error);
    res.status(500).json({ error: 'Failed to create street' });
  }
});

// Update a street
router.put('/:id', (req, res) => {
  try {
    const streetId = parseInt(req.params.id);
    const { name, length, geometry, nodes } = req.body;

    // Check if street exists
    const existingStreet = db.getStreetById(streetId);
    if (!existingStreet) {
      return res.status(404).json({ error: 'Street not found' });
    }

    const success = db.updateStreet(streetId, {
      name: name.trim(),
      length: length || 0,
      nodes: nodes || []
    });

    if (success) {
      // Auto-regenerate reference codes when street is updated
      // Get the updated street to get its geometry
      const updatedStreet = db.getStreetById(streetId);
      if (updatedStreet && updatedStreet.geometry && updatedStreet.geometry.coordinates && updatedStreet.geometry.coordinates.length >= 2) {
        try {
          db.generateReferenceCodesForStreet(streetId, name.trim(), updatedStreet.geometry.coordinates);
        } catch (error) {
          console.error('Error regenerating reference codes:', error);
          // Don't fail the street update if reference code generation fails
        }
      }
      
      res.json({ message: 'Street updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update street' });
    }
  } catch (error) {
    console.error('Error updating street:', error);
    res.status(500).json({ error: 'Failed to update street' });
  }
});

// Delete a street
router.delete('/:id', (req, res) => {
  try {
    const streetId = parseInt(req.params.id);

    // Check if street exists
    const existingStreet = db.getStreetById(streetId);
    if (!existingStreet) {
      return res.status(404).json({ error: 'Street not found' });
    }

    const success = db.deleteStreet(streetId);

    if (success) {
      res.json({ message: 'Street deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete street' });
    }
  } catch (error) {
    console.error('Error deleting street:', error);
    res.status(500).json({ error: 'Failed to delete street' });
  }
});

module.exports = router;
