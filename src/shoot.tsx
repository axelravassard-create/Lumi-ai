import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Avatar } from './components/Avatar'

// Harnais de capture : rend les 3 avatars en grand sur fond transparent pour
// en faire des PNG statiques (utilisés figés sur les côtés du carrousel).
// Non inclus dans le build de prod (entrée séparée, utilisée en dev seulement).
function Shoot() {
  const VARIANTS = [
    { id: 'blumi', glasses: false, laptop: false },
    { id: 'blumiman', glasses: true, laptop: false },
    { id: 'bluminator', glasses: true, laptop: true },
  ]
  return (
    <div style={{ display: 'flex', gap: 40, padding: 20 }}>
      {VARIANTS.map((v) => (
        <div key={v.id} id={`shot-${v.id}`} className="shot">
          <Avatar state="idle" glasses={v.glasses} laptop={v.laptop} className="h-full w-full" />
        </div>
      ))}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shoot />
  </StrictMode>,
)
