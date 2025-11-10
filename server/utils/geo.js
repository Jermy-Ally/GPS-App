const EARTH_RADIUS_METERS = 6371000

/**
 * Calculates the great-circle distance between two coordinates using the
 * Haversine formula. Assumes latitude and longitude are in decimal degrees.
 */
function haversineDistance({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 }) {
  if (
    lat1 === undefined ||
    lat2 === undefined ||
    lon1 === undefined ||
    lon2 === undefined
  ) {
    return 0
  }

  const toRadians = (deg) => (deg * Math.PI) / 180

  const φ1 = toRadians(lat1)
  const φ2 = toRadians(lat2)
  const Δφ = toRadians(lat2 - lat1)
  const Δλ = toRadians(lon2 - lon1)

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}

module.exports = {
  haversineDistance,
  EARTH_RADIUS_METERS
}


