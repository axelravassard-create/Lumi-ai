import { lazy, Suspense, useMemo } from 'react'
import type { AvatarState } from './avatar/RobotAvatar'

// Le moteur 3D (three.js + R3F) est lourd : on le charge à la demande pour ne
// jamais ralentir le premier affichage de la page.
const RobotAvatar = lazy(() => import('./avatar/RobotAvatar'))

interface Props {
  state?: AvatarState
  className?: string
  /** Désactive l'avatar 3D et affiche le repli léger (ex. mobile bas de gamme). */
  forceFallback?: boolean
}

// Détection WebGL : si le navigateur ne sait pas faire de 3D, on retombe
// proprement sur un visuel statique plutôt que de planter l'interface.
function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Repli : pastille animée avec le robot emoji. Léger, sans dépendance 3D.
function Fallback({ state }: { state: AvatarState }) {
  return (
    <div className="relative grid h-full w-full place-items-center">
      <div className="absolute inset-0 grid place-items-center">
        <div
          className={`h-2/3 w-2/3 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 blur-2xl ${
            state === 'thinking' ? 'animate-ping opacity-50' : 'opacity-30'
          }`}
        />
      </div>
      <div className="relative grid h-1/2 w-1/2 max-h-28 max-w-28 place-items-center rounded-[2rem] bg-gradient-to-br from-brand-400 to-brand-700 text-5xl shadow-glow">
        🤖
      </div>
    </div>
  )
}

export function Avatar({ state = 'idle', className = '', forceFallback = false }: Props) {
  const canRender3D = useMemo(() => !forceFallback && supportsWebGL(), [forceFallback])

  return (
    <div className={`relative select-none ${className}`}>
      {canRender3D ? (
        <Suspense fallback={<Fallback state={state} />}>
          <RobotAvatar state={state} />
        </Suspense>
      ) : (
        <Fallback state={state} />
      )}
    </div>
  )
}
