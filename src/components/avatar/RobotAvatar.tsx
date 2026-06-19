import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

export type AvatarState = 'idle' | 'thinking'

interface Props {
  state: AvatarState
  /** Quand false, la boucle de rendu est mise en pause (économie GPU hors écran). */
  active?: boolean
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
const SKIN = '#eef1fa' // blanc nacré, presque lumière
// Couleurs des étincelles de joie quand on tapote la tête de Lumi.
const SPARKLE_COLORS = ['#ff7eb6', '#ffd166', '#33e1ff', '#a5b4fc', '#ff7eb6', '#ffd166', '#9bffce']

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
    <group position={[side * 0.35, 0.07, 0.72]}>
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

function Face({ state }: Props) {
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

  const think = useRef(0)
  const blink = useRef({ next: 2.5, t: 0 })
  const saccade = useRef({ next: 1.5, x: 0, y: 0 })
  // Réaction « tapote sur la tête » : minuteur + étincelles de joie.
  const pat = useRef(0)
  const sparkleRefs = useRef<(THREE.Mesh | null)[]>([])
  const sparkleData = useRef(
    SPARKLE_COLORS.map(() => ({ active: false, age: 0, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 })),
  )

  // Déclenche la réaction mignonne quand on clique sur Lumi.
  const onPat = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    pat.current = 0.7
    sparkleData.current.forEach((s, i) => {
      s.active = true
      s.age = 0
      s.life = 0.8 + Math.random() * 0.5
      // Réparties en éventail autour du haut de la tête, bien dans le cadre.
      const ang = (i / sparkleData.current.length) * Math.PI * 2
      s.x = Math.cos(ang) * 0.6
      s.y = 0.8 + Math.random() * 0.35
      s.z = 0.4 + Math.random() * 0.45
      s.vx = Math.cos(ang) * 1.1 + (Math.random() - 0.5) * 0.3
      s.vy = 0.7 + Math.random() * 0.6
      s.vz = (Math.random() - 0.5) * 0.4
    })
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
    const gx = pointer.active ? THREE.MathUtils.clamp(pointer.x, -1, 1) : Math.sin(t * 0.4) * 0.4 + saccade.current.x
    const gy = pointer.active ? THREE.MathUtils.clamp(pointer.y, -1, 1) : saccade.current.y

    // Réaction « tapote » : rebond élastique de la tête + plissement joyeux.
    let patClose = 0
    let patBob = 0
    let patSquash = 1
    let patJoy = 0
    if (pat.current > 0) {
      pat.current = Math.max(0, pat.current - d)
      const p = 1 - pat.current / 0.7 // 0 → 1
      const bounce = Math.sin(p * Math.PI * 3) * Math.exp(-p * 3.2)
      patBob = bounce * 0.13
      patSquash = 1 - bounce * 0.06
      patClose = Math.sin(Math.min(1, p * 1.5) * Math.PI) * 0.85 // yeux plissés de joie
      patJoy = pat.current / 0.7
    }

    // La tête s'oriente légèrement vers le curseur (et penche en réflexion).
    if (head.current) {
      const sway = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.015
      head.current.rotation.y += (gx * 0.18 + sway - head.current.rotation.y) * Math.min(1, d * 3)
      head.current.rotation.x += (gy * 0.12 + k * 0.06 - head.current.rotation.x) * Math.min(1, d * 3)
      head.current.position.y = patBob
      head.current.scale.set(1 + (1 - patSquash), patSquash, 1 + (1 - patSquash))
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
    close = Math.max(close, patClose) // plissement de joie quand on le tapote
    const upTarget = -0.04 + close * 1.15
    const lowTarget = 0.04 - close * 0.5
    for (const l of [lUp.current, rUp.current]) if (l) l.rotation.x += (upTarget - l.rotation.x) * Math.min(1, d * 18)
    for (const l of [lLow.current, rLow.current]) if (l) l.rotation.x += (lowTarget - l.rotation.x) * Math.min(1, d * 18)

    // Iris : couleur + éclat selon la réflexion, avec une pulsation vivante.
    const pulse = 1 + Math.sin(t * (2.5 + k * 6)) * (0.12 + k * 0.45)
    const col = IRIS_IDLE.clone().lerp(IRIS_THINK, k)
    for (const m of [lIris.current, rIris.current]) {
      if (!m) continue
      m.emissive.copy(col)
      m.emissiveIntensity = (1.3 + k * 3.4) * pulse + patJoy * 2.5
    }

    // Étincelles de joie : elles jaillissent puis retombent en s'effaçant.
    for (let i = 0; i < sparkleData.current.length; i++) {
      const s = sparkleData.current[i]
      const m = sparkleRefs.current[i]
      if (!m) continue
      if (!s.active) {
        m.scale.setScalar(0)
        continue
      }
      s.age += d
      s.vy -= d * 1.5
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

    // Respiration / lévitation : un être de lumière qui flotte.
    if (group.current && !reducedMotion) {
      group.current.position.y = -0.02 + Math.sin(t * 1.1) * 0.03
      group.current.rotation.z = Math.sin(t * 0.5) * 0.01
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
    <group ref={group}>
      <group
        ref={head}
        onClick={onPat}
        onPointerOver={() => setCursor('pointer')}
        onPointerOut={() => setCursor('auto')}
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
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.33, 0.29, 0.82]} rotation={[0.2, 0, s * -0.12]} scale={[1.3, 0.45, 0.5]}>
            <sphereGeometry args={[0.13, 24, 16]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
          </mesh>
        ))}
        {/* Nez : arête + pointe, en relief sur le visage */}
        <mesh position={[0, -0.04, 0.9]} rotation={[0.34, 0, 0]} scale={[0.4, 1.25, 0.62]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Lèvres / bouche neutre, un peu plus large */}
        <mesh position={[0, -0.43, 0.86]} scale={[1, 0.5, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.05, 0.34, 6, 16]} />
          <meshStandardMaterial color="#cda4b1" roughness={0.45} metalness={0.05} />
        </mesh>

        {/* Yeux — acteurs principaux de l'interaction */}
        <Eye side={-1} eyeball={lEye} irisMat={lIris} upperLid={lUp} lowerLid={lLow} />
        <Eye side={1} eyeball={rEye} irisMat={rIris} upperLid={rUp} lowerLid={rLow} />

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

      {/* Halo orbital de particules (flux de pensée) */}
      <group ref={halo} rotation={[0.5, 0, 0]}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.04} color={IRIS_THINK} transparent opacity={0.85} sizeAttenuation toneMapped={false} />
        </points>
      </group>

      {/* Étincelles de joie (réaction au « tapote ») */}
      {SPARKLE_COLORS.map((c, i) => (
        <mesh key={i} ref={(el) => (sparkleRefs.current[i] = el)} scale={0}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial color="#000" emissive={c} emissiveIntensity={3} transparent toneMapped={false} />
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

export default function RobotAvatar({ state, active = true }: Props) {
  usePointerTracking()
  return (
    <Canvas
      // 'never' suspend la boucle de rendu quand l'avatar est hors écran.
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.02, 4.9], fov: 30 }}
      style={{ background: 'transparent' }}
    >
      <Face state={state} />
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
