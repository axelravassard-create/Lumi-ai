import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { playPat } from '../../lib/sfx'

export type AvatarState = 'idle' | 'thinking'
export type AvatarMood = 'neutral' | 'calm' | 'concerned'
// Accessoires « casier » : petits objets amusants attachés au personnage.
export type PropName = 'none' | 'pointer' | 'magnifier' | 'lightbulb' | 'party-hat' | 'grad-cap' | 'crown' | 'mic' | 'heart' | 'trophy' | 'rocket' | 'star' | 'fire' | 'coin'
const PROP_NAMES: Exclude<PropName, 'none'>[] = ['pointer', 'magnifier', 'lightbulb', 'mic', 'party-hat', 'grad-cap', 'crown', 'heart', 'trophy', 'rocket', 'star', 'fire', 'coin']

interface Props {
  state: AvatarState
  /** Humeur de Lumi : colore son regard selon le résultat (vert/calme, ambre/inquiet). */
  mood?: AvatarMood
  /** Quand false, la boucle de rendu est mise en pause (économie GPU hors écran). */
  active?: boolean
  /** Ajoute des lunettes de vue rondes (variantes « Blumiman » / « Bluminator »). */
  glasses?: boolean
  /** Ajoute un petit ordinateur portable lumineux (variante « Bluminator »). */
  laptop?: boolean
  /** Anime la bouche comme s'il parlait (chat avec le copilote). */
  speaking?: boolean
  /** Réaction lumineuse au clic (étincelles / rayons). false = vitrine figée. */
  interactive?: boolean
  /** Rend le canvas capturable (preserveDrawingBuffer) pour l'export vidéo du studio. */
  capture?: boolean
  /** Regard fixé vers la caméra (studio) au lieu de suivre le curseur. */
  staticGaze?: boolean
  /** Pose de présentation (regard/expression/position). Transition en douceur. */
  pose?: PoseName
  /** Accessoire(s) attaché(s) au personnage (studio présentation). */
  prop?: PropName
  props?: PropName[]
  /** Échelle globale du corps (studio présentation : zoom-arrière pour loger les
   *  accessoires). Constant sur toute la présentation → aucun à-coup. */
  bodyScale?: number
  /** Canal impératif (studio) : pose/humeur/parole/accessoires pilotés par ce ref,
   *  mis à jour chaque frame côté studio. Contourne la réconciliation R3F peu
   *  fiable des props en rendu continu → le personnage suit fidèlement la timeline. */
  accessoryRef?: RefObject<AvatarLiveState>
}

// Placement d'un accessoire : nom + décalage (dx/dy, fraction) + échelle.
export interface AvatarProp { name: PropName; dx: number; dy: number; scale: number }

// État vivant du personnage piloté image par image (studio).
export interface AvatarLiveState {
  glasses: boolean
  laptop: boolean
  props: AvatarProp[] // accessoires visibles simultanément (avec placement)
  pose?: PoseName
  mood: AvatarMood
  speaking: boolean
}

// Pointeur global normalisé (-1..1). Le visage suit le curseur partout sur la
// page : c'est ce qui crée le contact visuel et rend le personnage vivant.
const pointer = { x: 0, y: 0, active: false }

function usePointerTracking() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      pointer.active = true
    }
    const onLeave = () => {
      pointer.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])
}

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Iris : indigo calme au repos, cyan électrique en réflexion.
const IRIS_IDLE = new THREE.Color('#5566ff')
const IRIS_THINK = new THREE.Color('#27e2ff')
// Couleur du regard selon l'humeur (réaction au score).
const MOOD_COLOR: Record<AvatarMood, THREE.Color> = {
  neutral: new THREE.Color('#5566ff'),
  calm: new THREE.Color('#2fd98e'),
  concerned: new THREE.Color('#ff7a4d'),
}
const SKIN = '#eef1fa' // blanc nacré, presque lumière
// Bulles de lumière multicolores (réaction de Lumi quand on lui tapote la tête).
const SPARKLE_COLORS = ['#ff7eb6', '#ffd166', '#33e1ff', '#a5b4fc', '#ff7eb6', '#ffd166', '#9bffce']
// Rayons de lumière dorée (réaction de Luminator) — plus nombreux et intenses.
const RAY_COUNT = 16
const RAY_GOLD = ['#fff6cf', '#ffe9a0', '#ffd24d', '#ffc21a', '#ffe27a', '#ffb300']
// Rayons bleus (réaction de Bluminator) : projetés par l'écran sur le personnage.
// Moins nombreux mais ÉNORMES — de gros faisceaux qui montent vers son visage.
const SCREEN_RAY_COUNT = 9
const RAY_BLUE = ['#dff0ff', '#a9d2ff', '#6fb0ff', '#2e83ff', '#8ec2ff', '#1e6fff']
// Durée de la réaction « tapote » (étonnement → joie).
const PAT_DUR = 0.9
const BROW_Y = 0.29 // hauteur de repos des sourcils

// ── Poses de Blumi (mode présentation) ───────────────────────────────────────
// Chaque pose est une cible : orientation de la tête (yaw/pitch/roll), sourcils,
// ouverture des yeux, humeur, position/échelle à l'écran, ouverture de bouche.
// L'avatar interpole en douceur vers la pose → déplacements naturels.
export type PoseName =
  | 'neutral' | 'presenter' | 'greet' | 'point-left' | 'point-right'
  | 'look-up' | 'idea' | 'happy' | 'surprised' | 'concerned' | 'skeptical'
  | 'wink' | 'proud' | 'aside-left' | 'aside-right' | 'closeup' | 'thinking' | 'shy'
  | 'sad' | 'afraid' | 'angry' | 'love' | 'laugh'

// Traits d'expression du visage (renforcent l'émotion au-delà des yeux/tête) :
//  - smile : courbure de la bouche (-1 = grimace triste, 0 = neutre, 1 = grand sourire)
//  - browIn : inclinaison de l'extrémité INTERNE des sourcils (+ = relevée « triste/
//    inquiet », − = abaissée « colère »)
//  - blush : rougeur des joues (joie/timidité)
//  - tear : larme(s) sous les yeux (tristesse)
//  - sweat : goutte de sueur sur la tempe (peur/gêne)
//  - anger : petite marque de colère (veine 💢) sur la tempe
export interface ExprTraits {
  smile: number; browIn: number; blush: number; tear: number; sweat: number; anger: number
}
const EX0: ExprTraits = { smile: 0, browIn: 0, blush: 0, tear: 0, sweat: 0, anger: 0 }

export interface PoseTarget extends ExprTraits {
  yaw: number; pitch: number; roll: number
  brow: number; eyeOpen: number; winkL: number; winkR: number
  mood: AvatarMood; x: number; y: number; scale: number; mouth: number
}
const P = (
  yaw: number, pitch: number, roll: number, brow: number, eyeOpen: number,
  mood: AvatarMood, x: number, y: number, scale: number,
  mouth = 0, winkL = 0, winkR = 0, ex: Partial<ExprTraits> = {},
): PoseTarget => ({ yaw, pitch, roll, brow, eyeOpen, winkL, winkR, mood, x, y, scale, mouth, ...EX0, ...ex })

