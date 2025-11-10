const { haversineDistance, EARTH_RADIUS_METERS } = require('../utils/geo')

class NavigationGraph {
  constructor() {
    this.nodes = new Map()
    this.edges = new Map()
  }

  upsertNode(node) {
    const existing = this.nodes.get(node.id)
    if (existing) {
      return existing
    }

    const stored = {
      id: node.id,
      streetId: node.streetId,
      sequence: node.sequence,
      latitude: node.latitude,
      longitude: node.longitude,
      neighbors: new Map()
    }

    this.nodes.set(node.id, stored)
    this.edges.set(node.id, stored.neighbors)
    return stored
  }

  removeBidirectionalEdge(nodeAId, nodeBId) {
    const nodeA = this.nodes.get(nodeAId)
    const nodeB = this.nodes.get(nodeBId)

    if (nodeA) {
      nodeA.neighbors.delete(nodeBId)
    }

    if (nodeB) {
      nodeB.neighbors.delete(nodeAId)
    }
  }

  deleteNode(nodeId) {
    const node = this.nodes.get(nodeId)
    if (!node) {
      return
    }

    node.neighbors.forEach((_, neighborId) => {
      const neighbor = this.nodes.get(neighborId)
      if (neighbor) {
        neighbor.neighbors.delete(nodeId)
      }
    })

    this.nodes.delete(nodeId)
    this.edges.delete(nodeId)
  }

  addBidirectionalEdge(nodeAId, nodeBId, cost) {
    const nodeA = this.nodes.get(nodeAId)
    const nodeB = this.nodes.get(nodeBId)

    if (!nodeA || !nodeB) {
      return
    }

    nodeA.neighbors.set(nodeBId, cost)
    nodeB.neighbors.set(nodeAId, cost)
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId)
  }

  get size() {
    return this.nodes.size
  }

  get edgeCount() {
    let total = 0
    this.nodes.forEach((node) => {
      total += node.neighbors.size
    })
    return total / 2
  }

  clone() {
    const newGraph = new NavigationGraph()

    this.nodes.forEach((node) => {
      const cloned = {
        id: node.id,
        streetId: node.streetId,
        sequence: node.sequence,
        latitude: node.latitude,
        longitude: node.longitude,
        neighbors: new Map()
      }
      newGraph.nodes.set(node.id, cloned)
      newGraph.edges.set(node.id, cloned.neighbors)
    })

    this.nodes.forEach((node) => {
      node.neighbors.forEach((cost, neighborId) => {
        const clonedNode = newGraph.nodes.get(node.id)
        clonedNode.neighbors.set(neighborId, cost)
      })
    })

    return newGraph
  }
}

function createNodeId(streetId, sequence) {
  return `${streetId}:${sequence}`
}

function createIntersectionNodeId(counter) {
  return `X:${counter}`
}

function orientation(p, q, r) {
  const val = (q.latitude - p.latitude) * (r.longitude - q.longitude) -
    (q.longitude - p.longitude) * (r.latitude - q.latitude)
  if (Math.abs(val) < 1e-12) return 0
  return val > 0 ? 1 : 2
}

function onSegment(p, q, r) {
  return (
    q.longitude <= Math.max(p.longitude, r.longitude) + 1e-12 &&
    q.longitude + 1e-12 >= Math.min(p.longitude, r.longitude) &&
    q.latitude <= Math.max(p.latitude, r.latitude) + 1e-12 &&
    q.latitude + 1e-12 >= Math.min(p.latitude, r.latitude)
  )
}

function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orientation(p1, p2, p3)
  const o2 = orientation(p1, p2, p4)
  const o3 = orientation(p3, p4, p1)
  const o4 = orientation(p3, p4, p2)

  if (o1 !== o2 && o3 !== o4) {
    return true
  }

  if (o1 === 0 && onSegment(p1, p3, p2)) return true
  if (o2 === 0 && onSegment(p1, p4, p2)) return true
  if (o3 === 0 && onSegment(p3, p1, p4)) return true
  if (o4 === 0 && onSegment(p3, p2, p4)) return true

  return false
}

