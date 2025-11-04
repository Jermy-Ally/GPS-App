const express = require('express');
const router = express.Router();
const db = require('../database/db').getDb();

// Get all properties
router.get('/', (req, res) => {
  try {
    const properties = db.getAllProperties();
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get properties by street ID
router.get('/street/:streetId', (req, res) => {
  try {
    const streetId = parseInt(req.params.streetId);
    const properties = db.getPropertiesByStreetId(streetId);
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties by street:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get a single property by ID
router.get('/:id', (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    const property = db.getPropertyById(propertyId);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Create a new property
router.post('/', (req, res) => {
  try {
    const { number, latitude, longitude, street_id } = req.body;

    if (!number || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'Number, latitude, and longitude are required' 
      });
    }

    const propertyId = db.createProperty({
      number: number.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      street_id: street_id ? parseInt(street_id) : null
    });

    res.status(201).json({ 
      id: propertyId,
      message: 'Property created successfully' 
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Update a property
router.put('/:id', (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    const { number, latitude, longitude, street_id } = req.body;

    // Check if property exists
    const existingProperty = db.getPropertyById(propertyId);
    if (!existingProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!number || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'Number, latitude, and longitude are required' 
      });
    }

    const success = db.updateProperty(propertyId, {
      number: number.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      street_id: street_id !== undefined ? (street_id ? parseInt(street_id) : null) : undefined
    });

    if (success) {
      res.json({ message: 'Property updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update property' });
    }
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Delete a property
router.delete('/:id', (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);

    // Check if property exists
    const existingProperty = db.getPropertyById(propertyId);
    if (!existingProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const success = db.deleteProperty(propertyId);

    if (success) {
      res.json({ message: 'Property deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete property' });
    }
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

module.exports = router;


