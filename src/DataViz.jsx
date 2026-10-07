import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* Crystal clusters: noisy data condenses into 3 faceted crystals, links up as a graph, then dissolves. Loops. */

const N = 520
const CYCLE = 14
const CENTERS = [
  new THREE.Vector3(-2.1, -0.5, 0.8),
  new THREE.Vector3(2.0, 0.3, -0.9),
  new THREE.Vector3(0.1, 1.7, 1.3),
]
const COLORS = ['#F32E35', '#6C6EFF', '#F4EDEE'].map((c) => new THREE.Color(c))
const RAW = new THREE.Color('#6d687a')
const RINGS = [
  { r: 2.9, tilt: [1.2, 0.3], speed: 0.35, color: '#4E50DE' },
  { r: 3.4, tilt: [0.5, -0.6], speed: -0.25, color: '#F32E35' },
  { r: 3.9, tilt: [-0.9, 0.9], speed: 0.18, color: '#4E50DE' },
]

const clamp = (t) => Math.min(Math.max(t, 0), 1)
const ss = (t) => { t = clamp(t); return t * t * (3 - 2 * t) }

// 0 = raw cloud, 1 = fully crystallised
function weight(c) {
  if (c < 3.5) return 0
  if (c < 6.5) return ss((c - 3.5) / 3)
  if (c < 11) return 1
  return 1 - ss((c - 11) / 3)
}

const dotTex = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
})()

function build() {
  let s = 7
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd())

  const cluster = new Uint8Array(N)
  const target = new Float32Array(N * 3)
  const scatter = new Float32Array(N * 3)
  const delay = new Float32Array(N)
  const phase = new Float32Array(N)
  const lineCol = new Float32Array(N * 6)

  for (let i = 0; i < N; i++) {
    const k = i % 3
    cluster[i] = k
    const c = CENTERS[k]
    const tx = c.x + gauss() * 0.55, ty = c.y + gauss() * 0.55, tz = c.z + gauss() * 0.55
    target.set([tx, ty, tz], i * 3)
    scatter.set([
      THREE.MathUtils.clamp(tx + gauss() * 1.7, -3.2, 3.2),
      THREE.MathUtils.clamp(ty + gauss() * 1.5, -2.4, 2.4),
      THREE.MathUtils.clamp(tz + gauss() * 1.5, -2.4, 2.4),
    ], i * 3)
    delay[i] = rnd()
    phase[i] = rnd() * 6.28
    const col = COLORS[k]
    lineCol.set([col.r, col.g, col.b, col.r, col.g, col.b], i * 6)
  }

  // faint halo of dust on a sphere
  const halo = new Float32Array(300 * 3)
  for (let i = 0; i < 300; i++) {
    const u = rnd() * 2 - 1, a = rnd() * 6.2832, r = Math.sqrt(1 - u * u) * 4.1
    halo.set([r * Math.cos(a), u * 4.1, r * Math.sin(a)], i * 3)
  }
  return { cluster, target, scatter, delay, phase, lineCol, halo }
}

