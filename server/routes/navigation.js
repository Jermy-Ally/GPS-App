const express = require('express')
const router = express.Router()

const { getDb } = require('../database/db')
const { buildGraphFromStreets } = require('../navigation/graph')
const { haversineDistance, EARTH_RADIUS_METERS } = require('../utils/geo')

/**
 * GET /api/navigation/path?from=<propertyId>&to=<propertyId>
 *
 * Temporary stub that returns a trivial path consisting of the origin and
 * destination property coordinates. This will be replaced with real pathfinding.
 */
let cachedGraph = null
let lastGraphBuild = 0
const defaultSnapThreshold = parseFloat(process.env.NAV_SNAP_THRESHOLD || '8')

function ensureNavigationGraph() {
  const now = Date.now()

  // Rebuild graph if it has not been created yet or is older than 5 minutes.
  if (!cachedGraph || now - lastGraphBuild > 5 * 60 * 1000) {
    const db = getDb()
    const streets = db.getAllStreets()
    cachedGraph = buildGraphFromStreets(streets, {
      snapThresholdMeters: Number.isFinite(defaultSnapThreshold) ? defaultSnapThreshold : 8
    })
    lastGraphBuild = now

    console.log(
      `Navigation graph rebuilt with ${cachedGraph.size} nodes and ${cachedGraph.edgeCount} edges.`
    )
  }

  return cachedGraph
}

function toCartesianMeters(point, referenceLatitudeRadians) {
  const latRad = (point.latitude * Math.PI) / 180
  const lonRad = (point.longitude * Math.PI) / 180

  return {
    x: EARTH_RADIUS_METERS * lonRad * Math.cos(referenceLatitudeRadians),
    y: EARTH_RADIUS_METERS * latRad
  }
}

function projectPointOntoSegmentMeters(point, start, end) {
  const referenceLat =
    ((point.latitude ?? 0) + (start.latitude ?? 0) + (end.latitude ?? 0)) / 3
  const referenceLatRad = (referenceLat * Math.PI) / 180

  const startXY = toCartesianMeters(start, referenceLatRad)
  const endXY = toCartesianMeters(end, referenceLatRad)
  const pointXY = toCartesianMeters(point, referenceLatRad)

  const dx = endXY.x - startXY.x
  const dy = endXY.y - startXY.y
  const segmentLengthSq = dx * dx + dy * dy

  let t = 0
  if (segmentLengthSq > 0) {
    t = ((pointXY.x - startXY.x) * dx + (pointXY.y - startXY.y) * dy) / segmentLengthSq
  }

  const clamped = Math.max(0, Math.min(1, t))
  const closestXY = {
    x: startXY.x + clamped * dx,
    y: startXY.y + clamped * dy
  }

  const distance = Math.hypot(pointXY.x - closestXY.x, pointXY.y - closestXY.y)

  const closestLongitude =
    (closestXY.x / (EARTH_RADIUS_METERS * Math.cos(referenceLatRad))) * (180 / Math.PI)
  const closestLatitude = (closestXY.y / EARTH_RADIUS_METERS) * (180 / Math.PI)

  return {
    point: {
      latitude: closestLatitude,
      longitude: closestLongitude
    },
    distance,
    t: clamped
  }
}

function collectGraphEdges(graph) {
  const edges = []
  const seen = new Set()

  graph.nodes.forEach((node) => {
    node.neighbors.forEach((_, neighborId) => {
      const key = node.id < neighborId ? `${node.id}|${neighborId}` : `${neighborId}|${node.id}`
      if (seen.has(key)) {
        return
      }
      seen.add(key)

      const neighbor = graph.getNode(neighborId)
      if (!neighbor) {
        return
      }

      edges.push({
        startId: node.id,
        endId: neighborId,
        start: {
          latitude: node.latitude,
          longitude: node.longitude
        },
        end: {
          latitude: neighbor.latitude,
          longitude: neighbor.longitude
        }
      })
    })
  })

  return edges
}

