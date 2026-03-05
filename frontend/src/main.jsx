import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GradLaunch from './GradLaunch.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GradLaunch />
  </StrictMode>,
)
