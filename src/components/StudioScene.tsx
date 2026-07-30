import { useEffect, useMemo, useState } from 'react'
import { Avatar } from './Avatar'
import type { AvatarMood, AvatarState } from './avatar/RobotAvatar'

interface Props {
  onBack: () => void
}

type Tier = 'blumi' | 'blumiman' | 'bluminator'
type Bg = 'azur' | 'rain' | 'grid' | 'gold' | 'blue' | 'bokeh' | 'spot' | 'confetti' | 'neon' | 'pulse'
type Burst = 'none' | 'sparkle' | 'confetti'

interface Scene {
  tier: Tier
  mood: AvatarMood
  state: AvatarState
  speaking: boolean
  bg: Bg
  burst?: Burst
  kicker: string
  title: string
  sub?: string
  /** Gros mot/emoji « punch » en surimpression (style TikTok). */
  punch?: string
  /** Score animé (0 → n) affiché près de l'avatar. */
  score?: number
  cta?: boolean
  dur: number
}

interface Storyboard {
  id: string
  label: string
  hint: string
  scenes: Scene[]
}

// ————————————————————————————————————————————————————————————————
// Storyboards — chaque entrée est UNE vidéo verticale (9:16) à filmer.
// On joue sur : le personnage (Blumi / Blumiman / Bluminator), l'humeur, l'état
// (idle/thinking), la bouche qui parle, le score animé, l'arrière-plan animé qui
// CHANGE à chaque scène, et des « bursts » d'étincelles / confettis. Rythme court
// et hook dès la 1ʳᵉ seconde = réflexe influenceur.
// ————————————————————————————————————————————————————————————————
const STORYBOARDS: Storyboard[] = [
  {
    id: 'pub',
    label: '🎬 La pub complète',
    hint: 'Le parcours entier : le problème → Blumi → Blumiman → Bluminator → CTA.',
    scenes: [
      { tier: 'blumi', mood: 'neutral', state: 'idle', speaking: true, bg: 'neon', burst: 'sparkle', kicker: '👀 Attends…', title: 'Ton métier va-t-il survivre à l’IA ?', punch: '🤖', dur: 2400 },
      { tier: 'blumi', mood: 'neutral', state: 'idle', speaking: true, bg: 'azur', kicker: 'Moi c’est Blumi', title: 'Tape ton métier.', sub: 'Je te réponds en 10 secondes.', dur: 2600 },
      { tier: 'blumi', mood: 'concerned', state: 'thinking', speaking: false, bg: 'grid', kicker: 'Analyse…', title: 'Je scanne 7 facteurs.', sub: 'Tâches, créativité, contact humain…', dur: 2600 },
      { tier: 'blumi', mood: 'concerned', state: 'idle', speaking: false, bg: 'rain', kicker: 'Résultat', title: 'Exposition à l’IA', score: 87, punch: '😳', dur: 3200 },
      { tier: 'blumi', mood: 'concerned', state: 'idle', speaking: true, bg: 'rain', kicker: 'La vérité', title: 'Des tâches entières vont être automatisées.', dur: 2800 },
      { tier: 'blumi', mood: 'calm', state: 'idle', speaking: true, bg: 'azur', kicker: 'Mais respire', title: 'J’ai un plan pour toi.', punch: '🛡️', dur: 2600 },
      { tier: 'blumiman', mood: 'calm', state: 'idle', speaking: true, bg: 'gold', burst: 'sparkle', kicker: '✨ Et voici…', title: 'Blumiman.', sub: 'La version qui passe à l’action.', dur: 2800 },
      { tier: 'blumiman', mood: 'calm', state: 'idle', speaking: true, bg: 'gold', kicker: 'La solution', title: 'Il automatise ton métier.', sub: 'Le meilleur outil pour chaque tâche.', dur: 3000 },
      { tier: 'blumiman', mood: 'calm', state: 'idle', speaking: false, bg: 'bokeh', kicker: 'Concret', title: 'Outils IA · No-code · Modèles prêts', sub: 'Plan d’action + boîte à outils.', dur: 2800 },
      { tier: 'bluminator', mood: 'calm', state: 'idle', speaking: true, bg: 'blue', burst: 'sparkle', kicker: '💎 Pour les pros', title: 'Bluminator.', sub: 'Quand tu automatises tous les jours.', dur: 2800 },
      { tier: 'bluminator', mood: 'calm', state: 'idle', speaking: false, bg: 'spot', kicker: 'Plus de tout', title: '4× plus d’IA. Réponses 2× plus longues.', sub: '+ la veille de ton secteur.', dur: 3000 },
      { tier: 'blumiman', mood: 'calm', state: 'idle', speaking: false, bg: 'confetti', burst: 'confetti', kicker: '3 niveaux', title: 'Blumi · Blumiman · Bluminator', dur: 2600 },
      { tier: 'blumi', mood: 'calm', state: 'idle', speaking: true, bg: 'confetti', burst: 'confetti', kicker: 'À toi de jouer', title: 'Teste ton métier.', sub: 'C’est gratuit.', cta: true, dur: 3600 },
    ],
  },
  {
    id: 'test',
    label: '⚡ Le test choc',
    hint: 'Format hook rapide « tape ton métier » — parfait pour poster tous les jours.',
    scenes: [
      { tier: 'blumi', mood: 'neutral', state: 'idle', speaking: true, bg: 'grid', kicker: '🎯 Le test', title: 'Tape ton métier.', sub: 'Je te dis si l’IA va le remplacer.', dur: 2400 },
      { tier: 'blumi', mood: 'neutral', state: 'thinking', speaking: false, bg: 'grid', kicker: '3… 2… 1…', title: 'Analyse en cours', punch: '⏳', dur: 2200 },
      { tier: 'blumi', mood: 'concerned', state: 'idle', speaking: false, bg: 'rain', kicker: 'Aïe', title: 'Exposition', score: 92, punch: '😱', dur: 3000 },
      { tier: 'blumi', mood: 'concerned', state: 'idle', speaking: true, bg: 'rain', kicker: 'Sérieux ?', title: 'Oui. Et ça monte encore d’ici 2040.', dur: 2600 },
      { tier: 'blumi', mood: 'calm', state: 'idle', speaking: true, bg: 'azur', kicker: 'Bonne nouvelle', title: 'Tu peux prendre de l’avance.', punch: '🚀', dur: 2600 },
      { tier: 'blumi', mood: 'calm', state: 'idle', speaking: true, bg: 'confetti', burst: 'confetti', kicker: '👇 À toi', title: 'Ton métier ? Teste-le.', sub: 'Gratuit — lien en bio.', cta: true, dur: 3400 },
    ],
  },
  {
    id: 'persos',
    label: '🤩 Les 3 persos',
    hint: 'Showcase des personnages et de leurs effets — mignon, satisfaisant, partageable.',
    scenes: [
      { tier: 'blumi', mood: 'neutral', state: 'idle', speaking: true, bg: 'azur', burst: 'sparkle', kicker: 'Niveau 1', title: 'Voici Blumi.', sub: 'Il analyse ton métier.', punch: '✨', dur: 2600 },
      { tier: 'blumiman', mood: 'calm', state: 'idle', speaking: true, bg: 'gold', burst: 'sparkle', kicker: 'Niveau 2', title: 'Blumiman.', sub: 'Lunettes + passage à l’action.', punch: '🤓', dur: 2800 },
      { tier: 'bluminator', mood: 'calm', state: 'idle', speaking: true, bg: 'blue', burst: 'sparkle', kicker: 'Niveau 3', title: 'Bluminator.', sub: 'Et là… regarde l’écran.', punch: '💻', dur: 3000 },
      { tier: 'bluminator', mood: 'calm', state: 'thinking', speaking: false, bg: 'blue', kicker: '🔵🔵🔵', title: 'Rayons bleus depuis son ordi.', dur: 2600 },
      { tier: 'blumiman', mood: 'calm', state: 'idle', speaking: false, bg: 'confetti', burst: 'confetti', kicker: 'Lequel toi ?', title: '3 persos, 3 niveaux.', sub: 'Dis-le en commentaire 👇', dur: 2800 },
      { tier: 'blumi', mood: 'calm', state: 'idle', speaking: true, bg: 'confetti', burst: 'confetti', kicker: 'Rencontre-les', title: 'Teste ton métier.', sub: 'C’est gratuit.', cta: true, dur: 3400 },
    ],
  },
]

