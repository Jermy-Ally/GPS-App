import React, { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config/api'
import GraphMap from './GraphMap'
import './DeveloperPages.css'

const NavigationGraphDev = () => {
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadGraph = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_URL}/navigation/graph`)
        if (!response.ok) {
          throw new Error('Failed to load navigation graph')
        }

        const data = await response.json()
        if (isMounted) {
          setGraph(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load navigation graph')
          setGraph(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadGraph()

    return () => {
      isMounted = false
    }
  }, [])

  const stats = useMemo(() => graph?.stats ?? { nodes: 0, edges: 0 }, [graph])

  return (
    <div className="dev-page">
      <header className="dev-header">
        <div>
          <h1>Navigation Graph Inspector</h1>
          <p>Visualize the generated navigation graph to verify node linkage and coverage.</p>
        </div>
        <div className="dev-stats">
          <span className="dev-chip">Nodes: {stats.nodes}</span>
          <span className="dev-chip">Edges: {stats.edges}</span>
        </div>
      </header>

      {loading && (
        <div className="dev-status">Loading navigation graph…</div>
      )}

      {!loading && error && (
        <div className="dev-status error">{error}</div>
      )}

      {!loading && !error && graph && (
        <section className="dev-map-section">
          <GraphMap nodes={graph.nodes} edges={graph.edges} />
        </section>
      )}
    </div>
  )
}

export default NavigationGraphDev


