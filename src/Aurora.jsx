import { useEffect, useRef } from 'react'

/*
  Background scene (one fixed canvas, pure 2D):
   1. soft multi-colour aurora that drifts and gently follows the cursor
   2. a mixed-colour light bloom that slowly turns and drifts across the
      page as you scroll
   3. dark storm clouds lit from the ring
  Kept low-alpha so content stays readable. Respects reduced motion and
  pauses when the tab is hidden.
*/

const BLUE = [66, 133, 244]
const VIOLET = [155, 114, 255]
const CYAN = [56, 200, 235]
const CORAL = [255, 111, 97]
const RED = [243, 46, 53]
const GREEN = [84, 222, 150]
const GOLD = [255, 198, 72]
const AMBER = [255, 163, 88]
const ROSE = [255, 118, 150]

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a, b, k) => a + (b - a) * k
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/* ---- light sprite: mixed-colour bloom, rendered once and rotated per frame ---- */
function makeRing() {
  const S = 512, h = S / 2
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const c = cv.getContext('2d')

  // colours sweep around the ring
  const stops = [[0, CORAL], [0.14, AMBER], [0.26, GOLD], [0.4, ROSE], [0.55, VIOLET], [0.7, BLUE], [0.82, CYAN], [0.92, ROSE], [1, CORAL]]
  if (c.createConicGradient) {
    const g = c.createConicGradient(0, h, h)
    stops.forEach(([p, col]) => g.addColorStop(p, rgba(col, 1)))
    c.fillStyle = g
  } else {
    c.fillStyle = rgba(BLUE, 1)
  }
  c.fillRect(0, 0, S, S)

  // radial alpha profile: a soft bloom (sprite half-size = 4 radii), no hole in the middle
  c.globalCompositeOperation = 'destination-in'
  const m = c.createRadialGradient(h, h, 0, h, h, h)
  ;[[0, 0.75], [0.12, 0.8], [0.25, 0.68], [0.34, 0.5], [0.46, 0.32], [0.6, 0.18], [0.8, 0.06], [1, 0]]
    .forEach(([t, a]) => m.addColorStop(t, `rgba(0,0,0,${a})`))
  c.fillStyle = m
  c.fillRect(0, 0, S, S)

  // pale hot centre
  c.globalCompositeOperation = 'lighter'
  const p = c.createRadialGradient(h, h, 0, h, h, h)
  ;[[0, 0.3], [0.1, 0.2], [0.24, 0.06], [0.36, 0]]
    .forEach(([t, a]) => p.addColorStop(t, `rgba(255,224,190,${a})`))
  c.fillStyle = p
  c.fillRect(0, 0, S, S)
  return cv
}

