import { useMemo, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const clamp = (t) => Math.min(Math.max(t, 0), 1)
const out = (t) => 1 - Math.pow(1 - clamp(t), 3)
const back = (t) => { t = clamp(t) - 1; return 1 + 2.7 * t * t * t + 1.7 * t * t }
const RED = new THREE.Color('#F32E35'), IND = new THREE.Color('#4E50DE')

function makeLeafGeo() {
  const g = new THREE.PlaneGeometry(1, 1, 8, 24), p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2, v = p.getY(i) + 0.5
    const w = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.7)), 0.85) * 0.5
    p.setXYZ(i, u * w + 0.16 * v * v, v, 0.38 * v * v + Math.abs(u) * w * 0.7)
  }
  g.computeVertexNormals()
  return g
}
const leafGeo = makeLeafGeo()

const vs = `varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 m=modelViewMatrix*vec4(position,1.);vV=-m.xyz;gl_Position=projectionMatrix*m;}`

const leafMat = new THREE.ShaderMaterial({
  transparent: true, side: THREE.DoubleSide, depthWrite: false,
  uniforms: { uA: { value: IND }, uB: { value: RED }, uT: { value: 0 } },
  vertexShader: vs,
  fragmentShader: `uniform vec3 uA;uniform vec3 uB;uniform float uT;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){
  float u=abs(vUv.x-.5)*2.;float v=vUv.y;
  vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
  float f=pow(1.-abs(dot(n,normalize(vV))),2.);
  vec3 c=mix(uA*.85,uB,smoothstep(.3,1.,v+.08*sin(uT*.8+v*5.)));
  float mid=1.-smoothstep(.0,.06,u);
  float s=abs(fract(v*9.-u*2.2)-.5);
  float side=(1.-smoothstep(.0,.05,s))*(1.-smoothstep(.8,1.,u))*smoothstep(.04,.2,u);
  float rim=smoothstep(.82,1.,u);
  c=mix(c,uB*1.25,clamp(mid+side*.8+rim,0.,1.)*.85);
  c+=f*vec3(.45,.12,.35)*.7;
  gl_FragColor=vec4(c,.9);
  #include <colorspace_fragment>
}`,
})

const bubMat = (col) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uC: { value: col } }, vertexShader: vs,
  fragmentShader: `uniform vec3 uC;varying vec3 vN;varying vec3 vV;
void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.5);gl_FragColor=vec4(uC*(.6+f),f*.95+.04);
#include <colorspace_fragment>
}`,
})
const bubMats = [bubMat(RED), bubMat(IND)]

const glowMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: RED } },
  vertexShader: vs,
  fragmentShader: `uniform vec3 uC;varying vec2 vUv;
void main(){float d=1.-clamp(length(vUv-.5)*2.,0.,1.);gl_FragColor=vec4(uC,pow(d,2.2)*.32);
#include <colorspace_fragment>
}`,
})

function build() {
  let s = 13
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const R = (a, b) => a + (b - a) * r()
  const Y = V(0, 1, 0), Z = V(0, 0, 1)
  const pts = (a) => { const o = []; for (let i = 0; i < a.length; i += 3) o.push(V(a[i], a[i + 1], a[i + 2])); return o }
  const defs = [
    [[0, -3.3, 0, -.2, -1.8, .2, .3, -.3, -.1, -.2, 1, .1, 0, 2.2, 0], .065, 7, 1.5],
    [[-.15, -2, .2, -1.2, -1.4, .5, -2.2, -.2, .3, -2.7, 1.2, 0], .04, 5, 1.25],
    [[.1, -.9, -.1, 1.2, -.4, -.4, 2.1, .8, -.3, 2.5, 2, 0], .04, 5, 1.3],
    [[.2, -.2, -.1, -.9, .4, .4, -1.6, 1.4, .2, -1.7, 2.6, 0], .035, 4, 1.1],
    [[-.1, .8, .1, .9, 1.2, .2, 1.4, 2, 0, 1.4, 3, -.2], .035, 4, 1.0],
  ]
  const leaves = [], bloom = V(0, 2.2, 0)
  const stems = defs.map(([a, rad, n, L0], si) => {
    const curve = new THREE.CatmullRomCurve3(pts(a)), geo = new THREE.TubeGeometry(curve, 70, rad, 6), d = si * .25
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n * .97 + .02, tip = i === n - 1, side = i % 2 ? 1 : -1
      const T = curve.getTangentAt(t)
      const D = tip ? T.clone() : T.clone().applyAxisAngle(Z, side * R(.7, 1.15)).applyAxisAngle(Y, R(-.6, .6))
      const q = new THREE.Quaternion().setFromUnitVectors(Y, D.normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(Y, R(0, 6.28)))
      const L = L0 * (1.15 - .6 * t) * R(.9, 1.08)
      leaves.push({ p: curve.getPointAt(t), q, L, W: L * .36, d: d + .2 + t * 2.2 })
    }
    return { geo, d, total: geo.index.count }
  })
  ;[[.95, 9, 1.6], [.62, 7, 1.35], [.34, 5, 1.1]].forEach(([phi, n, L], ring) => {
    for (let i = 0; i < n; i++) {
      const th = i / n * 6.283 + ring * .4 + R(-.15, .15)
      const D = V(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th))
      const q = new THREE.Quaternion().setFromUnitVectors(Y, D)
      const l = L * R(.92, 1.06)
      leaves.push({ p: bloom.clone(), q, L: l, W: l * .55, d: 2.8 + ring * .35 + i * .06 })
    }
  })
  const stamens = Array.from({ length: 12 }, () => {
    const th = R(0, 6.28), phi = R(.1, .45), len = R(.8, 1.4)
    const tip = V(Math.sin(phi) * Math.cos(th) * len, Math.cos(phi) * len, Math.sin(phi) * Math.sin(th) * len)
    const c = new THREE.CatmullRomCurve3([V(0, 0, 0), tip.clone().multiplyScalar(.5).add(V(R(-.1, .1), 0, R(-.1, .1))), tip])
    return { geo: new THREE.TubeGeometry(c, 16, .012, 4), tip }
  })
  const bubbles = Array.from({ length: 16 }, (_, i) => ({ x: (r() < .5 ? -1 : 1) * R(1.8, 4.2), y: R(-2.8, 3.6), z: R(-1.5, 1.5), r: R(.08, .32), m: i % 2 }))
  const spores = new Float32Array(150 * 3).map((_, i) => (i % 3 === 0 ? R(-4.5, 4.5) : i % 3 === 1 ? R(-3.5, 4.5) : R(-2, 2)))
  return { stems, leaves, bloom, stamens, bubbles, spores }
}