function intersectionPoint(p1, p2, p3, p4) {
  const x1 = p1.longitude
  const y1 = p1.latitude
  const x2 = p2.longitude
  const y2 = p2.latitude
  const x3 = p3.longitude
  const y3 = p3.latitude
  const x4 = p4.longitude
  const y4 = p4.latitude

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-12) {
    return null
  }

  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom

  if (
    px < Math.min(x1, x2) - 1e-9 || px > Math.max(x1, x2) + 1e-9 ||
    px < Math.min(x3, x4) - 1e-9 || px > Math.max(x3, x4) + 1e-9 ||
    py < Math.min(y1, y2) - 1e-9 || py > Math.max(y1, y2) + 1e-9 ||
    py < Math.min(y3, y4) - 1e-9 || py > Math.max(y3, y4) + 1e-9
  ) {
    return null
  }

  return { latitude: py, longitude: px }
}

function pointsEqual(a, b) {
  return Math.abs(a.latitude - b.latitude) < 1e-9 &&
    Math.abs(a.longitude - b.longitude) < 1e-9
}

function distanceAlongSegment(start, end, point) {
  const total = haversineDistance(start, end)
  const startToPoint = haversineDistance(start, point)
  return total === 0 ? 0 : startToPoint / total
}

function addIntersectionNodes(graph, segments) {
  const segmentIntersections = new Map()
  const intersectionNodeCache = new Map()
  let intersectionCounter = 0

  for (let i = 0; i < segments.length; i += 1) {
    const segA = segments[i]
    for (let j = i + 1; j < segments.length; j += 1) {
      const segB = segments[j]

      const sharesEndpoint =
        segA.startId === segB.startId ||
        segA.startId === segB.endId ||
        segA.endId === segB.startId ||
        segA.endId === segB.endId

      if (sharesEndpoint) {
        continue
      }

      if (!segmentsIntersect(segA.start, segA.end, segB.start, segB.end)) {
        continue
      }

      const point = intersectionPoint(segA.start, segA.end, segB.start, segB.end)
      if (!point) {
        continue
      }

      if (pointsEqual(point, segA.start) || pointsEqual(point, segA.end) ||
        pointsEqual(point, segB.start) || pointsEqual(point, segB.end)) {
        continue
      }

      const distanceA = distanceAlongSegment(segA.start, segA.end, point)
      const distanceB = distanceAlongSegment(segB.start, segB.end, point)

      if (distanceA <= 0 || distanceA >= 1 || distanceB <= 0 || distanceB >= 1) {
        continue
      }

      const key = `${point.latitude.toFixed(8)}:${point.longitude.toFixed(8)}`

      if (!segmentIntersections.has(i)) {
        segmentIntersections.set(i, [])
      }
      if (!segmentIntersections.has(j)) {
        segmentIntersections.set(j, [])
      }

      segmentIntersections.get(i).push({ key, point, position: distanceA })
      segmentIntersections.get(j).push({ key, point, position: distanceB })

      if (!intersectionNodeCache.has(key)) {
        const nodeId = createIntersectionNodeId(++intersectionCounter)
        graph.upsertNode({
          id: nodeId,
          streetId: null,
          sequence: 0,
          latitude: point.latitude,
          longitude: point.longitude
        })
        intersectionNodeCache.set(key, nodeId)
      }
    }
  }

  segmentIntersections.forEach((intersections, segmentIndex) => {
    if (!intersections || intersections.length === 0) {
      return
    }

    const segment = segments[segmentIndex]
    graph.removeBidirectionalEdge(segment.startId, segment.endId)

    const sorted = intersections.sort((a, b) => a.position - b.position)
    let previousNodeId = segment.startId
    let previousPoint = segment.start

    sorted.forEach((intersection) => {
      const nodeId = intersectionNodeCache.get(intersection.key)
      if (!nodeId) {
        return
      }

      const currentNode = graph.getNode(nodeId)
      if (!currentNode) {
        return
      }

      const cost = haversineDistance(previousPoint, currentNode)
      graph.addBidirectionalEdge(previousNodeId, nodeId, cost)

      previousNodeId = nodeId
      previousPoint = currentNode
    })

    const endNode = graph.getNode(segment.endId)
    if (endNode) {
      const cost = haversineDistance(previousPoint, endNode)
      graph.addBidirectionalEdge(previousNodeId, segment.endId, cost)
    }
  })
}

