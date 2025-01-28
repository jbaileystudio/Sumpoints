import React from 'react'
import InteractiveDrawing from './components/InteractiveDrawing'
function App() {
  console.log('App is rendering');
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, background: '#f0f0f0' }}>
      <InteractiveDrawing />
    </div>
  )
}
export default App