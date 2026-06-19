import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

export type AvatarState = 'idle' | 'thinking'

interface Props {
  state: AvatarState
}

// Pointeur global normalisé (-1..1). Le robot suit le curseur où qu'il soit sur la
// page : c'est ce qui le rend « vivant » — il vous regarde vraiment.
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

// Couleurs des yeux : indigo calme au repos, cyan électrique en réflexion.
const EYE_IDLE = new THREE.Color('#6d7bff')
const EYE_THINK = new THREE.Color('#33e1ff')

// Un œil = lentille à diaphragme. Plusieurs anneaux concentriques émissifs qui
// donnent l'impression d'un objectif qui fait la mise au point.
function Eye({ matRef, coreRef }: { matRef: React.MutableRefObject<THREE.MeshStandardMaterial | null>; coreRef: React.MutableRefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Logement sombre de l'œil (enfoncé dans la visière) */}
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[0.135, 48]} />
        <meshStandardMaterial color="#05060f" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Halo extérieur du diaphragme */}
      <mesh position={[0, 0, 0.012]}>
        <ringGeometry args={[0.092, 0.118, 48]} />
        <meshStandardMaterial
          ref={matRef}
          color="#000"
          emissive={EYE_IDLE}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      {/* Iris lumineux */}
      <mesh position={[0, 0, 0.016]}>
        <circleGeometry args={[0.08, 48]} />
        <meshStandardMaterial color="#000" emissive={EYE_IDLE} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      {/* Pupille / cœur très brillant */}
      <mesh ref={coreRef} position={[0, 0, 0.02]}>
        <circleGeometry args={[0.032, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Robot({ state }: Props) {
  const group = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Group>(null)
  const leftMat = useRef<THREE.MeshStandardMaterial | null>(null)
  const rightMat = useRef<THREE.MeshStandardMaterial | null>(null)
  const leftCore = useRef<THREE.Mesh | null>(null)
  const rightCore = useRef<THREE.Mesh | null>(null)
  const rimLight = useRef<THREE.PointLight>(null)

  // Niveau de « réflexion » lissé (0 = repos, 1 = pleine concentration).
  const think = useRef(0)
  const blink = useRef({ next: 2, closing: 0 })

  // Particules orbitales (le « flux de pensée » autour de la tête).
  const particles = useMemo(() => {
    const count = 38
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const r = 1.35 + Math.random() * 0.25
      arr[i * 3] = Math.cos(a) * r
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      arr[i * 3 + 2] = Math.sin(a) * r
    }
    return arr
  }, [])

  useFrame((stateThree, delta) => {
    const t = stateThree.clock.elapsedTime
    const d = Math.min(delta, 0.05)

    // Cible de réflexion lissée
    const target = state === 'thinking' ? 1 : 0
    think.current += (target - think.current) * Math.min(1, d * 4)
    const k = think.current

    // Direction du regard : vers le curseur (avec retour au centre si inactif)
    const gx = pointer.active ? THREE.MathUtils.clamp(pointer.x, -1, 1) : Math.sin(t * 0.5) * 0.3
    const gy = pointer.active ? THREE.MathUtils.clamp(pointer.y, -1, 1) : Math.cos(t * 0.4) * 0.2

    // La tête s'oriente subtilement vers le curseur, et penche en concentration.
    if (head.current) {
      const swayX = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.02
      head.current.rotation.y += (gx * 0.32 + swayX - head.current.rotation.y) * Math.min(1, d * 3)
      head.current.rotation.x += (gy * 0.22 + k * 0.12 - head.current.rotation.x) * Math.min(1, d * 3)
    }

    // Les yeux se déplacent dans la visière pour fixer le curseur.
    if (eyes.current) {
      const ex = gx * 0.05
      const ey = -gy * 0.04
      eyes.current.position.x += (ex - eyes.current.position.x) * Math.min(1, d * 6)
      eyes.current.position.y += (1.02 + ey - eyes.current.position.y) * Math.min(1, d * 6)

      // Clignement périodique : on écrase brièvement les yeux en hauteur.
      blink.current.next -= d
      if (blink.current.next <= 0 && blink.current.closing <= 0) {
        blink.current.closing = 0.16
        blink.current.next = 2.4 + Math.random() * 3.5
      }
      let blinkScale = 1
      if (blink.current.closing > 0 && !reducedMotion) {
        blink.current.closing -= d
        const p = 1 - blink.current.closing / 0.16
        blinkScale = Math.abs(Math.cos(p * Math.PI)) * 0.9 + 0.1
      }
      eyes.current.scale.y += (blinkScale - eyes.current.scale.y) * Math.min(1, d * 14)
    }

    // Couleur + intensité des yeux selon la réflexion, avec une pulsation vivante.
    const pulse = 1 + Math.sin(t * (3 + k * 6)) * (0.18 + k * 0.5)
    const col = EYE_IDLE.clone().lerp(EYE_THINK, k)
    for (const m of [leftMat.current, rightMat.current]) {
      if (!m) continue
      m.emissive.copy(col)
      m.emissiveIntensity = (2.2 + k * 3.2) * pulse
    }
    // Le cœur de la pupille se contracte légèrement quand il « focalise ».
    const coreScale = 1 - k * 0.25 + Math.sin(t * 4) * 0.04
    leftCore.current?.scale.setScalar(coreScale)
    rightCore.current?.scale.setScalar(coreScale)

    // Respiration + légère lévitation de tout le buste.
    if (group.current && !reducedMotion) {
      group.current.position.y = Math.sin(t * 1.1) * 0.04
      const breathe = 1 + Math.sin(t * 1.6) * 0.012
      group.current.scale.y = breathe
    }

    // Halo orbital : tourne en continu, accélère et s'incline en réflexion.
    if (halo.current) {
      halo.current.rotation.y += d * (0.4 + k * 1.6)
      halo.current.rotation.x = 0.5 + k * 0.25
    }

    // Lumière d'accent qui s'intensifie et vire au cyan en réflexion.
    if (rimLight.current) {
      rimLight.current.intensity = 6 + k * 14 + Math.sin(t * 3) * k * 4
      rimLight.current.color.copy(col)
    }
  })

  return (
    <group ref={group} position={[0, -0.15, 0]}>
      {/* ---- Tête ---- */}
      <group ref={head} position={[0, 1.02, 0]}>
        {/* Coque de la tête, blanc nacré */}
        <RoundedBox args={[1.18, 1.12, 1.04]} radius={0.34} smoothness={6} castShadow>
          <meshStandardMaterial color="#f3f5ff" metalness={0.55} roughness={0.28} />
        </RoundedBox>
        {/* Visière : verre noir incurvé où brillent les yeux */}
        <mesh position={[0, 0.02, 0.46]}>
          <sphereGeometry args={[0.66, 48, 48, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.22, Math.PI * 0.5]} />
          <meshStandardMaterial color="#070912" metalness={0.9} roughness={0.12} side={THREE.DoubleSide} />
        </mesh>
        {/* Yeux posés sur la visière */}
        <group ref={eyes} position={[0, 1.02, 0]}>
          <group position={[-0.27, 0, 0.62]}>
            <Eye matRef={leftMat} coreRef={leftCore} />
          </group>
          <group position={[0.27, 0, 0.62]}>
            <Eye matRef={rightMat} coreRef={rightCore} />
          </group>
        </group>
        {/* Oreillettes / capteurs latéraux */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.12, 24]} />
            <meshStandardMaterial color="#c9d0f5" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        {/* Antenne avec bille lumineuse */}
        <mesh position={[0, 0.66, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.22, 12]} />
          <meshStandardMaterial color="#aab2e0" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <sphereGeometry args={[0.055, 24, 24]} />
          <meshStandardMaterial color="#000" emissive={EYE_THINK} emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>

      {/* ---- Cou ---- */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.2, 0.26, 0.34, 24]} />
        <meshStandardMaterial color="#d4daf6" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* ---- Buste / épaules ---- */}
      <RoundedBox args={[1.5, 0.78, 0.86]} radius={0.3} smoothness={6} position={[0, -0.12, 0]} castShadow>
        <meshStandardMaterial color="#eef1ff" metalness={0.5} roughness={0.32} />
      </RoundedBox>
      {/* Plastron lumineux (cœur d'énergie) */}
      <mesh position={[0, -0.05, 0.44]}>
        <circleGeometry args={[0.16, 32]} />
        <meshStandardMaterial color="#000" emissive={EYE_THINK} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      {/* ---- Halo orbital de particules (le flux de pensée) ---- */}
      <group ref={halo} position={[0, 1.02, 0]} rotation={[0.5, 0, 0]}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.045} color={EYE_THINK} transparent opacity={0.9} sizeAttenuation toneMapped={false} />
        </points>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.4, 0.008, 8, 80]} />
          <meshStandardMaterial color="#000" emissive={EYE_IDLE} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </group>

      {/* ---- Éclairage ---- */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow />
      <pointLight position={[-3, 1, 2]} intensity={3} color="#7c84ff" />
      <pointLight ref={rimLight} position={[0, 1.2, -2.2]} intensity={6} color={EYE_IDLE} />
    </group>
  )
}

export default function RobotAvatar({ state }: Props) {
  usePointerTracking()
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.05, 4.2], fov: 38 }}
      style={{ background: 'transparent' }}
    >
      <Robot state={state} />
      <ContactShadows position={[0, -1.05, 0]} opacity={0.35} scale={5} blur={2.6} far={3} color="#1a1c3a" />
      {/* Environnement de studio généré localement (aucun téléchargement réseau)
          pour des reflets propres sur les surfaces métalliques. */}
      <Environment resolution={128}>
        <Lightformer intensity={2.4} position={[0, 2, 3]} scale={[6, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.6} position={[-3, 1, 2]} scale={[3, 4, 1]} color="#9aa4ff" />
        <Lightformer intensity={1.4} position={[3, 0, -2]} scale={[3, 4, 1]} color="#5b63d6" />
        <Lightformer intensity={1} position={[0, -2, 1]} scale={[6, 3, 1]} color="#2a2d52" />
      </Environment>
      <EffectComposer>
        <Bloom intensity={1.15} luminanceThreshold={0.25} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