function Scene() {
  const g = useRef(), mouse = useRef({ x: 0, y: 0 }), data = useMemo(build, [])
  const leaves = useRef([]), stamens = useRef(), bubs = useRef([]), pts = useRef()
  const { viewport } = useThree()

  useEffect(() => {
    const m = (e) => { mouse.current.x = e.clientX / innerWidth - .5; mouse.current.y = e.clientY / innerHeight - .5 }
    addEventListener('pointermove', m)
    return () => removeEventListener('pointermove', m)
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    leafMat.uniforms.uT.value = t

    data.stems.forEach((s) => s.geo.setDrawRange(0, Math.floor(s.total * out((t - s.d) / 2.4) / 3) * 3))
    data.leaves.forEach((l, i) => {
      const m = leaves.current[i]
      const k = back((t - l.d) / 1.4)
      m && m.scale.set(l.W * k, l.L * k, l.L * k)
    })
    stamens.current.scale.setScalar(back((t - 3.4) / 1.2))

    bubs.current.forEach((m, i) => {
      const b = data.bubbles[i]
      m.scale.setScalar(Math.max(b.r * back((t - 1.8 - i * .08)), .0001))
      m.position.set(
        b.x + Math.cos(t * .4 + i) * .12,
        b.y + Math.sin(t * .6 + i * 1.7) * .25,
        b.z
      )
    })

    pts.current.rotation.y = t * .03

    const o = g.current
    o.position.y = -0.2
    o.rotation.y += ((mouse.current.x * 0.9 + t * 0.15) - o.rotation.y) * 0.05
    o.rotation.x += (mouse.current.y * 0.25 - o.rotation.x) * 0.05
    o.rotation.z = Math.sin(t * 0.5) * 0.03
    o.scale.setScalar(Math.min(0.56, viewport.height / 11.5, viewport.width / 7.5))
  })

  return (
    <group ref={g}>
      <mesh position={[data.bloom.x, data.bloom.y, -.5]} scale={7} material={glowMat}>
        <planeGeometry />
      </mesh>

      {data.stems.map((s, i) => (
        <mesh key={i} geometry={s.geo}>
          <meshBasicMaterial color="#4E50DE" />
        </mesh>
      ))}

      {data.leaves.map((l, i) => (
        <mesh
          key={i}
          ref={(el) => (leaves.current[i] = el)}
          geometry={leafGeo}
          material={leafMat}
          position={l.p}
          quaternion={l.q}
          scale={0}
        />
      ))}

      <group ref={stamens} position={data.bloom}>
        {data.stamens.map((s, i) => (
          <group key={i}>
            <mesh geometry={s.geo}>
              <meshBasicMaterial color="#F32E35" />
            </mesh>
            <mesh position={s.tip}>
              <sphereGeometry args={[.06, 12, 12]} />
              <meshBasicMaterial color="#F32E35" />
            </mesh>
          </group>
        ))}
      </group>

      {data.bubbles.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => (bubs.current[i] = el)}
          material={bubMats[b.m]}
          scale={0}
        >
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>
      ))}

      <points ref={pts}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.spores, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={.05}
          color="#F32E35"
          transparent
          opacity={.7}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  )
}

export default function Flower({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const key = (e) => e.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = prev
      removeEventListener('keydown', key)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fl"
          role="dialog"
          aria-modal="true"
          aria-label="3D flower"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          {/* Canvas mounts only while open, so the grow-in animation replays every time */}
          <div className="fl-cv">
            <Canvas camera={{ position: [0, 0, 9], fov: 38 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
              <Scene />
            </Canvas>
          </div>
          <button className="fl-close" onClick={onClose} aria-label="Close flower">
            Close <span>esc</span>
          </button>
          <div className="fl-hint">a beautiful flower for you</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}