function mergeNodeInto(graph, sourceNodeId, targetNodeId) {
  if (!sourceNodeId || sourceNodeId === targetNodeId) {
    return
  }

  const source = graph.getNode(sourceNodeId)
  const target = graph.getNode(targetNodeId)

  if (!source || !target) {
    return
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

function findSnapCandidate(graph, node, edges, thresholdMeters) {
  if (!edges.length) {
    return null
  }

  let best = null

  edges.forEach((edge) => {
    if (
      edge.startId === node.id ||
      edge.endId === node.id ||
      node.neighbors.has(edge.startId) ||
      node.neighbors.has(edge.endId)
    ) {
      return
    }

    const { point, distance, t } = projectPointOntoSegmentMeters(
      node,
      edge.start,
      edge.end
    )

    if (Number.isNaN(distance) || distance >= thresholdMeters) {
      return
    }

    let mergeTargetId = null
    const epsilon = 1e-6
    if (t <= epsilon) {
      mergeTargetId = edge.startId
    } else if (t >= 1 - epsilon) {
      mergeTargetId = edge.endId
    }

    if (!best || distance < best.distance) {
      best = {
        edge,
        point,
        distance,
        mergeTargetId
      }
    }
  })

  return best
}

function snapNodesToEdges(graph, thresholdMeters = 0) {
  if (!thresholdMeters || thresholdMeters <= 0) {
    return
  }

  const nodes = Array.from(graph.nodes.values())

  nodes.forEach((node) => {
    if (!graph.nodes.has(node.id)) {
      return
    }

    const edges = collectGraphEdges(graph)
    const candidate = findSnapCandidate(graph, node, edges, thresholdMeters)

    if (!candidate) {
      return
    }

    const { edge, point, mergeTargetId } = candidate

    if (mergeTargetId) {
      mergeNodeInto(graph, node.id, mergeTargetId)
      return
    }

    graph.removeBidirectionalEdge(edge.startId, edge.endId)

    const targetNode = graph.getNode(node.id)
    if (!targetNode) {
      return
    }

    targetNode.latitude = point.latitude
    targetNode.longitude = point.longitude

    const startNode = graph.getNode(edge.startId)
    const endNode = graph.getNode(edge.endId)

    if (startNode) {
      const costStart = haversineDistance(targetNode, startNode)
      graph.addBidirectionalEdge(node.id, edge.startId, costStart)
    }

    if (endNode) {
      const costEnd = haversineDistance(targetNode, endNode)
      graph.addBidirectionalEdge(node.id, edge.endId, costEnd)
    }
  })
}

function buildGraphFromStreets(streets = [], options = {}) {
  const graph = new NavigationGraph()
  const segments = []

  streets.forEach((street) => {
    const nodes = Array.isArray(street.nodes) ? street.nodes.slice().sort((a, b) => a.sequence - b.sequence) : []

    nodes.forEach((node) => {
      graph.upsertNode({
        id: createNodeId(street.id, node.sequence),
        streetId: street.id,
        sequence: node.sequence,
        latitude: node.latitude,
        longitude: node.longitude
      })
    })

    for (let index = 0; index < nodes.length - 1; index += 1) {
      const current = nodes[index]
      const next = nodes[index + 1]

      const currentId = createNodeId(street.id, current.sequence)
      const nextId = createNodeId(street.id, next.sequence)

      const cost = haversineDistance(
        { latitude: current.latitude, longitude: current.longitude },
        { latitude: next.latitude, longitude: next.longitude }
      )

      graph.addBidirectionalEdge(currentId, nextId, cost)

      segments.push({
        streetId: street.id,
        startId: currentId,
        endId: nextId,
        start: { latitude: current.latitude, longitude: current.longitude },
        end: { latitude: next.latitude, longitude: next.longitude }
      })
    }
  })

  addIntersectionNodes(graph, segments)
  snapNodesToEdges(graph, options.snapThresholdMeters)

  return graph
}

module.exports = {
  NavigationGraph,
  buildGraphFromStreets
}


