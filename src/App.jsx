import React from 'react'
import InteractiveDrawing from './components/InteractiveDrawing'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      <InteractiveDrawing />
    </div>
  )
}

export default App