function mergeNodeInto(graph, sourceNodeId, targetNodeId) {
  if (!sourceNodeId || sourceNodeId === targetNodeId) {
    return targetNodeId
  }

  const source = graph.getNode(sourceNodeId)
  const target = graph.getNode(targetNodeId)

  if (!source || !target) {
    return targetNodeId
  }

  source.neighbors.forEach((_, neighborId) => {
    if (neighborId === targetNodeId) {
      return
    }

    const neighbor = graph.getNode(neighborId)
    if (!neighbor) {
      return
    }

    const cost = haversineDistance(target, neighbor)
    graph.addBidirectionalEdge(target.id, neighborId, cost)
  })

  graph.deleteNode(sourceNodeId)
  return targetNodeId
}

function attachPropertyToGraph(graph, property) {
  const nodes = Array.from(graph.nodes.values())

  let nearestNodeId = null
  let nearestNodeDistance = Infinity

  nodes.forEach((node) => {
    const distance = haversineDistance(property, node)
    if (distance < nearestNodeDistance) {
      nearestNodeDistance = distance
      nearestNodeId = node.id
    }
  })

  const edges = collectGraphEdges(graph)
  let bestEdge = null

  edges.forEach((edge) => {
    const { point, distance, t } = projectPointOntoSegmentMeters(
      property,
      edge.start,
      edge.end
    )

    if (!Number.isFinite(distance) || distance >= nearestNodeDistance) {
      return
    }

    bestEdge = { edge, point, t, distance }
    nearestNodeDistance = distance
  })

  if (!bestEdge) {
    return nearestNodeId
  }

  const { edge, point, t } = bestEdge

  const epsilon = 1e-6
  if (t <= epsilon) {
    return mergeNodeInto(graph, nearestNodeId, edge.startId)
  }

  if (t >= 1 - epsilon) {
    return mergeNodeInto(graph, nearestNodeId, edge.endId)
  }

  const existingNode = graph.getNode(nearestNodeId)
  if (!existingNode) {
    return null
  }

  existingNode.latitude = point.latitude
  existingNode.longitude = point.longitude

  graph.removeBidirectionalEdge(edge.startId, edge.endId)

  const startNode = graph.getNode(edge.startId)
  const endNode = graph.getNode(edge.endId)

  if (startNode) {
    const costStart = haversineDistance(existingNode, startNode)
    graph.addBidirectionalEdge(existingNode.id, startNode.id, costStart)
  }

  if (endNode) {
    const costEnd = haversineDistance(existingNode, endNode)
    graph.addBidirectionalEdge(existingNode.id, endNode.id, costEnd)
  }

  return existingNode.id
}

class MinHeap {
  constructor() {
    this.heap = []
  }

  push(item) {
    this.heap.push(item)
    this.bubbleUp(this.heap.length - 1)
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.heap[parent].priority <= this.heap[index].priority) {
        break
      }
      ;[this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]]
      index = parent
    }
  }

  pop() {
    if (this.heap.length === 0) {
      return null
    }

    const top = this.heap[0]
    const end = this.heap.pop()
    if (this.heap.length > 0) {
      this.heap[0] = end
      this.sinkDown(0)
    }
    return top
  }

  sinkDown(index) {
    const length = this.heap.length
    while (true) {
      let smallest = index
      const left = index * 2 + 1
      const right = index * 2 + 2

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left
      }

      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right
      }

      if (smallest === index) {
        break
      }

      ;[this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]]
      index = smallest
    }
  }

  isEmpty() {
    return this.heap.length === 0
  }
}

function reconstructPath(cameFrom, currentId) {
  const totalPath = [currentId]
  let current = currentId
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)
    totalPath.push(current)
  }
  return totalPath.reverse()
}