export const POSES: Record<PoseName, PoseTarget> = {
  //           yaw   pitch  roll   brow eyeOpen mood        x     y    scale mouth wL wR  expression
  neutral:    P(0,    0,     0,     0,   1,     'neutral',  0,    0,   1,    0,   0, 0, { smile: 0.12 }),
  presenter:  P(0,   -0.06,  0,     0.2, 1.05,  'neutral',  0,    0,   1,    0.05,0, 0, { smile: 0.2 }),
  greet:      P(0.15, -0.1,  0.06,  0.5, 1.15,  'calm',     0,    0.02, 1,   0.15,0, 0, { smile: 0.6, blush: 0.2 }),
  'point-left':  P(-0.7, 0,  -0.05, 0.15,1,     'neutral',  0.28, 0,   0.95, 0,   0, 0, { smile: 0.18 }),
  'point-right': P(0.7,  0,   0.05, 0.15,1,     'neutral', -0.28, 0,   0.95, 0,   0, 0, { smile: 0.18 }),
  'look-up':  P(0.1,  -0.6,  0.03,  0.4, 1.1,   'neutral',  0,    0,   1,    0,   0, 0, { smile: 0.2 }),
  idea:       P(0,   -0.15,  0,     0.7, 1.35,  'neutral',  0,    0.03, 1.05, 0.2, 0, 0, { smile: 0.45 }),
  happy:      P(0,   -0.05,  0.03,  0.1, 0.62,  'calm',     0,    0,   1,    0.12,0, 0, { smile: 1, blush: 0.55 }),
  surprised:  P(0,    0.05,  0,     0.85,1.45,  'neutral',  0,   -0.02, 0.98, 0.62,0, 0, { smile: 0.05, browIn: 0.2 }),
  concerned:  P(-0.05, 0.22, -0.06, -0.2,0.9,   'concerned',0,    0,   1,    0,   0, 0, { smile: -0.45, browIn: 0.55 }),
  skeptical:  P(0.12,  0.05, -0.08, 0.2, 0.85,  'neutral',  0,    0,   1,    0,   0.5, 0, { smile: -0.12, browIn: -0.2 }),
  wink:       P(0.08, -0.05, 0.05,  0.2, 1,     'calm',     0,    0,   1,    0.1, 0,   1, { smile: 0.5, blush: 0.15 }),
  proud:      P(0,   -0.2,   0,     0.2, 0.85,  'calm',     0,    0.03, 1.05, 0.05,0, 0, { smile: 0.55 }),
  'aside-left':  P(-0.5, 0,  -0.04, 0.15,1,     'neutral',  0.42, 0,   0.85, 0,   0, 0, { smile: 0.15 }),
  'aside-right': P(0.5,  0,   0.04, 0.15,1,     'neutral', -0.42, 0,   0.85, 0,   0, 0, { smile: 0.15 }),
  closeup:    P(0,   -0.03,  0,     0.1, 1.05,  'neutral',  0,    0.05, 1.35, 0.05,0, 0, { smile: 0.15 }),
  thinking:   P(-0.25,-0.4,  -0.1,  0.35,0.95,  'neutral',  0.05, 0,   1,    0,   0, 0, { smile: 0.05, browIn: 0.12 }),
  shy:        P(0.2,   0.2,   0.1,  0.1, 0.75,  'calm',    -0.05, 0,   0.95, 0,   0, 0, { smile: 0.35, blush: 0.75 }),
  // ── Émotions fortes (traits de visage marqués) ──────────────────────────────
  sad:        P(-0.05, 0.28,  0.03, -0.1,0.76,  'concerned',0,   -0.01, 0.98, 0.05,0, 0, { smile: -0.85, browIn: 0.85, tear: 1 }),
  afraid:     P(0.0,   0.02,  0.06, 0.7, 1.5,   'concerned',0,   -0.02, 0.97, 0.45,0, 0, { smile: -0.4, browIn: 0.6, sweat: 1 }),
  angry:      P(0,     0.12,  0,    -0.7,0.82,  'concerned',0,    0,   1,    0.12,0, 0, { smile: -0.72, browIn: -0.9, anger: 1 }),
  love:       P(0.05, -0.06,  0.05, 0.2, 0.6,   'calm',     0,    0.02, 1,    0.12,0, 0, { smile: 1, blush: 1 }),
  laugh:      P(0,    -0.08,  0.05, 0.15,0.34,  'calm',     0,    0.02, 1,    0.7, 0, 0, { smile: 1, blush: 0.5 }),
}

// Construit la géométrie de la bouche à partir de la courbure (smile) et de
// l'ouverture (open). Lentille fermée quand open≈0 (ligne de lèvres qui sourit ou
// fait la moue), qui s'ouvre en cavité quand open>0 (parole / surprise).
function mouthShape(smile: number, open: number): THREE.Shape {
  const hw = 0.2
  const corner = smile * 0.1 // coins relevés (sourire) / abaissés (moue)
  const center = -smile * 0.06 // centre qui descend (sourire) / monte (moue)
  const th = 0.028 // épaisseur des lèvres au repos
  const gap = Math.max(0, open) * 0.17
  const topMid = center + th / 2 + gap / 2
  const botMid = center - th / 2 - gap / 2
  const s = new THREE.Shape()
  s.moveTo(-hw, corner)
  s.quadraticCurveTo(0, topMid, hw, corner)
  s.quadraticCurveTo(0, botMid, -hw, corner)
  s.closePath()
  return s
}
function buildMouthGeometry(smile: number, open: number): THREE.ShapeGeometry {
  return new THREE.ShapeGeometry(mouthShape(smile, open), 18)
}

// Expression de repos dérivée de l'humeur (hors studio : chat, verdicts, accueil).
function moodExpr(mood: AvatarMood): ExprTraits {
  if (mood === 'calm') return { ...EX0, smile: 0.55, blush: 0.22 }
  if (mood === 'concerned') return { ...EX0, smile: -0.4, browIn: 0.5 }
  return { ...EX0, smile: 0.12 }
}

