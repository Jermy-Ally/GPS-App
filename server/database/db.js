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
    data = { streets: [], nodes: [], nextStreetId: 1 };
    save();
  }

  console.log('Database initialized successfully');
  return { streets: data.streets, nodes: data.nodes };
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
    deleteStreet
  };
}

module.exports = {
  init,
  getDb
};