function Scene() {
  const d = useMemo(build, [])
  const g = useRef(), pts = useRef(), lines = useRef(), link = useRef(), haloRef = useRef()
  const cents = useRef([]), hulls = useRef([]), rings = useRef([])
  const mouse = useRef({ x: 0, y: 0 })
  const { viewport } = useThree()

  const pos = useMemo(() => new Float32Array(N * 3), [])
  const col = useMemo(() => new Float32Array(N * 3), [])
  const linePos = useMemo(() => new Float32Array(N * 6), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  const linkGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const [a, b, c] = CENTERS
    geo.setAttribute('position', new THREE.Float32BufferAttribute(
      [a.x, a.y, a.z, b.x, b.y, b.z, b.x, b.y, b.z, c.x, c.y, c.z, c.x, c.y, c.z, a.x, a.y, a.z], 3))
    return geo
  }, [])

  useEffect(() => {
    const m = (e) => { mouse.current.x = e.clientX / innerWidth - 0.5; mouse.current.y = e.clientY / innerHeight - 0.5 }
    addEventListener('pointermove', m)
    return () => removeEventListener('pointermove', m)
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const w = weight(t % CYCLE)

    for (let i = 0; i < N; i++) {
      const wi = ss(w * 1.5 - d.delay[i] * 0.5)
      const j = (1 - wi * 0.6) * 0.09
      const a = t * 0.9 + d.phase[i]
      const ix = i * 3
      const x = d.scatter[ix] + (d.target[ix] - d.scatter[ix]) * wi + Math.sin(a) * j
      const y = d.scatter[ix + 1] + (d.target[ix + 1] - d.scatter[ix + 1]) * wi + Math.cos(a * 1.1) * j
      const z = d.scatter[ix + 2] + (d.target[ix + 2] - d.scatter[ix + 2]) * wi + Math.sin(a * 0.8) * j
      pos[ix] = x; pos[ix + 1] = y; pos[ix + 2] = z

      tmp.copy(RAW).lerp(COLORS[d.cluster[i]], wi)
      col[ix] = tmp.r; col[ix + 1] = tmp.g; col[ix + 2] = tmp.b

      const cc = CENTERS[d.cluster[i]], lx = i * 6
      linePos[lx] = x; linePos[lx + 1] = y; linePos[lx + 2] = z
      linePos[lx + 3] = cc.x; linePos[lx + 4] = cc.y; linePos[lx + 5] = cc.z
    }
    const pg = pts.current.geometry
    pg.attributes.position.needsUpdate = true
    pg.attributes.color.needsUpdate = true
    lines.current.geometry.attributes.position.needsUpdate = true
    lines.current.material.opacity = ss((w - 0.55) / 0.45) * 0.16
    link.current.material.opacity = ss((w - 0.8) / 0.2) * 0.55

    const hs = ss((w - 0.75) / 0.25)
    cents.current.forEach((m, k) => {
      const s = ss((w - 0.5) / 0.5) * (1 + Math.sin(t * 2.2 + k) * 0.12)
      m.scale.setScalar(Math.max(s, 0.0001))
      m.rotation.y = t * 0.8 + k
      m.rotation.x = t * 0.5
    })
    hulls.current.forEach((m, k) => {
      m.scale.setScalar(Math.max(hs, 0.0001))
      m.rotation.y = -t * 0.2 + k
    })

    rings.current.forEach((m, i) => { m.rotation.z = t * RINGS[i].speed })
    haloRef.current.rotation.y = t * 0.04

    const wide = viewport.width / viewport.height > 1.1, o = g.current
    o.position.x += ((wide ? -viewport.width * 0.24 : 0) - o.position.x) * 0.08
    o.rotation.y += ((t * 0.12 + mouse.current.x * 0.7) - o.rotation.y) * 0.05
    o.rotation.x += ((0.28 + mouse.current.y * 0.3) - o.rotation.x) * 0.05
    o.scale.setScalar(wide ? 0.82 : Math.min(0.8, viewport.width / 9))
  })

  return (
    <group ref={g}>
      {RINGS.map((r, i) => (
        <group key={i} rotation={[r.tilt[0], r.tilt[1], 0]}>
          <group ref={(el) => (rings.current[i] = el)}>
            <mesh>
              <torusGeometry args={[r.r, 0.006, 6, 160]} />
              <meshBasicMaterial color={r.color} transparent opacity={0.5} />
            </mesh>
            <mesh position={[r.r, 0, 0]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshBasicMaterial color={r.color} />
            </mesh>
          </group>
        </group>
      ))}

      <points ref={haloRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[d.halo, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.06} map={dotTex} color="#4E50DE" transparent opacity={0.6} depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
      </points>

      <lineSegments ref={lines} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[d.lineCol, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <lineSegments ref={link} geometry={linkGeo}>
        <lineBasicMaterial color="#F4EDEE" transparent opacity={0} />
      </lineSegments>

      <points ref={pts} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.16} map={dotTex} vertexColors transparent depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
      </points>

      {CENTERS.map((c, k) => (
        <mesh key={'h' + k} ref={(el) => (hulls.current[k] = el)} position={c} scale={0}>
          <icosahedronGeometry args={[1.2, 1]} />
          <meshBasicMaterial color={COLORS[k]} wireframe transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}
      {CENTERS.map((c, k) => (
        <mesh key={'c' + k} ref={(el) => (cents.current[k] = el)} position={c} scale={0}>
          <octahedronGeometry args={[0.3]} />
          <meshBasicMaterial color={COLORS[k]} wireframe />
        </mesh>
      ))}
    </group>
  )
}

export default function DataViz() {
  const wrap = useRef()
  const [visible, setVisible] = useState(true)
  const [still] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 })
    io.observe(wrap.current)
    return () => io.disconnect()
  }, [])

  return (
    <div className="dv" ref={wrap} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 40 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        frameloop={visible && !still ? 'always' : 'demand'}
      >
        <Scene />
      </Canvas>
    </div>
  )
}