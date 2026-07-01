import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { playPat } from '../../lib/sfx'

export type AvatarState = 'idle' | 'thinking'
export type AvatarMood = 'neutral' | 'calm' | 'concerned'

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
const MOUTH_SCALE: [number, number, number] = [1, 0.5, 0.5] // échelle de repos de la bouche

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

function Face({ state, mood = 'neutral', glasses = false, laptop = false, speaking = false, interactive = true }: Props) {
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

  const think = useRef(0)
  const blink = useRef({ next: 2.5, t: 0 })
  const saccade = useRef({ next: 1.5, x: 0, y: 0 })
  // Réaction « tapote sur la tête » : minuteur + étincelles de joie.
  const pat = useRef(0)
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

    const target = state === 'thinking' ? 1 : 0
    think.current += (target - think.current) * Math.min(1, d * 4)
    const k = think.current

    // Direction du regard : curseur, sinon balayage doux + micro-saccades.
    saccade.current.next -= d
    if (saccade.current.next <= 0) {
      saccade.current.next = 0.8 + Math.random() * 2.5
      saccade.current.x = (Math.random() - 0.5) * 0.5
      saccade.current.y = (Math.random() - 0.5) * 0.3
    }
    let gx = pointer.active ? THREE.MathUtils.clamp(pointer.x, -1, 1) : Math.sin(t * 0.4) * 0.4 + saccade.current.x
    let gy = pointer.active ? THREE.MathUtils.clamp(pointer.y, -1, 1) : saccade.current.y

    // Bluminator : absorbé par son écran. Il ne suit PAS le curseur — son regard
    // reste baissé sur l'ordinateur portable posé devant lui, avec un léger
    // balayage (il « lit ») pour rester vivant.
    if (laptop) {
      gx = Math.sin(t * 0.7) * 0.07
      gy = 0.95 + Math.sin(t * 1.1) * 0.05
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
    }

    // La tête s'oriente légèrement vers le curseur (et penche en réflexion).
    if (head.current) {
      const sway = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.015
      // Penche un peu plus la tête vers le bas quand il fixe son écran.
      const tilt = laptop ? 0.2 : 0
      head.current.rotation.y += (gx * 0.18 + sway - head.current.rotation.y) * Math.min(1, d * 3)
      head.current.rotation.x += (gy * 0.12 + tilt + k * 0.06 - head.current.rotation.x) * Math.min(1, d * 3)
      head.current.position.y = patBob
      head.current.position.z = recoilZ
      head.current.scale.set(1 + (1 - patSquash), patSquash, 1 + (1 - patSquash))
    }

    // Parole : la bouche s'ouvre et se ferme de façon irrégulière, comme une
    // articulation (deux sinusoïdes désynchronisées pour éviter l'effet métronome).
    const talk = speaking
      ? Math.max(0, (0.5 + 0.5 * Math.sin(t * 17)) * (0.55 + 0.45 * Math.sin(t * 6.7 + 1.3)))
      : 0
    const mouthAmt = Math.max(mouthOpen, talk)

    // Sourcils levés + bouche ouverte (étonnement ou parole).
    for (const b of browRefs.current) if (b) b.position.y = BROW_Y + browLift
    if (mouthRef.current) {
      mouthRef.current.scale.set(
        MOUTH_SCALE[0] * (1 + mouthAmt * 0.3),
        MOUTH_SCALE[1] * (1 + mouthAmt * 1.5),
        MOUTH_SCALE[2],
      )
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
    const upTarget = -0.04 + lidClose * 1.15
    const lowTarget = 0.04 - lidClose * 0.5
    for (const l of [lUp.current, rUp.current]) if (l) l.rotation.x += (upTarget - l.rotation.x) * Math.min(1, d * 18)
    for (const l of [lLow.current, rLow.current]) if (l) l.rotation.x += (lowTarget - l.rotation.x) * Math.min(1, d * 18)

    // Iris : couleur (humeur) + éclat selon la réflexion, avec pulsation vivante.
    const pulse = 1 + Math.sin(t * (2.5 + k * 6)) * (0.12 + k * 0.45)
    const col = MOOD_COLOR[mood].clone().lerp(IRIS_THINK, k)
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

    if (group.current && !reducedMotion) {
      group.current.position.y = -0.02 + Math.sin(t * 1.1) * 0.03
      group.current.rotation.z = Math.sin(t * 0.5) * 0.01
    } else if (group.current) {
      group.current.position.y = -0.02
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
        {/* Lèvres / bouche (s'ouvre lors de l'étonnement) */}
        <mesh ref={mouthRef} position={[0, -0.43, 0.86]} scale={MOUTH_SCALE} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.05, 0.34, 6, 16]} />
          <meshStandardMaterial color="#cda4b1" roughness={0.45} metalness={0.05} />
        </mesh>

        {/* Yeux — acteurs principaux de l'interaction */}
        <Eye side={-1} eyeball={lEye} irisMat={lIris} upperLid={lUp} lowerLid={lLow} />
        <Eye side={1} eyeball={rEye} irisMat={rIris} upperLid={rUp} lowerLid={rLow} />

        {/* Lunettes de vue rondes (variante « Luminator ») */}
        {glasses && (
          <group position={[0, 0.07, 0.86]}>
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
        )}

        {/* Oreilles */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.9, -0.02, 0.02]} scale={[0.4, 0.9, 0.7]}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
          </mesh>
        ))}
      </group>

      {/* Cou (sort du cadre vers le bas) */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 1.2, 32]} />
        <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Petit ordinateur portable lumineux (variante « Bluminator ») : posé
          devant, sous le menton — discret, jamais coupé au bord du cadre. */}
      {laptop && <Laptop />}

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

export default function RobotAvatar({ state, mood = 'neutral', active = true, glasses = false, laptop = false, speaking = false, interactive = true }: Props) {
  usePointerTracking()
  return (
    <Canvas
      // 'demand' : rend une frame au montage puis s'arrête (figé) ; 'always' anime.
      frameloop={active ? 'always' : 'demand'}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.02, 4.9], fov: 30 }}
      style={{ background: 'transparent' }}
    >
      <Face state={state} mood={mood} glasses={glasses} laptop={laptop} speaking={speaking} interactive={interactive} />
      {/* Environnement studio généré localement (aucun téléchargement réseau). */}
      <Environment resolution={128}>
        <Lightformer intensity={0.8} position={[0, 1, 4]} scale={[10, 8, 1]} color="#ffffff" />
        <Lightformer intensity={0.6} position={[-4, 2, 2]} scale={[5, 6, 1]} color="#e6e9ff" />
        <Lightformer intensity={0.5} position={[4, -1, 1]} scale={[5, 6, 1]} color="#dfe3ff" />
      </Environment>
      <EffectComposer>
        {/* Seuil élevé : seuls les yeux lumineux (HDR) « bloomment », le visage reste net. */}
        <Bloom intensity={0.9} luminanceThreshold={1.0} luminanceSmoothing={0.3} mipmapBlur radius={0.6} />
      </EffectComposer>
    </Canvas>
  )
}
