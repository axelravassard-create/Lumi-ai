import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// Polices auto-hébergées (aucune requête vers Google → pas de transfert d'IP).
// Texte : Manrope (humaniste, lisible, pro). Titres : Sora (géométrique, premium).
import '@fontsource-variable/manrope'
import '@fontsource-variable/sora'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
