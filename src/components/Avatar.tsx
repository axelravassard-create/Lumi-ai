import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { AvatarState, AvatarMood } from './avatar/RobotAvatar'
import { useLuminator, useTier } from '../lib/entitlement'

// Le moteur 3D (three.js + R3F) est lourd : on le charge à la demande pour ne
// jamais ralentir le premier affichage de la page.
const RobotAvatar = lazy(() => import('./avatar/RobotAvatar'))

interface Props {
  state?: AvatarState
  mood?: AvatarMood
  className?: string
  /** Désactive l'avatar 3D et affiche le repli léger (ex. mobile bas de gamme). */
  forceFallback?: boolean
  /** Lunettes rondes (variantes payantes). Si non précisé : selon la possession. */
  glasses?: boolean
  /** Petit ordinateur portable (variante « Bluminator »). Si non précisé : selon le palier. */
  laptop?: boolean
  /** Anime la bouche comme s'il parlait. */
  speaking?: boolean
  /** Gèle la boucle de rendu 3D (ex. pendant une transition CSS pour éviter les lags). */
  paused?: boolean
  /** Réaction lumineuse au clic (étincelles/rayons). false = vitrine sans effet. */
  interactive?: boolean
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
function Fallback({ state, glasses, laptop }: { state: AvatarState; glasses: boolean; laptop: boolean }) {
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
        {laptop ? '👨‍💻' : glasses ? '🤓' : '🤖'}
      </div>
    </div>
  )
}

export function Avatar({ state = 'idle', mood = 'neutral', className = '', forceFallback = false, glasses, laptop, speaking = false, paused = false, interactive = true }: Props) {
  const owns = useLuminator()
  const tier = useTier()
  // Si `glasses` n'est pas imposé, on suit la possession d'un palier payant.
  const showGlasses = glasses ?? owns
  // Si `laptop` n'est pas imposé, seul Bluminator a l'ordinateur portable.
  const showLaptop = laptop ?? tier === 'bluminator'
  const canRender3D = useMemo(() => !forceFallback && supportsWebGL(), [forceFallback])
  const ref = useRef<HTMLDivElement>(null)
  // Visible à l'écran ? On met la 3D en pause quand l'avatar sort du viewport
  // (économie GPU/batterie sur les pages longues comme le tableau de bord).
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!canRender3D || !ref.current || typeof IntersectionObserver === 'undefined') return
    const el = ref.current
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [canRender3D])

  return (
    <div ref={ref} className={`relative select-none ${className}`}>
      {canRender3D ? (
        <Suspense fallback={<Fallback state={state} glasses={showGlasses} laptop={showLaptop} />}>
          <RobotAvatar state={state} mood={mood} active={visible && !paused} glasses={showGlasses} laptop={showLaptop} speaking={speaking} interactive={interactive} />
        </Suspense>
      ) : (
        <Fallback state={state} glasses={showGlasses} laptop={showLaptop} />
      )}
    </div>
  )
}
