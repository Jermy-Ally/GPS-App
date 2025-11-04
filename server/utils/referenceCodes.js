/**
 * Calculate reference points every 25 meters along a street
 * Uses Haversine formula for distance calculations
 */

// Haversine formula to calculate distance between two coordinates in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Interpolate a point between two coordinates at a specific distance
function interpolatePoint(lat1, lon1, lat2, lon2, distance) {
  const totalDistance = haversineDistance(lat1, lon1, lat2, lon2);
  if (totalDistance === 0) return { lat: lat1, lng: lon1 };
  
  const ratio = distance / totalDistance;
  const lat = lat1 + (lat2 - lat1) * ratio;
  const lng = lon1 + (lon2 - lon1) * ratio;
  
  return { lat, lng };
}

/**
 * Generate reference points every 25 meters along a street
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @param {number} streetId - Street ID for generating codes
 * @param {string} streetName - Street name for generating codes
 * @returns {Array} Array of reference points with codes
 */
function generateReferenceCodes(coordinates, streetId, streetName) {
  if (!coordinates || coordinates.length < 2) {
    return [];
  }

  const referencePoints = [];
  const interval = 25; // 25 meters
  let totalDistance = 0;
  let referenceNumber = 1;

  // Process each segment of the street
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[i + 1];
    
    const segmentDistance = haversineDistance(lat1, lng1, lat2, lng2);
    
    // Calculate how many reference points fit in this segment
    const pointsInSegment = Math.floor(segmentDistance / interval);
    
    // Add reference points along this segment
    for (let j = 0; j <= pointsInSegment; j++) {
      const pointDistance = j * interval;
      
      // Skip if we've already added a point at the start of this segment
      if (i > 0 && j === 0) continue;
      
      // Calculate the position of this reference point
      const point = interpolatePoint(lat1, lng1, lat2, lng2, pointDistance);
      const distanceFromStart = totalDistance + pointDistance;
      
      // Generate reference code (e.g., "ST-001-R001", "ST-001-R002")
      const code = `ST-${String(streetId).padStart(3, '0')}-R${String(referenceNumber).padStart(3, '0')}`;
      
      referencePoints.push({
        code,
        street_id: streetId,
        street_name: streetName,
        latitude: point.lat,
        longitude: point.lng,
        distance_from_start: parseFloat(distanceFromStart.toFixed(2)),
        sequence: referenceNumber
      });
      
      referenceNumber++;
    }
    
    totalDistance += segmentDistance;
  }

  // Always add a reference point at the end of the street if it's not already included
  const lastCoord = coordinates[coordinates.length - 1];
  const [lastLng, lastLat] = lastCoord;
  const secondLastCoord = coordinates[coordinates.length - 2];
  const [secondLastLng, secondLastLat] = secondLastCoord;
  
  const lastSegmentDistance = haversineDistance(secondLastLat, secondLastLng, lastLat, lastLng);
  const lastPointDistance = Math.floor(lastSegmentDistance / interval) * interval;
  
  // Only add end point if it's significantly different from the last reference point
  if (lastPointDistance > 5) { // More than 5 meters away
    const code = `ST-${String(streetId).padStart(3, '0')}-R${String(referenceNumber).padStart(3, '0')}`;
    referencePoints.push({
      code,
      street_id: streetId,
      street_name: streetName,
      latitude: lastLat,
      longitude: lastLng,
      distance_from_start: parseFloat(totalDistance.toFixed(2)),
      sequence: referenceNumber
    });
  }

  return referencePoints;
}

module.exports = {
  generateReferenceCodes,
  haversineDistance
};

