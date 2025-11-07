const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const dataDir = path.join(__dirname, '..', '..', 'data')
const dbFile = path.join(dataDir, 'streets.db')
const legacyJsonPath = path.join(dataDir, 'streets.json')

let dbInstance = null
let api = null

function ensureDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function createTables() {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS streets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      length REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS street_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      street_id INTEGER NOT NULL REFERENCES streets(id) ON DELETE CASCADE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      sequence INTEGER NOT NULL,
      UNIQUE(street_id, sequence)
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      street_id INTEGER REFERENCES streets(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      street_id INTEGER NOT NULL REFERENCES streets(id) ON DELETE CASCADE,
      street_name TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      distance_from_start REAL,
      sequence INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_street_nodes_street ON street_nodes(street_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_properties_street ON properties(street_id);
    CREATE INDEX IF NOT EXISTS idx_reference_codes_street ON reference_codes(street_id, sequence);
  `)
}

function maybeMigrateLegacyJson() {
  if (!fs.existsSync(legacyJsonPath)) {
    return
  }

  const streetCount = dbInstance.prepare('SELECT COUNT(1) AS count FROM streets').get().count
  if (streetCount > 0) {
    return
  }

  try {
    const fileData = fs.readFileSync(legacyJsonPath, 'utf8')
    const legacy = JSON.parse(fileData)

    if (!legacy || !Array.isArray(legacy.streets)) {
      return
    }

    const insertLegacyData = dbInstance.transaction(() => {
      const insertStreet = dbInstance.prepare(
        'INSERT INTO streets (id, name, length, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      const insertNode = dbInstance.prepare(
        'INSERT INTO street_nodes (street_id, latitude, longitude, sequence) VALUES (?, ?, ?, ?)'
      )
      const insertProperty = dbInstance.prepare(
        'INSERT INTO properties (id, number, latitude, longitude, street_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      const insertReference = dbInstance.prepare(
        'INSERT INTO reference_codes (id, code, street_id, street_name, latitude, longitude, distance_from_start, sequence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )

      const streets = legacy.streets || []
      const nodes = legacy.nodes || []
      const properties = legacy.properties || []
      const referenceCodes = legacy.referenceCodes || []

      streets.forEach(street => {
        const createdAt = street.created_at || new Date().toISOString()
        const updatedAt = street.updated_at || createdAt
        insertStreet.run(street.id, street.name || 'Unnamed Street', street.length || 0, createdAt, updatedAt)
      })

      nodes.forEach(node => {
        insertNode.run(node.street_id, node.latitude, node.longitude, node.sequence || 0)
      })

      properties.forEach(property => {
        const createdAt = property.created_at || new Date().toISOString()
        const updatedAt = property.updated_at || createdAt
        insertProperty.run(
          property.id,
          property.number || null,
          property.latitude,
          property.longitude,
          property.street_id || null,
          createdAt,
          updatedAt
        )
      })

      referenceCodes.forEach(referenceCode => {
        const createdAt = referenceCode.created_at || new Date().toISOString()
        insertReference.run(
          referenceCode.id,
          referenceCode.code,
          referenceCode.street_id,
          referenceCode.street_name || null,
          referenceCode.latitude,
          referenceCode.longitude,
          referenceCode.distance_from_start || 0,
          referenceCode.sequence || 0,
          createdAt
        )
      })
    })

    insertLegacyData()
    console.log('Migrated legacy streets.json data into SQLite database')
  } catch (error) {
    console.error('Failed to migrate legacy JSON data:', error)
  }
}

function init() {
  if (dbInstance) {
    return getDb()
  }

  ensureDataDirectory()
  dbInstance = new Database(dbFile)
  dbInstance.pragma('foreign_keys = ON')
  dbInstance.pragma('journal_mode = WAL')

  createTables()
  maybeMigrateLegacyJson()

  console.log(`SQLite database initialized at ${dbFile}`)
  return getDb()
}

function mapStreetRow(row) {
  const nodeStmt = dbInstance.prepare(
    'SELECT id, street_id, latitude, longitude, sequence FROM street_nodes WHERE street_id = ? ORDER BY sequence'
  )
  const nodes = nodeStmt.all(row.id)

  return {
    ...row,
    nodes,
    geometry: {
      type: 'LineString',
      coordinates: nodes.map(node => [node.longitude, node.latitude])
    }
  }
}

function getAllStreets() {
  const streets = dbInstance.prepare('SELECT * FROM streets ORDER BY id').all()
  return streets.map(mapStreetRow)
}

function getStreetById(id) {
  const street = dbInstance.prepare('SELECT * FROM streets WHERE id = ?').get(id)
  if (!street) {
    return null
  }
  return mapStreetRow(street)
}

function createStreet(streetData) {
  const { name, length = 0, nodes = [] } = streetData
  const now = new Date().toISOString()

  const insertStreet = dbInstance.prepare(
    'INSERT INTO streets (name, length, created_at, updated_at) VALUES (?, ?, ?, ?)'
  )
  const insertNode = dbInstance.prepare(
    'INSERT INTO street_nodes (street_id, latitude, longitude, sequence) VALUES (?, ?, ?, ?)'
  )

  const create = dbInstance.transaction(() => {
    const info = insertStreet.run(name, length, now, now)
    const streetId = info.lastInsertRowid

    nodes.forEach((node, index) => {
      insertNode.run(streetId, node.latitude, node.longitude, index)
    })

    return streetId
  })

  return create()
}

function updateStreet(id, streetData) {
  const existing = dbInstance.prepare('SELECT id FROM streets WHERE id = ?').get(id)
  if (!existing) {
    return false
  }

  const { name, length = 0, nodes = [] } = streetData
  const now = new Date().toISOString()

  const update = dbInstance.transaction(() => {
    dbInstance.prepare('UPDATE streets SET name = ?, length = ?, updated_at = ? WHERE id = ?')
      .run(name, length, now, id)

    dbInstance.prepare('DELETE FROM street_nodes WHERE street_id = ?').run(id)

    const insertNode = dbInstance.prepare(
      'INSERT INTO street_nodes (street_id, latitude, longitude, sequence) VALUES (?, ?, ?, ?)'
    )

    nodes.forEach((node, index) => {
      insertNode.run(id, node.latitude, node.longitude, index)
    })
  })

  update()
  return true
}

function deleteStreet(id) {
  const result = dbInstance.prepare('DELETE FROM streets WHERE id = ?').run(id)
  return result.changes > 0
}

function getAllProperties() {
  return dbInstance.prepare('SELECT * FROM properties ORDER BY id').all()
}

function getPropertyById(id) {
  return dbInstance.prepare('SELECT * FROM properties WHERE id = ?').get(id) || null
}

function getPropertiesByStreetId(streetId) {
  return dbInstance.prepare('SELECT * FROM properties WHERE street_id = ? ORDER BY id').all(streetId)
}

function createProperty(propertyData) {
  const now = new Date().toISOString()
  const stmt = dbInstance.prepare(
    'INSERT INTO properties (number, latitude, longitude, street_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const info = stmt.run(
    propertyData.number || null,
    propertyData.latitude,
    propertyData.longitude,
    propertyData.street_id || null,
    now,
    now
  )

  return info.lastInsertRowid
}

function updateProperty(id, propertyData) {
  const existing = getPropertyById(id)
  if (!existing) {
    return false
  }

  const now = new Date().toISOString()
  const streetId = propertyData.street_id !== undefined ? propertyData.street_id : existing.street_id

  const result = dbInstance.prepare(
    'UPDATE properties SET number = ?, latitude = ?, longitude = ?, street_id = ?, updated_at = ? WHERE id = ?'
  ).run(
    propertyData.number,
    propertyData.latitude,
    propertyData.longitude,
    streetId,
    now,
    id
  )

  return result.changes > 0
}

function deleteProperty(id) {
  const result = dbInstance.prepare('DELETE FROM properties WHERE id = ?').run(id)
  return result.changes > 0
}

function getAllReferenceCodes() {
  return dbInstance.prepare('SELECT * FROM reference_codes ORDER BY street_id, sequence').all()
}

function getReferenceCodeById(id) {
  return dbInstance.prepare('SELECT * FROM reference_codes WHERE id = ?').get(id) || null
}

function getReferenceCodesByStreetId(streetId) {
  return dbInstance.prepare('SELECT * FROM reference_codes WHERE street_id = ? ORDER BY sequence').all(streetId)
}

function createReferenceCode(referenceCodeData) {
  const stmt = dbInstance.prepare(
    'INSERT INTO reference_codes (code, street_id, street_name, latitude, longitude, distance_from_start, sequence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const info = stmt.run(
    referenceCodeData.code,
    referenceCodeData.street_id,
    referenceCodeData.street_name || null,
    referenceCodeData.latitude,
    referenceCodeData.longitude,
    referenceCodeData.distance_from_start || 0,
    referenceCodeData.sequence || 0,
    referenceCodeData.created_at || new Date().toISOString()
  )

  return info.lastInsertRowid
}

function generateReferenceCodesForStreet(streetId, streetName, coordinates) {
  const generate = dbInstance.transaction(() => {
    dbInstance.prepare('DELETE FROM reference_codes WHERE street_id = ?').run(streetId)

    const { generateReferenceCodes } = require('../utils/referenceCodes')
    const referencePoints = generateReferenceCodes(coordinates, streetId, streetName)

    if (!referencePoints || referencePoints.length === 0) {
      return []
    }

    const ids = []
    const insertStmt = dbInstance.prepare(
      'INSERT INTO reference_codes (code, street_id, street_name, latitude, longitude, distance_from_start, sequence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )

    referencePoints.forEach(point => {
      const info = insertStmt.run(
        point.code,
        streetId,
        streetName,
        point.latitude,
        point.longitude,
        point.distance_from_start || 0,
        point.sequence || 0,
        new Date().toISOString()
      )
      ids.push(info.lastInsertRowid)
    })

    return ids
  })

  return generate()
}

function deleteReferenceCodesByStreetId(streetId) {
  dbInstance.prepare('DELETE FROM reference_codes WHERE street_id = ?').run(streetId)
  return true
}

function getDb() {
  if (!dbInstance) {
    init()
  }

  if (!api) {
    api = {
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
    }
  }

  return api
}

module.exports = {
  init,
  getDb
}