// Un œil réaliste : globe blanc + iris lumineux + pupille + reflet de vie
// (« catchlight »). Le globe pivote pour fixer le curseur, les paupières clignent.
function Eye({
  side,
  eyeball,
  irisMat,
  upperLid,
  lowerLid,
}: {
  side: number
  eyeball: React.MutableRefObject<THREE.Group | null>
  irisMat: React.MutableRefObject<THREE.MeshStandardMaterial | null>
  upperLid: React.MutableRefObject<THREE.Mesh | null>
  lowerLid: React.MutableRefObject<THREE.Mesh | null>
}) {
  return (
    <group position={[side * 0.35, 0.07, 0.78]}>
      {/* Globe oculaire (pivote pour le regard) — grand, c'est l'acteur principal */}
      <group ref={eyeball}>
        {/* Sclère (blanc de l'œil) — mate pour éviter de griller en blanc */}
        <mesh>
          <sphereGeometry args={[0.2, 44, 44]} />
          <meshStandardMaterial color="#dee3f0" roughness={0.55} metalness={0} />
        </mesh>
        {/* Anneau limbique sombre autour de l'iris (réalisme) */}
        <mesh position={[0, 0, 0.182]}>
          <circleGeometry args={[0.132, 44]} />
          <meshStandardMaterial color="#161e42" roughness={0.5} />
        </mesh>
        {/* Iris lumineux — grand et coloré, il « illumine » et fixe l'utilisateur */}
        <mesh position={[0, 0, 0.186]}>
          <circleGeometry args={[0.12, 44]} />
          <meshStandardMaterial
            ref={irisMat}
            color="#000"
            emissive={IRIS_IDLE}
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
        {/* Pupille bien marquée */}
        <mesh position={[0, 0, 0.193]}>
          <circleGeometry args={[0.052, 32]} />
          <meshStandardMaterial color="#03040c" roughness={0.2} />
        </mesh>
        {/* Reflet de vie (catchlight) — le petit éclat qui rend l'œil vivant */}
        <mesh position={[0.05, 0.07, 0.205]}>
          <circleGeometry args={[0.016, 16]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>

      {/* Paupière supérieure (pivote pour cligner) — calotte fine, yeux bien ouverts */}
      <mesh ref={upperLid}>
        <sphereGeometry args={[0.216, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.32]} />
        <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      {/* Paupière inférieure */}
      <mesh ref={lowerLid}>
        <sphereGeometry args={[0.216, 36, 20, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28]} />
        <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Face({ state, mood = 'neutral', glasses = false, laptop = false, speaking = false, interactive = true, staticGaze = false, pose, prop, props, bodyScale = 1, accessoryRef }: Props) {
  const group = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const lEye = useRef<THREE.Group | null>(null)
  const rEye = useRef<THREE.Group | null>(null)
  const lIris = useRef<THREE.MeshStandardMaterial | null>(null)
  const rIris = useRef<THREE.MeshStandardMaterial | null>(null)
  const lUp = useRef<THREE.Mesh | null>(null)
  const rUp = useRef<THREE.Mesh | null>(null)
  const lLow = useRef<THREE.Mesh | null>(null)
  const rLow = useRef<THREE.Mesh | null>(null)
  const halo = useRef<THREE.Group>(null)
  const rimLight = useRef<THREE.PointLight>(null)
  const browRefs = useRef<(THREE.Mesh | null)[]>([])
  const mouthRef = useRef<THREE.Mesh | null>(null)
  // Traits d'expression (renforcent l'émotion) : joues rouges, larmes, sueur, colère.
  const blushRefs = useRef<(THREE.Mesh | null)[]>([])
  const tearRefs = useRef<(THREE.Mesh | null)[]>([])
  const sweatRef = useRef<THREE.Group | null>(null)
  const angerRef = useRef<THREE.Group | null>(null)
  // Expression courante interpolée (transition douce entre émotions) + suivi de la
  // dernière géométrie de bouche construite (évite de reconstruire à chaque frame).
  const ec = useRef<ExprTraits>({ ...EX0 })
  const mouthGeo = useRef({ smile: -9, open: -9 })
  // Accessoires « déclaratifs » (lunettes, ordi, objets du casier) : montés en
  // permanence et affichés/masqués via .visible dans useFrame — car ce montage 3D
  // (canvas en rendu continu) ne réconcilie pas le montage/démontage conditionnel
  // au re-render ; seule la voie impérative (useFrame) suit les changements.
  const glassesRef = useRef<THREE.Group>(null)
  const laptopRef = useRef<THREE.Group>(null)
  const propRefs = useRef<Record<string, THREE.Group | null>>({})
  // Valeurs vives lues dans useFrame (le corps du composant s'exécute à chaque
  // re-render → toujours à jour, même si la closure de useFrame ne l'est pas).
  const propList: AvatarProp[] = (props ?? (prop && prop !== 'none' ? [prop] : []))
    .map((n) => ({ name: n, dx: 0, dy: 0, scale: 1 }))
  const live = useRef<AvatarLiveState>({ glasses, laptop, props: propList, pose, mood, speaking })
  live.current = { glasses, laptop, props: propList, pose, mood, speaking }

  const think = useRef(0)
  const blink = useRef({ next: 2.5, t: 0 })
  const saccade = useRef({ next: 1.5, x: 0, y: 0 })
  // Réaction « tapote sur la tête » : minuteur + étincelles de joie.
  const pat = useRef(0)
  // Pose courante interpolée (transitions douces entre poses).
  const pc = useRef<PoseTarget>({ ...POSES.neutral })
  const sparkleRefs = useRef<(THREE.Mesh | null)[]>([])
  const sparkleData = useRef(
    SPARKLE_COLORS.map(() => ({ active: false, age: 0, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 })),
  )
  const rayRefs = useRef<(THREE.Mesh | null)[]>([])
  const rayData = useRef(
    Array.from({ length: RAY_COUNT }, () => ({ active: false, age: 0, life: 1, ang: 0, len: 0 })),
  )

  // Déclenche la réaction mignonne quand on clique sur Lumi.
  const onPat = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    playPat() // petit « couic » réaliste au contact
    pat.current = PAT_DUR
    if (laptop) {
      // Bluminator : l'écran projette d'ÉNORMES rayons bleus vers son visage.
      rayData.current.forEach((r, i) => {
        if (i >= SCREEN_RAY_COUNT) {
          r.active = false
          return
        }
        r.active = true
        r.age = 0
        r.life = 0.6 + Math.random() * 0.4
        // Éventail dirigé vers le haut (centré sur la verticale = π/2).
        const f = i / (SCREEN_RAY_COUNT - 1) - 0.5
        r.ang = Math.PI / 2 + f * 1.25 + (Math.random() - 0.5) * 0.05
        r.len = 1.8 + Math.random() * 0.8
      })
    } else if (glasses) {
      // Luminator : rayons de lumière dorée qui jaillissent vers le haut.
      rayData.current.forEach((r, i) => {
        r.active = true
        r.age = 0
        r.life = 0.55 + Math.random() * 0.35
        r.ang = (i / RAY_COUNT) * Math.PI + (Math.random() - 0.5) * 0.1
        r.len = 0.55 + Math.random() * 0.3
      })
    } else {
      // Lumi : bulles de lumière multicolores qui jaillissent puis retombent.
      sparkleData.current.forEach((s, i) => {
        s.active = true
        s.age = 0
        s.life = 0.7 + Math.random() * 0.4
        const ang = (i / sparkleData.current.length) * Math.PI * 2
        s.x = Math.cos(ang) * 0.38
        s.y = 0.5 + Math.random() * 0.25
        s.z = 0.3 + Math.random() * 0.4
        s.vx = Math.cos(ang) * 0.34 + (Math.random() - 0.5) * 0.14
        s.vy = 0.4 + Math.random() * 0.3
        s.vz = (Math.random() - 0.5) * 0.24
      })
    }
  }
  const setCursor = (c: string) => {
    if (typeof document !== 'undefined') document.body.style.cursor = c
  }

  // Particules orbitales (flux de pensée) autour de la tête.
  const particles = useMemo(() => {
    const count = 40
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const r = 1.55 + Math.random() * 0.3
      arr[i * 3] = Math.cos(a) * r
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.6
      arr[i * 3 + 2] = Math.sin(a) * r
    }
    return arr
  }, [])

  useFrame((three, delta) => {
    const t = three.clock.elapsedTime
    const d = Math.min(delta, 0.05)

    // État des accessoires : canal impératif (studio) prioritaire, sinon valeurs
    // vives des props (mises à jour dans le corps du composant).
    const acc = accessoryRef?.current ?? live.current

    const target = state === 'thinking' ? 1 : 0
    think.current += (target - think.current) * Math.min(1, d * 4)
    const k = think.current

    // Interpolation douce vers la pose demandée → déplacements naturels.
    const pt = POSES[acc.pose ?? 'neutral']
    const pcr = pc.current
    const pl = Math.min(1, d * 3.2)
    pcr.yaw += (pt.yaw - pcr.yaw) * pl
    pcr.pitch += (pt.pitch - pcr.pitch) * pl
    pcr.roll += (pt.roll - pcr.roll) * pl
    pcr.brow += (pt.brow - pcr.brow) * pl
    pcr.eyeOpen += (pt.eyeOpen - pcr.eyeOpen) * pl
    pcr.winkL += (pt.winkL - pcr.winkL) * pl
    pcr.winkR += (pt.winkR - pcr.winkR) * pl
    pcr.x += (pt.x - pcr.x) * pl
    pcr.y += (pt.y - pcr.y) * pl
    pcr.scale += (pt.scale - pcr.scale) * pl
    pcr.mouth += (pt.mouth - pcr.mouth) * pl
    const posed = !!acc.pose

    // Direction du regard : curseur, sinon balayage doux + micro-saccades.
    saccade.current.next -= d
    if (saccade.current.next <= 0) {
      saccade.current.next = 0.8 + Math.random() * 2.5
      saccade.current.x = (Math.random() - 0.5) * 0.5
      saccade.current.y = (Math.random() - 0.5) * 0.3
    }
    let gx = pointer.active ? THREE.MathUtils.clamp(pointer.x, -1, 1) : Math.sin(t * 0.4) * 0.4 + saccade.current.x
    let gy = pointer.active ? THREE.MathUtils.clamp(pointer.y, -1, 1) : saccade.current.y

    // Studio : Blumi fixe la caméra (il « parle au spectateur ») avec une micro-vie,
    // sans suivre le curseur — sinon son regard partirait n'importe où dans l'export.
    if (staticGaze) {
      gx = Math.sin(t * 0.5) * 0.1 + saccade.current.x * 0.3
      gy = Math.sin(t * 0.8) * 0.05
    }

    // Bluminator : absorbé par son écran. Il ne suit PAS le curseur — son regard
    // reste baissé sur l'ordinateur portable posé devant lui, avec un léger
    // balayage (il « lit ») pour rester vivant.
    if (acc.laptop) {
      gx = Math.sin(t * 0.7) * 0.07
      gy = 0.95 + Math.sin(t * 1.1) * 0.05
    }

    // Pose : la direction du regard suit la pose (avec une micro-vie).
    if (posed) {
      gx = pcr.yaw + Math.sin(t * 0.5) * 0.03
      gy = pcr.pitch + Math.sin(t * 0.7) * 0.02
    }

    // Réaction « tapote » : étonnement (yeux écarquillés, sourcils levés,
    // bouche ouverte, recul) PUIS joie (plissement + étincelles).
    let patBob = 0
    let patSquash = 1
    let patJoy = 0
    let patLid = 0 // <0 = yeux écarquillés (surprise) ; >0 = plissés (joie)
    let browLift = 0
    let mouthOpen = 0
    let recoilZ = 0
    let patDelight = 0 // joie du « tapote » → grand sourire + joues rouges
    if (pat.current > 0) {
      pat.current = Math.max(0, pat.current - d)
      const p = 1 - pat.current / PAT_DUR // 0 → 1
      const surprise = p < 0.3 ? Math.sin((p / 0.3) * Math.PI) : 0 // pic d'étonnement
      const delight = p >= 0.24 ? Math.sin(((p - 0.24) / 0.76) * Math.PI) : 0 // joie ensuite
      const bounce = Math.sin(p * Math.PI * 3) * Math.exp(-p * 3.2)
      patBob = bounce * 0.1
      patSquash = 1 - bounce * 0.05
      patLid = delight * 0.85 - surprise * 0.75
      browLift = surprise * 0.13
      mouthOpen = surprise
      recoilZ = -surprise * 0.14
      patJoy = pat.current / PAT_DUR + surprise * 1.4
      patDelight = delight
    }

    // La tête s'oriente légèrement vers le curseur (et penche en réflexion).
    if (head.current) {
      const sway = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.015
      // Penche un peu plus la tête vers le bas quand il fixe son écran.
      const tilt = acc.laptop ? 0.2 : 0
      // En pose, la tête tourne davantage (mouvement affirmé) + inclinaison (roll).
      const hy = posed ? pcr.yaw * 0.55 + sway : gx * 0.18 + sway
      const hx = posed ? pcr.pitch * 0.5 + k * 0.06 : gy * 0.12 + tilt + k * 0.06
      head.current.rotation.y += (hy - head.current.rotation.y) * Math.min(1, d * 3)
      head.current.rotation.x += (hx - head.current.rotation.x) * Math.min(1, d * 3)
      head.current.rotation.z += ((posed ? pcr.roll : 0) - head.current.rotation.z) * Math.min(1, d * 3)
      head.current.position.y = patBob
      head.current.position.z = recoilZ
      head.current.scale.set(1 + (1 - patSquash), patSquash, 1 + (1 - patSquash))
    }

    // Parole : la bouche s'ouvre et se ferme de façon irrégulière, comme une
    // articulation (deux sinusoïdes désynchronisées pour éviter l'effet métronome).
    const talk = acc.speaking
      ? Math.max(0, (0.5 + 0.5 * Math.sin(t * 17)) * (0.55 + 0.45 * Math.sin(t * 6.7 + 1.3)))
      : 0
    const mouthAmt = Math.max(mouthOpen, talk, posed ? pcr.mouth : 0)

    // ── Expression du visage (traits qui renforcent l'émotion) ────────────────
    // Cible : la pose (studio) ou l'humeur (hors studio), + la joie du « tapote ».
    const baseExpr: ExprTraits = posed ? POSES[acc.pose as PoseName] : moodExpr(acc.mood)
    const exTarget: ExprTraits = {
      smile: Math.min(1, baseExpr.smile + patDelight * 0.9),
      browIn: baseExpr.browIn,
      blush: Math.min(1, baseExpr.blush + patDelight * 0.6),
      tear: baseExpr.tear,
      sweat: baseExpr.sweat,
      anger: baseExpr.anger,
    }
    const ex = ec.current
    const exl = Math.min(1, d * 4)
    ex.smile += (exTarget.smile - ex.smile) * exl
    ex.browIn += (exTarget.browIn - ex.browIn) * exl
    ex.blush += (exTarget.blush - ex.blush) * exl
    ex.tear += (exTarget.tear - ex.tear) * exl
    ex.sweat += (exTarget.sweat - ex.sweat) * exl
    ex.anger += (exTarget.anger - ex.anger) * exl

    // Sourcils : hauteur (étonnement/pose) + inclinaison de l'extrémité interne
    // (browIn>0 = relevée « triste/inquiet », <0 = abaissée « colère »).
    for (let i = 0; i < browRefs.current.length; i++) {
      const b = browRefs.current[i]
      if (!b) continue
      const s = i === 0 ? -1 : 1
      b.position.y = BROW_Y + browLift + (posed ? pcr.brow * 0.14 : 0)
      b.rotation.z = s * -0.12 + -s * ex.browIn * 0.55
    }

    // Bouche : courbure (sourire/moue) + ouverture (parole/surprise). On reconstruit
    // la géométrie seulement quand les valeurs changent (quantifiées → peu de rebuilds).
    if (mouthRef.current) {
      const sm = Math.round(ex.smile * 32) / 32
      const op = Math.round(mouthAmt * 32) / 32
      if (mouthGeo.current.smile !== sm || mouthGeo.current.open !== op) {
        mouthRef.current.geometry.dispose()
        mouthRef.current.geometry = buildMouthGeometry(sm, op)
        mouthGeo.current.smile = sm
        mouthGeo.current.open = op
      }
    }

    // Joues rouges (joie/timidité).
    for (const m of blushRefs.current) {
      if (!m) continue
      const mat = m.material as THREE.MeshStandardMaterial
      mat.opacity = ex.blush * 0.55
      m.visible = ex.blush > 0.02
    }
    // Larmes (tristesse) : perlent puis glissent le long de la joue, en boucle.
    const drip = (t * 0.6) % 1
    for (const m of tearRefs.current) {
      if (!m) continue
      m.visible = ex.tear > 0.03
      if (m.visible) {
        m.position.y = -0.02 - drip * 0.55
        const mat = m.material as THREE.MeshStandardMaterial
        mat.opacity = ex.tear * (1 - drip) * 0.9
        m.scale.setScalar(0.6 + 0.4 * (1 - drip))
      }
    }
    // Goutte de sueur (peur/gêne) : glisse sur la tempe.
    if (sweatRef.current) {
      sweatRef.current.visible = ex.sweat > 0.03
      if (sweatRef.current.visible) {
        sweatRef.current.position.y = 0.5 - drip * 0.55
        sweatRef.current.children.forEach((c) => {
          const mm = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
          if (mm) mm.opacity = ex.sweat * (1 - drip * 0.7)
        })
      }
    }
    // Marque de colère (veine 💢) : pulse sur la tempe.
    if (angerRef.current) {
      angerRef.current.visible = ex.anger > 0.05
      const puls = 0.6 + 0.4 * Math.sin(t * 9)
      angerRef.current.scale.setScalar((0.85 + 0.15 * puls) * Math.min(1, ex.anger))
      angerRef.current.children.forEach((c) => {
        const mm = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
        if (mm) mm.opacity = ex.anger * puls
      })
    }

    // Les globes oculaires pivotent pour fixer le curseur (acteur principal).
    const eyeRotY = gx * 0.42
    const eyeRotX = gy * 0.32
    for (const e of [lEye.current, rEye.current]) {
      if (!e) continue
      e.rotation.y += (eyeRotY - e.rotation.y) * Math.min(1, d * 7)
      e.rotation.x += (eyeRotX - e.rotation.x) * Math.min(1, d * 7)
    }

    // Clignement : les paupières se referment brièvement.
    blink.current.next -= d
    if (blink.current.next <= 0 && blink.current.t <= 0) {
      blink.current.t = 0.15
      blink.current.next = 2.2 + Math.random() * 3.5
    }
    let close = 0
    if (blink.current.t > 0 && !reducedMotion) {
      blink.current.t -= d
      const p = 1 - blink.current.t / 0.15
      close = Math.sin(p * Math.PI) // 0→1→0
    }
    // Pendant la réaction « tapote », l'ouverture des yeux est pilotée par
    // patLid (négatif = écarquillés de surprise, positif = plissés de joie).
    const lidClose = pat.current > 0 ? patLid : close
    // Plissement (eyeOpen<1) / grands yeux (eyeOpen>1) / clin d'œil par œil (pose).
    const squint = posed ? Math.max(0, 1 - pcr.eyeOpen) : 0
    const wide = posed ? Math.max(0, pcr.eyeOpen - 1) : 0
    const baseUp = -0.04 + lidClose * 1.15 - wide * 0.5
    const baseLow = 0.04 - lidClose * 0.5 + squint * 0.55
    const upL = baseUp + (posed ? pcr.winkL : 0) * 1.15
    const upR = baseUp + (posed ? pcr.winkR : 0) * 1.15
    const lowL = baseLow - (posed ? pcr.winkL : 0) * 0.5
    const lowR = baseLow - (posed ? pcr.winkR : 0) * 0.5
    const lidK = Math.min(1, d * 18)
    if (lUp.current) lUp.current.rotation.x += (upL - lUp.current.rotation.x) * lidK
    if (rUp.current) rUp.current.rotation.x += (upR - rUp.current.rotation.x) * lidK
    if (lLow.current) lLow.current.rotation.x += (lowL - lLow.current.rotation.x) * lidK
    if (rLow.current) rLow.current.rotation.x += (lowR - rLow.current.rotation.x) * lidK

    // Iris : couleur (humeur) + éclat selon la réflexion, avec pulsation vivante.
    const pulse = 1 + Math.sin(t * (2.5 + k * 6)) * (0.12 + k * 0.45)
    const effMood = acc.pose ? POSES[acc.pose].mood : acc.mood
    const col = MOOD_COLOR[effMood].clone().lerp(IRIS_THINK, k)
    for (const m of [lIris.current, rIris.current]) {
      if (!m) continue
      m.emissive.copy(col)
      m.emissiveIntensity = (1.3 + k * 3.4) * pulse + patJoy * 2.5
    }

    // Bulles de lumière (Lumi) : elles jaillissent puis retombent en s'effaçant.
    for (let i = 0; i < sparkleData.current.length; i++) {
      const s = sparkleData.current[i]
      const m = sparkleRefs.current[i]
      if (!m) continue
      if (!s.active) {
        m.scale.setScalar(0)
        continue
      }
      s.age += d
      s.vy -= d * 2.2
      s.x += s.vx * d
      s.y += s.vy * d
      s.z += s.vz * d
      m.position.set(s.x, s.y, s.z)
      const t01 = s.age / s.life
      const pop = Math.sin(Math.min(1, t01) * Math.PI)
      m.scale.setScalar(0.12 * pop + 0.02)
      const mat = m.material as THREE.MeshStandardMaterial
      mat.opacity = Math.max(0, 1 - t01)
      if (t01 >= 1) {
        s.active = false
        m.scale.setScalar(0)
      }
    }

    // Rayons : dorés (Luminator) jaillissant de la tête, OU bleus (Bluminator)
    // projetés par l'écran de l'ordi (origine basse, gros faisceaux qui montent).
    const RAY_ORIGIN_Y = laptop ? -1.0 : 0.5
    const RAY_ORIGIN_Z = laptop ? 0.78 : 0.6
    const RAY_WIDTH = laptop ? 5 : 1 // largeur des faisceaux (bleus = énormes)
    for (let i = 0; i < rayData.current.length; i++) {
      const r = rayData.current[i]
      const m = rayRefs.current[i]
      if (!m) continue
      if (!r.active) {
        m.scale.set(0, 0, 0)
        continue
      }
      r.age += d
      const t01 = r.age / r.life
      const grow = Math.min(1, t01 / 0.35)
      const ease = 1 - Math.pow(1 - grow, 3) // easeOutCubic : jaillissement rapide
      const len = r.len * ease
      const dx = Math.cos(r.ang)
      const dy = Math.sin(r.ang)
      m.position.set(dx * (len / 2), RAY_ORIGIN_Y + dy * (len / 2), RAY_ORIGIN_Z)
      m.rotation.z = r.ang - Math.PI / 2 // oriente la longueur du rayon vers l'extérieur
      m.scale.set(RAY_WIDTH, Math.max(0.0001, len), 1)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 1 - t01) * (0.6 + 0.4 * grow)
      if (t01 >= 1) {
        r.active = false
        m.scale.set(0, 0, 0)
      }
    }

    if (group.current) {
      const float = reducedMotion ? 0 : Math.sin(t * 1.1) * 0.03
      group.current.position.y = -0.02 + float + (posed ? pcr.y * 0.4 : 0)
      group.current.position.x = posed ? pcr.x * 0.5 : 0
      group.current.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.5) * 0.01
      const baseScale = (acc.laptop ? 0.8 : 1) * bodyScale
      group.current.scale.setScalar(baseScale * (posed ? pcr.scale : 1))
    }

    // Visibilité des accessoires (impérative → suit les changements même si la
    // réconciliation R3F des enfants conditionnels ne suit pas en rendu continu).
    if (glassesRef.current) glassesRef.current.visible = acc.glasses
    if (laptopRef.current) laptopRef.current.visible = acc.laptop
    for (const n of PROP_NAMES) {
      const g = propRefs.current[n]
      if (!g) continue
      const item = acc.props.find((p) => p.name === n)
      g.visible = !!item
      if (item) {
        // Décalage (dx/dy) + échelle par rapport à Blumi (déplace l'objet).
        g.position.set(item.dx * 1.3, item.dy * 1.3, 0)
        g.scale.setScalar(item.scale || 1)
      }
    }

    // Halo orbital.
    if (halo.current) {
      halo.current.rotation.y += d * (0.3 + k * 1.5)
      halo.current.rotation.x = 0.5 + k * 0.2
    }

    if (rimLight.current) {
      rimLight.current.intensity = 4 + k * 12 + Math.sin(t * 3) * k * 3
      rimLight.current.color.copy(col)
    }
  })

  return (
    <group ref={group} scale={laptop ? 0.8 : 1}>
      <group
        ref={head}
        onClick={interactive ? onPat : undefined}
        onPointerOver={interactive ? () => setCursor('pointer') : undefined}
        onPointerOut={interactive ? () => setCursor('auto') : undefined}
      >
        {/* Crâne ovale d'un seul tenant (sans couture), légèrement aminci vers
            le menton pour une silhouette humaine. */}
        <mesh scale={[0.92, 1.12, 0.96]} position={[0, 0.02, 0]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Menton : petit volume fondu dans le bas du visage */}
        <mesh scale={[0.5, 0.42, 0.55]} position={[0, -0.92, 0.18]}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Arcades sourcilières */}
        {[-1, 1].map((s, i) => (
          <mesh
            key={s}
            ref={(el) => (browRefs.current[i] = el)}
            position={[s * 0.33, BROW_Y, 0.82]}
            rotation={[0.2, 0, s * -0.12]}
            scale={[1.3, 0.45, 0.5]}
          >
            <sphereGeometry args={[0.13, 24, 16]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
          </mesh>
        ))}
        {/* Nez : arête + pointe, en relief sur le visage */}
        <mesh position={[0, -0.04, 0.9]} rotation={[0.34, 0, 0]} scale={[0.4, 1.25, 0.62]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Lèvres / bouche : forme reconstruite chaque frame (sourire ↔ moue ↔
            ouverture) — voir buildMouthGeometry / useFrame. */}
        <mesh ref={mouthRef} position={[0, -0.42, 0.89]}>
          <primitive object={buildMouthGeometry(0.12, 0)} attach="geometry" />
          <meshStandardMaterial color="#9b3b4d" roughness={0.5} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>

        {/* Joues rouges (joie/timidité) — affichées via .visible/opacity (useFrame). */}
        {[-1, 1].map((s, i) => (
          <mesh
            key={`bl${s}`}
            ref={(el) => (blushRefs.current[i] = el)}
            position={[s * 0.5, -0.16, 0.8]}
            rotation={[0, s * 0.3, 0]}
            scale={[1.25, 0.85, 1]}
            visible={false}
          >
            <circleGeometry args={[0.15, 24]} />
            <meshStandardMaterial color="#ff5d7a" transparent opacity={0} roughness={0.6} toneMapped />
          </mesh>
        ))}

        {/* Larmes (tristesse) : une sous chaque œil — glissent le long de la joue. */}
        {[-1, 1].map((s, i) => (
          <mesh
            key={`tr${s}`}
            ref={(el) => (tearRefs.current[i] = el)}
            position={[s * 0.36, -0.02, 0.9]}
            scale={0.7}
            visible={false}
          >
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#bfe3ff" emissive="#9ecbff" emissiveIntensity={0.35} transparent opacity={0} roughness={0.1} metalness={0.2} />
          </mesh>
        ))}

        {/* Goutte de sueur (peur/gêne) : perle sur la tempe droite, bien visible. */}
        <group ref={sweatRef} position={[0.52, 0.5, 0.72]} visible={false}>
          {/* Bulle ronde + petite pointe en haut (forme de goutte). */}
          <mesh scale={[1, 1.15, 1]}>
            <sphereGeometry args={[0.075, 18, 18]} />
            <meshStandardMaterial color="#a9d8ff" emissive="#7fc0ff" emissiveIntensity={0.5} transparent opacity={0} roughness={0.05} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <coneGeometry args={[0.04, 0.08, 14]} />
            <meshStandardMaterial color="#a9d8ff" emissive="#7fc0ff" emissiveIntensity={0.5} transparent opacity={0} roughness={0.05} metalness={0.3} />
          </mesh>
        </group>

        {/* Marque de colère (veine 💢) : trois traits rouges qui pulsent, tempe gauche. */}
        <group ref={angerRef} position={[-0.55, 0.55, 0.62]} visible={false}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]} position={[0, 0, 0]}>
              <boxGeometry args={[0.02, 0.13, 0.02]} />
              <meshStandardMaterial color="#ff2d55" emissive="#ff2d55" emissiveIntensity={0.6} transparent opacity={0} toneMapped />
            </mesh>
          ))}
        </group>

        {/* Yeux — acteurs principaux de l'interaction */}
        <Eye side={-1} eyeball={lEye} irisMat={lIris} upperLid={lUp} lowerLid={lLow} />
        <Eye side={1} eyeball={rEye} irisMat={rIris} upperLid={rUp} lowerLid={rLow} />

        {/* Lunettes de vue rondes (variante « Luminator ») — montées en
            permanence, affichées via .visible (voir useFrame). */}
        <group ref={glassesRef} position={[0, 0.07, 0.86]} visible={glasses}>
          {[-1, 1].map((s) => (
              <group key={s}>
                {/* Cerclage rond */}
                <mesh position={[s * 0.35, 0, 0.14]}>
                  <torusGeometry args={[0.24, 0.022, 16, 44]} />
                  <meshStandardMaterial color="#23283c" roughness={0.3} metalness={0.5} />
                </mesh>
                {/* Verre légèrement teinté */}
                <mesh position={[s * 0.35, 0, 0.13]}>
                  <circleGeometry args={[0.235, 40]} />
                  <meshStandardMaterial
                    color="#cdd6ff"
                    transparent
                    opacity={0.18}
                    roughness={0.05}
                    metalness={0.2}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {/* Branche vers l'oreille (part de la charnière et file vers l'arrière) */}
                <mesh position={[s * 0.58, 0.03, -0.2]} rotation={[Math.PI / 2, s * 0.32, 0]}>
                  <cylinderGeometry args={[0.016, 0.016, 0.5, 10]} />
                  <meshStandardMaterial color="#23283c" roughness={0.3} metalness={0.5} />
                </mesh>
              </group>
            ))}
          {/* Pont entre les deux verres */}
          <mesh position={[0, 0.04, 0.14]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.18, 10]} />
            <meshStandardMaterial color="#23283c" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>

        {/* Oreilles */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.9, -0.02, 0.02]} scale={[0.4, 0.9, 0.7]}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
          </mesh>
        ))}

        {/* Accessoires du casier (attachés à la tête → suivent les poses).
            Tous montés, affichés via .visible (voir useFrame). */}
        {PROP_NAMES.map((n) => (
          <group key={n} ref={(el) => { propRefs.current[n] = el }} visible={propList.some((p) => p.name === n)}>
            <Prop name={n} />
          </group>
        ))}
      </group>

      {/* Cou (sort du cadre vers le bas) */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 1.2, 32]} />
        <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Petit ordinateur portable lumineux (variante « Bluminator ») : posé
          devant, sous le menton. Monté en permanence, affiché via .visible. */}
      <group ref={laptopRef} visible={laptop}>
        <Laptop />
      </group>

      {/* Halo orbital de particules (flux de pensée) */}
      <group ref={halo} rotation={[0.5, 0, 0]}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.04} color={IRIS_THINK} transparent opacity={0.85} sizeAttenuation toneMapped={false} />
        </points>
      </group>

      {/* Bulles de lumière — réaction de Lumi au « tapote » */}
      {SPARKLE_COLORS.map((c, i) => (
        <mesh key={`s${i}`} ref={(el) => (sparkleRefs.current[i] = el)} scale={0}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial color="#000" emissive={c} emissiveIntensity={3} transparent toneMapped={false} />
        </mesh>
      ))}

      {/* Rayons au « tapote » : dorés (Luminator) ou bleus depuis l'écran (Bluminator) */}
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <mesh key={`r${i}`} ref={(el) => (rayRefs.current[i] = el)} scale={0}>
          <boxGeometry args={[0.06, 1, 0.02]} />
          <meshBasicMaterial
            color={laptop ? RAY_BLUE[i % RAY_BLUE.length] : RAY_GOLD[i % RAY_GOLD.length]}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Éclairage : ambiance « tout en lumière », mais avec un modelé doux pour
          que le visage blanc garde son relief sur fond blanc. */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, 1, 2]} intensity={0.6} color="#cfd6ff" />
      <pointLight ref={rimLight} position={[0, 0.5, -2.5]} intensity={3} color={IRIS_IDLE} />
    </group>
  )
}