const SPARKLES = ['#ff7eb6', '#ffd166', '#33e1ff', '#a5b4fc', '#9bffce', '#ffb3ec']
const CONFETTIS = ['#ffd84d', '#ff4d8d', '#4dd2ff', '#6d4bff', '#35d18a', '#ffffff']

// Particules générées pour un « burst » (étincelles ou confettis) au-dessus de la scène.
function Particles({ kind, seed }: { kind: Burst; seed: number }) {
  const bits = useMemo(() => {
    if (kind === 'none' || !kind) return []
    const n = kind === 'confetti' ? 26 : 20
    const cols = kind === 'confetti' ? CONFETTIS : SPARKLES
    return Array.from({ length: n }, (_, i) => ({
      left: Math.random() * 100,
      delay: -Math.random() * 2,
      dur: (kind === 'confetti' ? 2.6 : 1.6) + Math.random() * 1.6,
      size: kind === 'confetti' ? 7 + Math.random() * 8 : 5 + Math.random() * 9,
      color: cols[i % cols.length],
      rot: Math.random() * 360,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, seed])

  if (!bits.length) return null
  return (
    <div className="st-burst" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className={kind === 'confetti' ? 'st-conf' : 'st-spark'}
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: kind === 'confetti' ? b.size * 1.5 : b.size,
            background: b.color,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
            transform: `rotate(${b.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// Scène pub « studio » — à filmer (capture d'écran) puis monter pour les réseaux.
// Accès : #/studio. Format pensé vertical 9:16.
export function StudioScene({ onBack }: Props) {
  const [sb, setSb] = useState(0)
  const board = STORYBOARDS[sb]
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [score, setScore] = useState(0)
  const scene = board.scenes[i]

  // Déroulé automatique en boucle.
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => setI((x) => (x + 1) % board.scenes.length), scene.dur)
    return () => clearTimeout(t)
  }, [i, playing, scene.dur, board.scenes.length])

  // Repart au début quand on change de storyboard.
  useEffect(() => {
    setI(0)
    setPlaying(true)
  }, [sb])

  // Compteur de score animé sur les scènes « résultat ».
  useEffect(() => {
    const target = scene.score
    if (!target) {
      setScore(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 1300)
      // easing out pour un effet « jauge » satisfaisant
      const eased = 1 - Math.pow(1 - p, 3)
      setScore(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [i, scene.score])

  const glasses = scene.tier !== 'blumi'
  const laptop = scene.tier === 'bluminator'
  const tierName = scene.tier === 'bluminator' ? 'Bluminator' : scene.tier === 'blumiman' ? 'Blumiman' : 'Blumi'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center gap-4 overflow-auto bg-ink-950 p-4">
      <style>{STUDIO_CSS}</style>

      {/* Scène à filmer : cadre vertical 9:16 */}
      <div className="relative aspect-[9/16] h-[86vh] max-h-[86vh] w-auto max-w-full overflow-hidden rounded-[2rem] shadow-glow">
        {/* Arrière-plan animé (change à chaque scène) */}
        <div key={`${board.id}-${i}-bg`} className={`st-bg st-bg--${scene.bg} st-fade`} />

        {/* Particules (étincelles / confettis) */}
        <Particles kind={scene.burst ?? 'none'} seed={sb * 100 + i} />

        <div className="relative flex h-full flex-col items-center px-7 pb-9 pt-10 text-center text-white">
          {/* Badge du personnage actif */}
          <span className="st-tierbadge">{tierName}</span>

          {/* Avatar */}
          <div className="relative mt-2 h-[46%] w-full">
            <Avatar
              state={scene.state}
              mood={scene.mood}
              glasses={glasses}
              laptop={laptop}
              speaking={scene.speaking}
              interactive={false}
              className="h-full w-full"
            />
            {scene.score !== undefined && (
              <div className="st-score">
                <div className="st-score-n">{score}%</div>
                <div className="st-score-l">exposé à l’IA</div>
              </div>
            )}
            {scene.punch && (
              <div key={`${i}-punch`} className="st-punch">{scene.punch}</div>
            )}
          </div>

          {/* Texte (re-monté à chaque scène → animation d'entrée) */}
          <div key={i} className="st-textwrap mt-auto flex flex-col items-center">
            <span className="st-kicker">{scene.kicker}</span>
            <h2 className="st-title">{scene.title}</h2>
            {scene.sub && <p className="st-sub">{scene.sub}</p>}
            {scene.cta && <div className="st-cta">blumi · essaie gratuitement →</div>}
          </div>

          {/* Progression des scènes */}
          <div className="mt-6 flex gap-1.5">
            {board.scenes.map((_, k) => (
              <span key={k} className={`h-1 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Contrôles (hors cadre — n'apparaissent pas si tu recadres sur le 9:16) */}
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
        {STORYBOARDS.map((b, k) => (
          <button
            key={b.id}
            onClick={() => setSb(k)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${k === sb ? 'bg-white text-ink-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button onClick={() => setPlaying((p) => !p)} className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20">
          {playing ? '⏸ Pause' : '▶︎ Lecture'}
        </button>
        <button onClick={() => { setI(0); setPlaying(true) }} className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20">
          ↺ Rejouer
        </button>
        <button onClick={() => setI((x) => (x + 1) % board.scenes.length)} className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20">
          ⏭ Scène
        </button>
        <button onClick={onBack} className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20">
          ✕ Quitter
        </button>
      </div>
      <p className="max-w-md text-center text-xs text-white/50">
        {board.hint} · Filme le cadre (OBS / QuickTime), recadre en 9:16, monte dans CapCut. Les boutons ci-dessous ne sont pas dans le cadre.
      </p>
    </div>
  )
}

// CSS scoppé au studio : arrière-plans animés + effets. Injecté une seule fois.
const STUDIO_CSS = `
.st-bg{position:absolute;inset:0}
.st-fade{animation:stFade .6s ease both}
@keyframes stFade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.st-bg *,.st-bg,.st-burst *{animation-duration:.001ms!important}}

/* azur mesh */
.st-bg--azur{background:#06122b}
.st-bg--azur::before,.st-bg--azur::after{content:"";position:absolute;border-radius:50%;filter:blur(46px);opacity:.85}
.st-bg--azur::before{width:80%;height:55%;left:-14%;top:-8%;background:#1274e6;animation:stD1 11s ease-in-out infinite alternate}
.st-bg--azur::after{width:85%;height:60%;right:-18%;bottom:-14%;background:#6d4bff;animation:stD2 13s ease-in-out infinite alternate}
@keyframes stD1{to{transform:translate(16%,12%) scale(1.15)}}
@keyframes stD2{to{transform:translate(-14%,-10%) scale(1.2)}}

/* data rain */
.st-bg--rain{background:linear-gradient(#020814,#04122c);
  background-image:repeating-linear-gradient(90deg,transparent 0 22px,rgba(53,209,255,.08) 22px 23px),
  repeating-linear-gradient(0deg,rgba(53,209,255,.16),rgba(53,209,255,.16) 2px,transparent 2px,transparent 26px);
  background-size:auto, 100% 120px;animation:stRain 1.1s linear infinite}
@keyframes stRain{to{background-position:0 0, 0 120px}}

/* tech grid */
.st-bg--grid{background:radial-gradient(120% 80% at 50% 0%,#10315f,#04091a 75%);overflow:hidden}
.st-bg--grid::before{content:"";position:absolute;left:-50%;right:-50%;top:0;bottom:-20%;
  background-image:linear-gradient(rgba(77,178,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(77,178,255,.35) 1px,transparent 1px);
  background-size:44px 44px;transform:perspective(340px) rotateX(58deg);transform-origin:center bottom;animation:stGrid 6s linear infinite}
.st-bg--grid::after{content:"";position:absolute;inset:0;background:linear-gradient(#04091a 0,transparent 30%,transparent 55%,#04091a 100%)}
@keyframes stGrid{to{background-position:0 44px}}

/* gold rays (Blumiman) */
.st-bg--gold{background:radial-gradient(circle at 50% 44%,#3a2c05,#140d01 70%)}
.st-bg--gold::before{content:"";position:absolute;left:50%;top:44%;width:260%;height:260%;transform:translate(-50%,-50%);
  background:repeating-conic-gradient(from 0deg,rgba(255,206,84,0) 0deg,rgba(255,206,84,.26) 3deg,rgba(255,206,84,0) 9deg);animation:stSpin 26s linear infinite}
@keyframes stSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}

/* blue screen rays (Bluminator) */
.st-bg--blue{background:radial-gradient(circle at 50% 60%,#06255a,#020814 72%)}
.st-bg--blue::before{content:"";position:absolute;left:50%;bottom:6%;width:260%;height:210%;transform:translateX(-50%);
  background:repeating-conic-gradient(from 200deg at 50% 100%,rgba(0,180,255,0) 0deg,rgba(0,180,255,.3) 4deg,rgba(0,180,255,0) 10deg);animation:stFan 8s ease-in-out infinite alternate}
@keyframes stFan{0%{transform:translateX(-50%) rotate(-6deg)}100%{transform:translateX(-50%) rotate(6deg)}}

/* bokeh */
.st-bg--bokeh{background:radial-gradient(120% 100% at 50% 0%,#123a7a,#05102a 70%)}
.st-bg--bokeh::before,.st-bg--bokeh::after{content:"";position:absolute;border-radius:50%;filter:blur(2px);opacity:.5;
  background:radial-gradient(circle at 35% 35%,#cdefff,#1274e6 60%,transparent 72%)}
.st-bg--bokeh::before{width:120px;height:120px;left:12%;top:20%;animation:stFloat 7s ease-in-out infinite alternate}
.st-bg--bokeh::after{width:180px;height:180px;right:8%;bottom:14%;animation:stFloat 9s ease-in-out infinite alternate-reverse}
@keyframes stFloat{to{transform:translateY(-16%)}}

/* spotlight */
.st-bg--spot{background:#05070f}
.st-bg--spot::before{content:"";position:absolute;inset:-20%;background:radial-gradient(30% 40% at 50% 26%,rgba(120,170,255,.5),transparent 60%);animation:stSweep 7s ease-in-out infinite alternate}
@keyframes stSweep{to{transform:translate(14%,8%)}}

/* confetti bg */
.st-bg--confetti{background:radial-gradient(120% 100% at 50% 0%,#1274e6,#0a2a5c 70%)}

/* neon */
.st-bg--neon{background:linear-gradient(#160a35 0,#3a1150 45%,#ff3d7f 120%);overflow:hidden}
.st-bg--neon::before{content:"";position:absolute;left:50%;top:12%;width:150px;height:150px;transform:translateX(-50%);border-radius:50%;filter:blur(2px);
  background:radial-gradient(circle,#ffe9a8,#ff6ec7 55%,#ff3d7f 75%);box-shadow:0 0 60px #ff6ec7}
.st-bg--neon::after{content:"";position:absolute;left:-50%;right:-50%;bottom:-25%;top:54%;
  background-image:linear-gradient(rgba(0,247,255,.6) 2px,transparent 2px),linear-gradient(90deg,rgba(0,247,255,.6) 2px,transparent 2px);
  background-size:52px 52px;transform:perspective(320px) rotateX(66deg);transform-origin:center top;animation:stGrid 5s linear infinite}

/* pulse */
.st-bg--pulse{background:#081428}
.st-bg--pulse::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 60% at 50% 42%,#1e63c8,#0a2a5c 55%,#061127 100%);animation:stBreathe 5.5s ease-in-out infinite}
@keyframes stBreathe{50%{transform:scale(1.12);opacity:.9}}

/* bursts */
.st-burst{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2}
.st-spark{position:absolute;top:38%;border-radius:50%;filter:blur(.5px);animation:stSpark linear infinite;opacity:0}
@keyframes stSpark{0%{transform:translateY(0) scale(.4);opacity:0}15%{opacity:1}100%{transform:translateY(-60vh) scale(1);opacity:0}}
.st-conf{position:absolute;top:-6%;border-radius:2px;animation:stFall linear infinite;opacity:0}
@keyframes stFall{0%{transform:translateY(0) rotate(0);opacity:0}8%{opacity:1}100%{transform:translateY(120vh) rotate(560deg);opacity:.9}}

/* overlays texte */
.st-tierbadge{align-self:center;font-family:var(--font-display, inherit);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
  color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.24);padding:5px 12px;border-radius:999px}
.st-score{position:absolute;right:12px;top:6px;z-index:3;background:rgba(255,255,255,.16);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.28);border-radius:18px;padding:8px 12px;animation:stPop .4s ease both}
.st-score-n{font-family:var(--font-display, inherit);font-weight:900;font-size:32px;line-height:1;font-variant-numeric:tabular-nums;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.35)}
.st-score-l{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.85);margin-top:2px}
.st-punch{position:absolute;left:8%;top:4%;z-index:3;font-size:48px;filter:drop-shadow(0 6px 16px rgba(0,0,0,.4));animation:stPunch .5s cubic-bezier(.2,1.4,.4,1) both}
@keyframes stPunch{0%{transform:scale(0) rotate(-20deg);opacity:0}100%{transform:scale(1) rotate(-8deg);opacity:1}}
@keyframes stPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
.st-textwrap{animation:stUp .5s ease both}
@keyframes stUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.st-kicker{font-weight:800;font-size:13px;letter-spacing:.06em;color:#fff;background:rgba(255,255,255,.16);padding:5px 12px;border-radius:999px}
.st-title{margin:12px 0 0;font-family:var(--font-display, inherit);font-weight:900;font-size:clamp(26px,7vw,40px);line-height:1.05;text-wrap:balance;text-shadow:0 3px 18px rgba(0,0,0,.35)}
.st-sub{margin:12px 0 0;max-width:17rem;font-size:17px;color:rgba(255,255,255,.9)}
.st-cta{margin-top:18px;background:#fff;color:#0a4fa8;font-family:var(--font-display, inherit);font-weight:900;font-size:18px;padding:12px 22px;border-radius:16px;box-shadow:0 12px 30px -10px rgba(0,0,0,.5);animation:stPop .5s ease both}
`
