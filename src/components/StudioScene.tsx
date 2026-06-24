import { useEffect, useState } from 'react'
import { Avatar } from './Avatar'
import type { AvatarMood, AvatarState } from './avatar/RobotAvatar'

interface Props {
  onBack: () => void
}

interface Scene {
  phase: 'lumi' | 'luminator'
  glasses: boolean
  mood: AvatarMood
  state: AvatarState
  speaking: boolean
  kicker: string
  title: string
  sub: string
  showScore?: boolean
  cta?: boolean
  dur: number
}

// Storyboard de la pub : Lumi se présente → annonce le problème → montre qu'il
// le détecte ; puis Luminator se présente → montre la solution → CTA d'achat.
const SCENES: Scene[] = [
  { phase: 'lumi', glasses: false, mood: 'neutral', state: 'idle', speaking: true, kicker: '👋 Bonjour', title: "Moi, c'est Blumi.", sub: "Ton guide face à l'intelligence artificielle.", dur: 2600 },
  { phase: 'lumi', glasses: false, mood: 'concerned', state: 'idle', speaking: false, kicker: 'Le problème', title: "L'IA va transformer ton métier.", sub: 'Des tâches entières vont être automatisées.', dur: 3000 },
  { phase: 'lumi', glasses: false, mood: 'concerned', state: 'thinking', speaking: false, kicker: 'Ce que je fais', title: 'Je détecte ton risque.', sub: "L'exposition de TON métier à l'IA, en 30 secondes.", showScore: true, dur: 3400 },
  { phase: 'luminator', glasses: true, mood: 'calm', state: 'idle', speaking: true, kicker: '✨ Et voici…', title: 'Blumiman.', sub: 'La version qui passe à l\'action.', dur: 2800 },
  { phase: 'luminator', glasses: true, mood: 'calm', state: 'idle', speaking: false, kicker: 'La solution', title: 'Il automatise ton métier.', sub: 'Outils IA, no-code, modèles prêts — du temps gagné, pour de vrai.', dur: 3200 },
  { phase: 'luminator', glasses: true, mood: 'calm', state: 'idle', speaking: false, kicker: 'À toi de jouer', title: 'Découvre. Puis agis.', sub: 'Essaie Blumi gratuitement.', cta: true, dur: 3600 },
]

// Scène pub « studio » — à filmer (capture d'écran) puis monter pour les réseaux.
// Accès : #/studio. Format pensé vertical 9:16.
export function StudioScene({ onBack }: Props) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [score, setScore] = useState(0)
  const scene = SCENES[i]

  // Déroulé automatique en boucle.
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => setI((x) => (x + 1) % SCENES.length), scene.dur)
    return () => clearTimeout(t)
  }, [i, playing, scene.dur])

  // Compteur de score animé sur la scène « détection ».
  useEffect(() => {
    if (!scene.showScore) {
      setScore(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const target = 78
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 1300)
      setScore(Math.round(target * p))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [i, scene.showScore])

  const bg =
    scene.phase === 'luminator'
      ? 'from-violet-700 via-brand-700 to-amber-400'
      : 'from-ink-900 via-brand-900 to-brand-700'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center gap-4 overflow-auto bg-ink-950 p-4">
      {/* Scène à filmer : cadre vertical 9:16 */}
      <div className="relative aspect-[9/16] h-[86vh] max-h-[86vh] w-auto max-w-full overflow-hidden rounded-[2rem] shadow-glow">
        <div className={`absolute inset-0 bg-gradient-to-b ${bg} transition-colors duration-700`} />
        {/* halo doux */}
        <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(40rem 40rem at 50% 20%, rgba(255,255,255,0.18), transparent 60%)' }} />

        <div className="relative flex h-full flex-col items-center px-7 pb-9 pt-12 text-center text-white">
          {/* Avatar */}
          <div className="relative h-[46%] w-full">
            <Avatar state={scene.state} mood={scene.mood} glasses={scene.glasses} speaking={scene.speaking} className="h-full w-full" />
            {scene.showScore && (
              <div className="absolute right-6 top-2 animate-fade-in rounded-2xl bg-white/15 px-3 py-2 backdrop-blur">
                <div className="font-display text-3xl font-extrabold tabular-nums">{score}%</div>
                <div className="text-[10px] uppercase tracking-wide text-white/80">exposé à l'IA</div>
              </div>
            )}
          </div>

          {/* Texte (re-monté à chaque scène → animation d'entrée) */}
          <div key={i} className="animate-fade-up mt-auto flex flex-col items-center">
            <span className="pill bg-white/15 text-white">{scene.kicker}</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] drop-shadow">{scene.title}</h2>
            <p className="mt-3 max-w-[16rem] text-lg text-white/85">{scene.sub}</p>
            {scene.cta && (
              <div className="mt-5 rounded-2xl bg-white px-6 py-3 font-display text-lg font-extrabold text-brand-700 shadow-lg">
                blumi · essaie gratuitement →
              </div>
            )}
          </div>

          {/* Progression des scènes */}
          <div className="mt-6 flex gap-1.5">
            {SCENES.map((_, k) => (
              <span key={k} className={`h-1 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Contrôles (hors cadre — n'apparaissent pas si tu recadres sur le 9:16) */}
      <div className="flex items-center gap-3 text-sm">
        <button onClick={() => setPlaying((p) => !p)} className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20">
          {playing ? '⏸ Pause' : '▶︎ Lecture'}
        </button>
        <button onClick={() => { setI(0); setPlaying(true) }} className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20">
          ↺ Rejouer
        </button>
        <button onClick={onBack} className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20">
          ✕ Quitter
        </button>
      </div>
      <p className="max-w-md text-center text-xs text-white/50">
        Filme ce cadre (OBS / QuickTime), recadre en 9:16, monte dans CapCut. Les boutons ci-dessus ne sont pas dans le cadre.
      </p>
    </div>
  )
}