// Ordinateur portable « Bluminator » : petit, posé devant lui. Orientation d'un
// VRAI portable vu de l'utilisateur : le clavier est de SON côté (vers son buste)
// et l'écran s'ouvre vers lui — donc le spectateur voit le DOS du capot (+ logo),
// et la dalle lumineuse (tournée vers lui) éclaire son visage. Léger 3/4 pour
// qu'on devine le clavier. Volontairement modeste et gardé dans le cadre.
function Laptop() {
  const SHELL = '#262c44'
  return (
    <group position={[0, -1.5, 0.7]} rotation={[0, 0.22, 0]} scale={0.6}>
      {/* Clavier : du côté du personnage (−z), légèrement incliné vers lui */}
      <mesh position={[0, -0.12, -0.42]} rotation={[-0.16, 0, 0]}>
        <boxGeometry args={[1.55, 0.07, 1.0]} />
        <meshStandardMaterial color={SHELL} roughness={0.4} metalness={0.55} />
      </mesh>
      {/* Capot / écran : se dresse côté spectateur (+z) et s'incline vers le
          personnage → l'écran lui fait face, on voit le dos du capot. */}
      <group position={[0, 0, 0.08]} rotation={[0.4, 0, 0]}>
        {/* Coque (dos, visible par le spectateur) */}
        <mesh position={[0, 0.56, 0]}>
          <boxGeometry args={[1.55, 1.08, 0.06]} />
          <meshStandardMaterial color={SHELL} roughness={0.35} metalness={0.6} />
        </mesh>
        {/* Dalle lumineuse, tournée vers LUI (−z) → cachée au spectateur ;
            émission DOUCE pour ne pas inonder le petit cadre (pas de bloom). */}
        <mesh position={[0, 0.56, -0.035]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.36, 0.9]} />
          <meshStandardMaterial color="#101626" emissive={IRIS_IDLE} emissiveIntensity={0.45} toneMapped />
        </mesh>
        {/* Petit logo lumineux sur le dos (côté spectateur) */}
        <mesh position={[0, 0.56, 0.035]}>
          <circleGeometry args={[0.12, 24]} />
          <meshStandardMaterial color="#0a0e1a" emissive={IRIS_IDLE} emissiveIntensity={0.4} toneMapped />
        </mesh>
      </group>
    </group>
  )
}

