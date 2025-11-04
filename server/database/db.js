const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'streets.json');

let data = null;

function init() {
  const dataDir = path.dirname(dbPath);
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load or create database file
  if (fs.existsSync(dbPath)) {
    try {
      const fileData = fs.readFileSync(dbPath, 'utf8');
      data = JSON.parse(fileData);
    } catch (error) {
      console.error('Error reading database file:', error);
      data = { streets: [], nodes: [], nextStreetId: 1 };
    }
  } else {
    data = { streets: [], nodes: [], properties: [], referenceCodes: [], nextStreetId: 1, nextPropertyId: 1, nextReferenceCodeId: 1 };
    save();
  }

  // Ensure properties array exists (for backward compatibility)
  if (!data.properties) {
    data.properties = [];
  }
  if (!data.nextPropertyId) {
    data.nextPropertyId = 1;
  }
  // Ensure referenceCodes array exists (migrate from old referencePoints if needed)
  if (!data.referenceCodes) {
    if (data.referencePoints) {
      // Migrate old referencePoints to referenceCodes
      data.referenceCodes = data.referencePoints;
      delete data.referencePoints;
    } else {
      data.referenceCodes = [];
    }
  }
  if (!data.nextReferenceCodeId) {
    // Find max ID from existing reference codes
    const maxId = data.referenceCodes.length > 0 
      ? Math.max(...data.referenceCodes.map(rc => rc.id || 0))
      : 0;
    data.nextReferenceCodeId = maxId + 1;
  }

  console.log('Database initialized successfully');
  return { streets: data.streets, nodes: data.nodes, properties: data.properties };
}

function save() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error);
    throw error;
  }
}

function getAllStreets() {
  if (!data) init();
  return data.streets.map(street => {
    const nodes = data.nodes
      .filter(node => node.street_id === street.id)
      .sort((a, b) => a.sequence - b.sequence);
    
    const geometry = {
      type: 'LineString',
      coordinates: nodes.map(node => [node.longitude, node.latitude])
    };

    return {
      ...street,
      geometry,
      nodes
    };
  });
}

function getStreetById(id) {
  if (!data) init();
  const street = data.streets.find(s => s.id === id);
  if (!street) return null;

  const nodes = data.nodes
    .filter(node => node.street_id === id)
    .sort((a, b) => a.sequence - b.sequence);

  const geometry = {
    type: 'LineString',
    coordinates: nodes.map(node => [node.longitude, node.latitude])
  };

  return {
    ...street,
    geometry,
    nodes
  };
}