function findShortestPath(graph, startId, goalId) {
  if (startId === goalId) {
    return [startId]
  }

  const startNode = graph.getNode(startId)
  const goalNode = graph.getNode(goalId)

  if (!startNode || !goalNode) {
    return null
  }

  const openSet = new MinHeap()
  openSet.push({ nodeId: startId, priority: 0 })

  const cameFrom = new Map()
  const gScore = new Map([[startId, 0]])
  const fScore = new Map([[startId, haversineDistance(startNode, goalNode)]])

  while (!openSet.isEmpty()) {
    const current = openSet.pop()
    const currentId = current.nodeId

    if (currentId === goalId) {
      return reconstructPath(cameFrom, currentId)
    }

    const currentNode = graph.getNode(currentId)
    const currentG = gScore.get(currentId) ?? Infinity

    currentNode.neighbors.forEach((cost, neighborId) => {
      const tentativeG = currentG + cost
      const neighborG = gScore.get(neighborId) ?? Infinity

      if (tentativeG < neighborG) {
        cameFrom.set(neighborId, currentId)
        gScore.set(neighborId, tentativeG)

        const neighborNode = graph.getNode(neighborId)
        const heuristic = neighborNode ? haversineDistance(neighborNode, goalNode) : 0
        const priority = tentativeG + heuristic
        fScore.set(neighborId, priority)
        openSet.push({ nodeId: neighborId, priority })
      }
    })
  }

  return null
}

router.get('/path', (req, res) => {
  try {
    const fromId = Number(req.query.from)
    const toId = Number(req.query.to)

    if (!fromId || !toId || Number.isNaN(fromId) || Number.isNaN(toId)) {
      return res.status(400).json({
        error: 'Query parameters "from" and "to" are required property IDs'
      })
    }

    const graph = ensureNavigationGraph().clone()
    const db = getDb()
    const fromProperty = db.getPropertyById(fromId)
    const toProperty = db.getPropertyById(toId)

    if (!fromProperty) {
      return res.status(404).json({ error: `Property with id ${fromId} not found` })
    }

    if (!toProperty) {
      return res.status(404).json({ error: `Property with id ${toId} not found` })
    }

    const fromNodeId = attachPropertyToGraph(graph, fromProperty)
    const toNodeId = attachPropertyToGraph(graph, toProperty)

    if (!fromNodeId || !toNodeId) {
      return res.status(500).json({ error: 'Unable to attach properties to navigation graph' })
    }

    const nodePath = findShortestPath(graph, fromNodeId, toNodeId)

    if (!nodePath) {
      return res.status(404).json({ error: 'No route found between the selected properties' })
    }

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
          points: [
            {
              latitude: fromProperty.latitude,
              longitude: fromProperty.longitude,
              propertyId: fromProperty.id,
              label: 'property-from'
            },
            ...nodePath
              .map((nodeId, index) => {
                const node = graph.getNode(nodeId)
                if (!node) {
                  return null
                }

                return {
                  latitude: node.latitude,
                  longitude: node.longitude,
                  graphNodeId: node.id,
                  label: index === 0 ? 'graph-from' : index === nodePath.length - 1 ? 'graph-to' : 'graph-node'
                }
              })
              .filter(Boolean),
            {
              latitude: toProperty.latitude,
              longitude: toProperty.longitude,
              propertyId: toProperty.id,
              label: 'property-to'
            }
          ].filter(Boolean)
        }
      ],
      graph: {
        nodes: graph.size,
        edges: graph.edgeCount
      }
    })
  } catch (error) {
    console.error('Error computing navigation path:', error)
    res.status(500).json({ error: 'Failed to compute navigation path' })
  }
})

router.get('/graph', (req, res) => {
  try {
    const graph = ensureNavigationGraph()

    const nodes = Array.from(graph.nodes.values()).map((node) => ({
      id: node.id,
      streetId: node.streetId,
      sequence: node.sequence,
      latitude: node.latitude,
      longitude: node.longitude
    }))

    const edges = []
    const seen = new Set()

    graph.nodes.forEach((node) => {
      node.neighbors.forEach((cost, neighborId) => {
        const key = node.id < neighborId ? `${node.id}|${neighborId}` : `${neighborId}|${node.id}`
        if (seen.has(key)) {
          return
        }

        seen.add(key)
        edges.push({
          from: node.id,
          to: neighborId,
          cost
        })
      })
    })

    res.json({
      stats: {
        nodes: graph.size,
        edges: graph.edgeCount
      },
      nodes,
      edges
    })
  } catch (error) {
    console.error('Error inspecting navigation graph:', error)
    res.status(500).json({ error: 'Failed to inspect navigation graph' })
  }
})

module.exports = router


