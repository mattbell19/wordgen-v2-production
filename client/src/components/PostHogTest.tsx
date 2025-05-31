import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

export function PostHogTest() {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check if PostHog is initialized
    if (window.posthog) {
      setIsInitialized(true)
      // Send a page view event
      posthog.capture('page_view', {
        page: 'PostHogTest'
      })
    }
  }, [])

  const handleTestClick = () => {
    if (!window.posthog) {
      alert('PostHog not initialized yet')
      return
    }
    
    posthog.capture('button_clicked', {
      button_name: 'test_button',
      timestamp: new Date().toISOString()
    })
    alert('Event sent! Check PostHog dashboard')
  }

  if (!isInitialized) {
    return null
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>PostHog Test Component</h2>
      <button 
        onClick={handleTestClick}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Send Test Event
      </button>
    </div>
  )
} 