function createStreet(streetData) {
  if (!data) init();
  
  const street = {
    id: data.nextStreetId++,
    name: streetData.name,
    length: streetData.length || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  data.streets.push(street);

  // Add nodes
  if (streetData.nodes && streetData.nodes.length > 0) {
    streetData.nodes.forEach((nodeData, index) => {
      const node = {
        id: data.nodes.length + 1,
        street_id: street.id,
        latitude: nodeData.latitude,
        longitude: nodeData.longitude,
        sequence: index
      };
      data.nodes.push(node);
    });
  }

  save();
  return street.id;
}

function updateStreet(id, streetData) {
  if (!data) init();
  
  const streetIndex = data.streets.findIndex(s => s.id === id);
  if (streetIndex === -1) return false;

  data.streets[streetIndex] = {
    ...data.streets[streetIndex],
    name: streetData.name,
    length: streetData.length || 0,
    updated_at: new Date().toISOString()
  };

  // Remove old nodes
  data.nodes = data.nodes.filter(node => node.street_id !== id);

  // Add new nodes
  if (streetData.nodes && streetData.nodes.length > 0) {
    streetData.nodes.forEach((nodeData, index) => {
      const node = {
        id: data.nodes.length > 0 ? Math.max(...data.nodes.map(n => n.id)) + 1 : 1,
        street_id: id,
        latitude: nodeData.latitude,
        longitude: nodeData.longitude,
        sequence: index
      };
      data.nodes.push(node);
    });
  }

  save();
  return true;
}

function deleteStreet(id) {
  if (!data) init();
  
  const streetIndex = data.streets.findIndex(s => s.id === id);
  if (streetIndex === -1) return false;

  data.streets.splice(streetIndex, 1);
  data.nodes = data.nodes.filter(node => node.street_id !== id);
  // Also remove properties and reference codes associated with this street
  data.properties = data.properties.filter(prop => prop.street_id !== id);
  data.referenceCodes = (data.referenceCodes || []).filter(rc => rc.street_id !== id);

  save();
  return true;
}

// Property functions
function getAllProperties() {
  if (!data) init();
  return data.properties || [];
}

function getPropertyById(id) {
  if (!data) init();
  return data.properties.find(p => p.id === id) || null;
}

function getPropertiesByStreetId(streetId) {
  if (!data) init();
  return data.properties.filter(p => p.street_id === streetId) || [];
}

function createProperty(propertyData) {
  if (!data) init();
  
  const property = {
    id: data.nextPropertyId++,
    number: propertyData.number,
    latitude: propertyData.latitude,
    longitude: propertyData.longitude,
    street_id: propertyData.street_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  data.properties.push(property);
  save();
  return property.id;
}

function updateProperty(id, propertyData) {
  if (!data) init();
  
  const propertyIndex = data.properties.findIndex(p => p.id === id);
  if (propertyIndex === -1) return false;

  data.properties[propertyIndex] = {
    ...data.properties[propertyIndex],
    number: propertyData.number,
    latitude: propertyData.latitude,
    longitude: propertyData.longitude,
    street_id: propertyData.street_id !== undefined ? propertyData.street_id : data.properties[propertyIndex].street_id,
    updated_at: new Date().toISOString()
  };

  save();
  return true;
}

function deleteProperty(id) {
  if (!data) init();
  
  const propertyIndex = data.properties.findIndex(p => p.id === id);
  if (propertyIndex === -1) return false;

  data.properties.splice(propertyIndex, 1);
  save();
  return true;
}

// Reference Code functions
function getAllReferenceCodes() {
  if (!data) init();
  return data.referenceCodes || [];
}

function getReferenceCodeById(id) {
  if (!data) init();
  return data.referenceCodes.find(rc => rc.id === id) || null;
}

function getReferenceCodesByStreetId(streetId) {
  if (!data) init();
  return (data.referenceCodes || []).filter(rc => rc.street_id === streetId).sort((a, b) => a.sequence - b.sequence);
}

function createReferenceCode(referenceCodeData) {
  if (!data) init();
  
  const referenceCode = {
    id: data.nextReferenceCodeId++,
    code: referenceCodeData.code,
    street_id: referenceCodeData.street_id,
    street_name: referenceCodeData.street_name,
    latitude: referenceCodeData.latitude,
    longitude: referenceCodeData.longitude,
    distance_from_start: referenceCodeData.distance_from_start,
    sequence: referenceCodeData.sequence,
    created_at: new Date().toISOString()
  };

  data.referenceCodes.push(referenceCode);
  // Don't save here - we'll save once after all codes are created
  return referenceCode.id;
}

function generateReferenceCodesForStreet(streetId, streetName, coordinates) {
  if (!data) init();
  
  try {
    // Remove existing reference codes for this street
    data.referenceCodes = (data.referenceCodes || []).filter(rc => rc.street_id !== streetId);
    
    // Generate new reference codes
    const { generateReferenceCodes } = require('../utils/referenceCodes');
    const referencePoints = generateReferenceCodes(coordinates, streetId, streetName);
    
    if (!referencePoints || referencePoints.length === 0) {
      console.warn(`No reference points generated for street ${streetId}`);
      return [];
    }
    
    // Save reference codes
    const createdIds = referencePoints.map(point => {
      try {
        return createReferenceCode(point);
      } catch (error) {
        console.error(`Error creating reference code for street ${streetId}:`, error);
        return null;
      }
    }).filter(id => id !== null);
    
    // Save all at once instead of saving after each creation
    save();
    
    return createdIds;
  } catch (error) {
    console.error(`Error in generateReferenceCodesForStreet for street ${streetId}:`, error);
    throw error;
  }
}

function deleteReferenceCodesByStreetId(streetId) {
  if (!data) init();
  data.referenceCodes = (data.referenceCodes || []).filter(rc => rc.street_id !== streetId);
  save();
  return true;
}

function getDb() {
  if (!data) {
    init();
  }
  return {
    getAllStreets,
    getStreetById,
    createStreet,
    updateStreet,
    deleteStreet,
    getAllProperties,
    getPropertyById,
    getPropertiesByStreetId,
    createProperty,
    updateProperty,
    deleteProperty,
    getAllReferenceCodes,
    getReferenceCodeById,
    getReferenceCodesByStreetId,
    createReferenceCode,
    generateReferenceCodesForStreet,
    deleteReferenceCodesByStreetId
  };
}

module.exports = {
  init,
  getDb
};