// Accessoires du « casier » de Blumi : petits objets amusants, en géométrie
// simple (léger). Un seul à la fois, attaché à la tête (il suit les poses).
function Prop({ name }: { name: PropName }) {
  const GOLD = '#ffcf3f'
  switch (name) {
    case 'party-hat':
      return (
        <group position={[0.12, 1.05, 0]} rotation={[0, 0, -0.18]}>
          <mesh position={[0, 0.4, 0]}>
            <coneGeometry args={[0.44, 1.0, 32]} />
            <meshStandardMaterial color="#ff5d8f" roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Bandes décoratives */}
          {[0.12, 0.42, 0.72].map((y) => (
            <mesh key={y} position={[0, 0.1 + y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.4 - y * 0.42, 0.028, 8, 32]} />
              <meshStandardMaterial color={GOLD} roughness={0.4} metalness={0.3} />
            </mesh>
          ))}
          {/* Pompon */}
          <mesh position={[0, 0.94, 0]}>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.25} roughness={0.5} />
          </mesh>
        </group>
      )
    case 'grad-cap':
      return (
        <group position={[0, 1.02, 0]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.3, 0.36, 0.2, 28]} />
            <meshStandardMaterial color="#14142a" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[0, 0.35, 0]}>
            <boxGeometry args={[0.92, 0.05, 0.92]} />
            <meshStandardMaterial color="#0e0e24" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Gland (tassel) qui pend sur le côté */}
          <mesh position={[0.32, 0.11, 0.32]}>
            <cylinderGeometry args={[0.012, 0.012, 0.34, 8]} />
            <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0.32, -0.08, 0.32]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )
    case 'crown':
      return (
        <group position={[0, 1.08, 0.02]}>
          <mesh>
            <cylinderGeometry args={[0.38, 0.4, 0.2, 28, 1, true]} />
            <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.22} side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.sin(a) * 0.38, 0.19, Math.cos(a) * 0.38]}>
                <coneGeometry args={[0.07, 0.22, 12]} />
                <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.22} />
              </mesh>
            )
          })}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + 0.5
            return (
              <mesh key={`j${i}`} position={[Math.sin(a) * 0.38, 0.02, Math.cos(a) * 0.38 + 0.02]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#ff4d6d" emissive="#ff4d6d" emissiveIntensity={0.4} roughness={0.2} />
              </mesh>
            )
          })}
        </group>
      )
    case 'lightbulb':
      return (
        <group position={[0, 1.72, 0.12]}>
          <mesh>
            <sphereGeometry args={[0.29, 24, 24]} />
            <meshStandardMaterial color="#fff6cf" emissive="#ffdf80" emissiveIntensity={0.85} transparent opacity={0.92} toneMapped />
          </mesh>
          {/* Culot à vis */}
          <mesh position={[0, -0.34, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.16, 16]} />
            <meshStandardMaterial color="#b9bcc6" metalness={0.75} roughness={0.35} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, -0.29 - i * 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.14, 0.014, 8, 20]} />
              <meshStandardMaterial color="#9a9da8" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )
    case 'pointer':
      // Baguette de présentateur, tenue en bas à droite, pointant vers le contenu.
      return (
        <group position={[0.95, -0.5, 0.8]} rotation={[0, 0, 0.95]}>
          <mesh>
            <cylinderGeometry args={[0.028, 0.028, 1.8, 12]} />
            <meshStandardMaterial color="#2a2a34" roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Poignée dorée */}
          <mesh position={[0, -0.82, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.28, 12]} />
            <meshStandardMaterial color="#ffcf3f" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Embout rouge lumineux */}
          <mesh position={[0, 0.94, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={0.5} roughness={0.3} />
          </mesh>
        </group>
      )
    case 'magnifier':
      return (
        <group position={[1.0, -0.05, 0.9]} rotation={[0, 0, -0.5]}>
          <mesh>
            <torusGeometry args={[0.28, 0.045, 16, 40]} />
            <meshStandardMaterial color="#c9ccd6" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh>
            <circleGeometry args={[0.27, 32]} />
            <meshStandardMaterial color="#bfe3ff" transparent opacity={0.32} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <cylinderGeometry args={[0.045, 0.05, 0.52, 12]} />
            <meshStandardMaterial color="#7a4a2a" roughness={0.6} metalness={0.1} />
          </mesh>
        </group>
      )
    case 'mic':
      return (
        <group position={[0.15, -0.62, 1.2]} rotation={[0.5, 0, -0.15]}>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.18, 20, 20]} />
            <meshStandardMaterial color="#3a3a44" metalness={0.65} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.09, 0.1, 0.5, 16]} />
            <meshStandardMaterial color="#1b1b26" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.11, 0.022, 8, 20]} />
            <meshStandardMaterial color="#ffcf3f" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )
    case 'heart':
      return (
        <group position={[0.66, 1.02, 0.35]} scale={0.95}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, 0.1, 0]}>
              <sphereGeometry args={[0.16, 20, 20]} />
              <meshStandardMaterial color="#ff3b6b" emissive="#ff3b6b" emissiveIntensity={0.35} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, -0.13, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.27, 0.36, 24]} />
            <meshStandardMaterial color="#ff3b6b" emissive="#ff3b6b" emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
        </group>
      )
    case 'trophy':
      return (
        <group position={[0.98, -0.05, 0.7]} scale={0.85}>
          {/* Coupe */}
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.22, 0.12, 0.32, 24]} />
            <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Anses */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.27, 0.3, 0]} rotation={[0, 0, s * Math.PI / 2]}>
              <torusGeometry args={[0.1, 0.025, 10, 20, Math.PI]} />
              <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.2} />
            </mesh>
          ))}
          {/* Pied + socle */}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.16, 12]} />
            <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.14, 0.17, 0.09, 20]} />
            <meshStandardMaterial color="#e0a92e" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Étoile lumineuse */}
          <mesh position={[0, 0.28, 0.22]}>
            <circleGeometry args={[0.07, 5]} />
            <meshStandardMaterial color="#fff6cf" emissive="#ffe08a" emissiveIntensity={0.5} toneMapped />
          </mesh>
        </group>
      )
    case 'rocket':
      return (
        <group position={[0.95, -0.2, 0.7]} rotation={[0, 0, -0.5]} scale={0.85}>
          {/* Corps */}
          <mesh>
            <cylinderGeometry args={[0.14, 0.14, 0.5, 20]} />
            <meshStandardMaterial color="#eef2ff" metalness={0.3} roughness={0.4} />
          </mesh>
          {/* Nez */}
          <mesh position={[0, 0.36, 0]}>
            <coneGeometry args={[0.14, 0.28, 20]} />
            <meshStandardMaterial color="#ff5d5d" metalness={0.3} roughness={0.4} />
          </mesh>
          {/* Hublot */}
          <mesh position={[0, 0.07, 0.145]}>
            <circleGeometry args={[0.06, 18]} />
            <meshStandardMaterial color="#8fd0ff" emissive="#8fd0ff" emissiveIntensity={0.35} toneMapped />
          </mesh>
          {/* Ailerons */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.15, -0.24, 0]} rotation={[0, 0, s * 0.5]}>
              <boxGeometry args={[0.1, 0.17, 0.03]} />
              <meshStandardMaterial color="#ff5d5d" metalness={0.3} roughness={0.4} />
            </mesh>
          ))}
          {/* Flamme */}
          <mesh position={[0, -0.42, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.1, 0.26, 16]} />
            <meshStandardMaterial color="#ffb020" emissive="#ff7a00" emissiveIntensity={0.85} toneMapped />
          </mesh>
        </group>
      )
    case 'star':
      return (
        <group position={[0.66, 1.05, 0.35]} rotation={[0, 0, 0]} scale={1}>
          <mesh>
            <circleGeometry args={[0.24, 5]} />
            <meshStandardMaterial color="#ffe14d" emissive="#ffd21f" emissiveIntensity={0.55} toneMapped side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI]} position={[0, 0, -0.01]}>
            <circleGeometry args={[0.24, 5]} />
            <meshStandardMaterial color="#ffe14d" emissive="#ffd21f" emissiveIntensity={0.55} toneMapped side={THREE.DoubleSide} />
          </mesh>
        </group>
      )
    case 'fire':
      return (
        <group position={[0.66, 0.95, 0.4]}>
          {[
            { c: '#ff7a00', s: 1, y: 0 },
            { c: '#ffb020', s: 0.7, y: 0.06 },
            { c: '#ffe14d', s: 0.4, y: 0.12 },
          ].map((f, i) => (
            <mesh key={i} position={[0, f.y, i * 0.01]} scale={[f.s, f.s * 1.4, f.s]}>
              <coneGeometry args={[0.16, 0.4, 16]} />
              <meshStandardMaterial color={f.c} emissive={f.c} emissiveIntensity={0.7} toneMapped />
            </mesh>
          ))}
        </group>
      )
    case 'coin':
      return (
        <group position={[0.72, -0.05, 0.65]} rotation={[0, 0.2, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.055, 30]} />
            <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Liseré + étoile gravée lumineuse (face caméra) */}
          <mesh position={[0, 0, 0.03]}>
            <ringGeometry args={[0.2, 0.24, 30]} />
            <meshStandardMaterial color="#e0a92e" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.031]}>
            <circleGeometry args={[0.13, 5]} />
            <meshStandardMaterial color="#fff6cf" emissive="#ffe08a" emissiveIntensity={0.45} toneMapped />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

