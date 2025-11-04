const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

const db = getDb();

// Get all reference codes
router.get('/', (req, res) => {
  try {
    const referenceCodes = db.getAllReferenceCodes();
    res.json(referenceCodes);
  } catch (error) {
    console.error('Error fetching reference codes:', error);
    res.status(500).json({ error: 'Failed to fetch reference codes' });
  }
});

// Get reference code by ID
router.get('/:id', (req, res) => {
  try {
    const referenceCode = db.getReferenceCodeById(parseInt(req.params.id));
    if (!referenceCode) {
      return res.status(404).json({ error: 'Reference code not found' });
    }
    res.json(referenceCode);
  } catch (error) {
    console.error('Error fetching reference code:', error);
    res.status(500).json({ error: 'Failed to fetch reference code' });
  }
});

// Get reference codes by street ID
router.get('/street/:streetId', (req, res) => {
  try {
    const referenceCodes = db.getReferenceCodesByStreetId(parseInt(req.params.streetId));
    res.json(referenceCodes);
  } catch (error) {
    console.error('Error fetching reference codes by street:', error);
    res.status(500).json({ error: 'Failed to fetch reference codes' });
  }
});

// Generate reference codes for a street
router.post('/generate/:streetId', (req, res) => {
  try {
    const streetId = parseInt(req.params.streetId);
    const { streetName, coordinates } = req.body;

    if (!streetName || !coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ 
        error: 'Street name and coordinates array (min 2 points) are required' 
      });
    }

    const createdIds = db.generateReferenceCodesForStreet(streetId, streetName, coordinates);
    res.status(201).json({ 
      message: 'Reference codes generated successfully',
      count: createdIds.length,
      ids: createdIds
    });
  } catch (error) {
    console.error('Error generating reference codes:', error);
    res.status(500).json({ error: 'Failed to generate reference codes' });
  }
});

// Regenerate reference codes for all existing streets
router.post('/regenerate-all', async (req, res) => {
  try {
    console.log('Starting reference code regeneration...');
    const streets = db.getAllStreets();
    console.log(`Found ${streets.length} streets to process`);
    
    let totalGenerated = 0;
    let streetsProcessed = 0;
    let errors = [];

    for (const street of streets) {
      try {
        if (!street.geometry || !street.geometry.coordinates || street.geometry.coordinates.length < 2) {
          console.log(`Skipping street ${street.id} - no valid geometry`);
          continue;
        }

        console.log(`Processing street ${street.id} (${street.name}) with ${street.geometry.coordinates.length} coordinates`);
        
        const createdIds = db.generateReferenceCodesForStreet(
          street.id, 
          street.name || 'Unnamed Street', 
          street.geometry.coordinates
        );
        
        totalGenerated += createdIds.length;
        streetsProcessed++;
        console.log(`Generated ${createdIds.length} reference codes for street ${street.id}`);
      } catch (error) {
        const errorMsg = `Error generating reference codes for street ${street.id}: ${error.message}`;
        console.error(errorMsg, error);
        errors.push(errorMsg);
      }
    }

    console.log(`Regeneration complete: ${totalGenerated} codes generated for ${streetsProcessed} streets`);

    res.json({ 
      message: 'Reference codes regenerated for all streets',
      streetsProcessed: streetsProcessed,
      totalStreets: streets.length,
      totalCodesGenerated: totalGenerated,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error regenerating reference codes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to regenerate reference codes',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

