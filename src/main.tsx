import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '@fontsource-variable/nunito'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
