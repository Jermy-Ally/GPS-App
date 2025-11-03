// API configuration
// In development, uses localhost. In production, uses relative paths (same origin)
const getApiUrl = () => {
  // Check if we have an explicit API URL from environment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // In production (when served from same server), use relative paths
  if (import.meta.env.PROD) {
    return '' // Empty string means same origin
  }
  
  // In development, use localhost
  return 'http://localhost:3001'
}

export const API_BASE_URL = getApiUrl()
export const API_URL = `${API_BASE_URL}/api`