export default function Aurora() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ring = makeRing()
    const cloud = document.createElement('canvas')
    const cc = cloud.getContext('2d')

    let W = 0, H = 0, raf = 0, last = performance.now(), lastCloud = 0, t = 0, prog = 0
    let ready = false, presence = 0, presenceTarget = 0
    const ptr = { x: 0, y: 0 }
    const orb = { x: 0, y: 0, r: 100 } // position + size of the light source

    // cursor followers (soft trailing glows)
    const f = [
      { c: AMBER, k: 0.085, x: 0, y: 0, r: 0.9, a: 0.075, ox: 0, oy: 0 },
      { c: VIOLET, k: 0.045, x: 0, y: 0, r: 1.15, a: 0.07, ox: -90, oy: 60 },
      { c: BLUE, k: 0.026, x: 0, y: 0, r: 1.0, a: 0.06, ox: 100, oy: -50 },
      { c: ROSE, k: 0.016, x: 0, y: 0, r: 0.8, a: 0.055, ox: 30, oy: 110 },
    ]
    // ambient blobs: [colour, anchorX, anchorY, speed, phase, radius, alpha]
    const ambient = [
      [BLUE, 0.16, 0.2, 0.11, 0.0, 0.62, 0.05],
      [VIOLET, 0.84, 0.3, 0.09, 2.1, 0.58, 0.055],
      [AMBER, 0.5, 0.92, 0.13, 4.2, 0.55, 0.05],
      [CORAL, 0.92, 0.78, 0.08, 1.2, 0.46, 0.05],
      [ROSE, 0.22, 0.95, 0.1, 3.3, 0.42, 0.04],
    ]

    // cloud puffs: stable layout, drifting slowly
    const R = rng(11)
    const puffs = []
    const bank = (cx, cy, sx, sy, n, size, dark) => {
      for (let i = 0; i < n; i++) {
        puffs.push({
          x: cx + (R() - 0.5) * sx, y: cy + (R() - 0.5) * sy,
          r: size * (0.55 + R() * 0.9), a: 0.5 + R() * 0.5, dark,
          ph: R() * 6.28, sp: 0.03 + R() * 0.04,
        })
      }
    }
    bank(0.9, 1.0, 0.6, 0.22, 13, 0.17, 1)   // big bank, lower right
    bank(0.07, 0.8, 0.4, 0.2, 9, 0.12, 0.8)   // wisps, lower left
    bank(0.25, -0.02, 0.7, 0.12, 9, 0.15, 1.1) // storm, upper left
    bank(1.0, 0.28, 0.16, 0.3, 6, 0.1, 0.9)    // right edge
    bank(0.5, 1.03, 0.5, 0.1, 7, 0.12, 0.8)    // low haze

    const resize = () => {
      const w = cv.clientWidth, h = cv.clientHeight
      if (w === W && Math.abs(h - H) < 120) return
      W = w; H = h
      cv.width = W; cv.height = H
      cloud.width = W; cloud.height = H
      orb.r = clamp(Math.min(W, H) * 0.17, 56, 150)
      if (!ready) {
        ptr.x = W * 0.5; ptr.y = H * 0.35
        f.forEach((p) => { p.x = ptr.x; p.y = ptr.y })
        const o = orbTarget(); orb.x = o.x; orb.y = o.y
        ready = true
      }
      drawClouds()
      draw()
    }

    // the light drifts along a path as you scroll
    function orbTarget() {
      return {
        x: W * (0.58 + 0.3 * Math.sin(prog * Math.PI * 2.6 + 0.3)) + (W / 2 - ptr.x) * 0.03 * presence,
        y: H * (0.33 + 0.14 * Math.sin(prog * Math.PI * 1.7 + 1.0)) + (H / 2 - ptr.y) * 0.03 * presence,
      }
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      prog = max > 0 ? clamp(window.scrollY / max) : 0
      if (still) { const o = orbTarget(); orb.x = o.x; orb.y = o.y; drawClouds(); draw() }
    }
    const onMove = (e) => { ptr.x = e.clientX; ptr.y = e.clientY; presenceTarget = 1 }
    const onLeave = () => { presenceTarget = 0 }
    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
      else if (!still && !raf) { last = performance.now(); raf = requestAnimationFrame(loop) }
    }

    const glow = (g2, x, y, rad, c, a) => {
      const g = g2.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, rgba(c, a))
      g.addColorStop(0.45, rgba(c, a * 0.35))
      g.addColorStop(1, rgba(c, 0))
      g2.fillStyle = g
      g2.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }

    /* clouds are drawn to an offscreen layer a few times a second, then blitted */
    function drawClouds() {
      if (!W || !H) return
      cc.clearRect(0, 0, W, H)
      const base = Math.max(W, H)
      for (const p of puffs) {
        const x = (p.x + Math.sin(t * p.sp + p.ph) * 0.016) * W
        const y = (p.y + Math.cos(t * p.sp * 0.8 + p.ph) * 0.01) * H
        const r = p.r * base
        const dx = orb.x - x, dy = orb.y - y
        const dist = Math.hypot(dx, dy) || 1
        const lit = clamp(1 - dist / (base * 0.75))
        cc.save()
        cc.translate(x, y)
        cc.scale(1, 0.58)
        // dark body
        cc.globalCompositeOperation = 'source-over'
        let g = cc.createRadialGradient(0, 0, 0, 0, 0, r)
        g.addColorStop(0, `rgba(18,20,42,${0.62 * p.a * p.dark})`)
        g.addColorStop(0.6, `rgba(14,15,34,${0.3 * p.a * p.dark})`)
        g.addColorStop(1, 'rgba(10,10,26,0)')
        cc.fillStyle = g
        cc.fillRect(-r, -r, r * 2, r * 2)
        // rim light facing the eclipse
        if (lit > 0.02) {
          cc.globalCompositeOperation = 'lighter'
          const ox = (dx / dist) * r * 0.42, oy = (dy / dist) * r * 0.42 / 0.58
          const tint = lit > 0.5 ? [255, 176, 140] : [200, 140, 235]
          g = cc.createRadialGradient(ox, oy, 0, ox, oy, r * 0.8)
          g.addColorStop(0, rgba(tint, 0.2 * lit * p.a))
          g.addColorStop(1, rgba(tint, 0))
          cc.fillStyle = g
          cc.fillRect(-r, -r, r * 2, r * 2)
        }
        cc.restore()
      }
    }

    function draw() {
      if (!W || !H) return
      const base = Math.max(W, H)
      const Rg = clamp(base * 0.34, 260, 560)
      const { x: ox, y: oy, r } = orb

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#08070B'
      ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = 'lighter'

      // ambient colour drift
      const px = (f[0].x / W - 0.5) * 40
      const py = (f[0].y / H - 0.5) * 40
      ambient.forEach(([c, ax, ay, sp, ph, rr, a], i) => {
        const x = W * ax + Math.sin(t * sp + ph) * W * 0.09 + px * (i % 2 ? -1 : 1)
        const y = H * ay + Math.cos(t * sp * 0.8 + ph) * H * 0.08 + py * (i % 2 ? 1 : -1)
        glow(ctx, x, y, Rg * rr * 1.5, c, a)
      })

      // light halo
      glow(ctx, ox, oy, r * 7, VIOLET, 0.07)
      glow(ctx, ox, oy, r * 4.2, AMBER, 0.06)
      glow(ctx, ox + r * 1.6, oy - r * 0.6, r * 3, CORAL, 0.05)
      glow(ctx, ox - r * 1.8, oy + r * 0.8, r * 3, BLUE, 0.04)

      // mixed-colour bloom, two layers turning in opposite directions
      const k = (r * 4) / 256
      ctx.save()
      ctx.translate(ox, oy)
      ctx.rotate(t * 0.07 + prog * 4)
      ctx.scale(k, k)
      ctx.globalAlpha = 0.3
      ctx.drawImage(ring, -256, -256)
      ctx.restore()
      ctx.save()
      ctx.translate(ox, oy)
      ctx.rotate(-t * 0.045 + 1.7 - prog * 3)
      ctx.scale(k * 1.12, k * 1.12)
      ctx.globalAlpha = 0.10
      ctx.drawImage(ring, -256, -256)
      ctx.restore()
      ctx.globalAlpha = 1

      // clouds in front of the light
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(cloud, 0, 0)

      // cursor followers
      ctx.globalCompositeOperation = 'lighter'
      const boost = 0.55 + 0.45 * presence
      f.forEach((p) => glow(ctx, p.x + p.ox * presence, p.y + p.oy * presence, Rg * p.r, p.c, p.a * boost))

      // vignette keeps edges calm and text legible
      ctx.globalCompositeOperation = 'source-over'
      const v = ctx.createRadialGradient(W / 2, H / 2, base * 0.25, W / 2, H / 2, base * 0.8)
      v.addColorStop(0, 'rgba(8,7,11,0)')
      v.addColorStop(1, 'rgba(8,7,11,0.55)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, W, H)
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      t += dt
      presence = lerp(presence, presenceTarget, 1 - Math.pow(0.0001, dt))

      const wx = W * (0.5 + 0.28 * Math.sin(t * 0.17))
      const wy = H * (0.38 + 0.22 * Math.sin(t * 0.23 + 1.3))
      const tx = lerp(wx, ptr.x, presence)
      const ty = lerp(wy, ptr.y, presence)
      f.forEach((p) => {
        const kk = 1 - Math.pow(1 - p.k, dt * 60)
        p.x = lerp(p.x, tx, kk)
        p.y = lerp(p.y, ty, kk)
      })

      // the light eases toward its scroll position, with a slow breathing drift
      const o = orbTarget()
      const ek = 1 - Math.pow(0.02, dt)
      orb.x = lerp(orb.x, o.x + Math.sin(t * 0.21) * 8, ek)
      orb.y = lerp(orb.y, o.y + Math.cos(t * 0.17) * 6, ek)

      if (now - lastCloud > 100) { drawClouds(); lastCloud = now }
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVis)
    onScroll()
    resize()
    if (!still) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} className="aurora" aria-hidden="true" />
}