export default function RobotAvatar({ state, mood = 'neutral', active = true, glasses = false, laptop = false, speaking = false, interactive = true, capture = false, staticGaze = false, pose, prop, props, bodyScale, accessoryRef }: Props) {
  usePointerTracking()
  return (
    <Canvas
      // 'demand' : rend une frame au montage puis s'arrête (figé) ; 'always' anime.
      frameloop={active ? 'always' : 'demand'}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: capture }}
      camera={{ position: [0, 0.02, 4.9], fov: 30 }}
      style={{ background: 'transparent' }}
    >
      <Face state={state} mood={mood} glasses={glasses} laptop={laptop} speaking={speaking} interactive={interactive} staticGaze={staticGaze} pose={pose} prop={prop} props={props} bodyScale={bodyScale} accessoryRef={accessoryRef} />
      {/* Environnement studio généré localement (aucun téléchargement réseau). */}
      <Environment resolution={128}>
        <Lightformer intensity={0.8} position={[0, 1, 4]} scale={[10, 8, 1]} color="#ffffff" />
        <Lightformer intensity={0.6} position={[-4, 2, 2]} scale={[5, 6, 1]} color="#e6e9ff" />
        <Lightformer intensity={0.5} position={[4, -1, 1]} scale={[5, 6, 1]} color="#dfe3ff" />
      </Environment>
      <EffectComposer>
        {/* Halo SERRÉ autour des yeux/étincelles uniquement. Pas de mipmapBlur ni
            de grand radius → le bloom n'inonde plus tout le rectangle du canvas
            pendant l'effet (sinon on voyait la « case » réservée au personnage). */}
        <Bloom intensity={0.55} luminanceThreshold={1.1} luminanceSmoothing={0.2} radius={0.22} />
      </EffectComposer>
    </Canvas>
  )
}
