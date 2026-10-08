import { useEffect, useRef } from 'react'

/*
  Fixed, full-page aurora: a blue glow rising from the bottom and layered
  3D-ish waves with glowing rims. It starts calm and blue at the top of the
  page and becomes more colourful (violet, yellow, green, teal) as you scroll.
  Pure canvas 2D. Respects reduced motion, pauses when the tab is hidden.
*/

const BLUE = [64, 110, 255]
const VIOLET = [176, 112, 255]
const YELLOW = [255, 198, 72]
const GREEN = [84, 222, 150]
const TEAL = [70, 202, 228]

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

export default function Aurora() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0, H = 0, raf = 0, last = performance.now(), t = 2, prog = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = cv.clientWidth, h = cv.clientHeight
      if (w === W && Math.abs(h - H) < 120) return // ignore mobile URL-bar jitter
      W = w; H = h
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      prog = max > 0 ? clamp(window.scrollY / max) : 0
      if (still) draw()
    }

    const waveY = (x, k) => {
      const u = x / W
      const base = H * (0.935 - k * 0.05)
      const amp = H * (0.06 + 0.022 * k)
      const swell = 0.5 + 0.5 * Math.sin(u * Math.PI * (2.1 + 0.5 * k) + t * (0.28 + 0.07 * k) + k * 1.9)
      const bump = Math.exp(-Math.pow((u - (0.52 + 0.26 * Math.sin(t * 0.13 + k * 1.3))) / 0.17, 2))
      return base - amp * (0.45 * swell + 1.5 * bump)
    }

    function draw() {
      if (!W || !H) return
      const col = 0.3 + 0.7 * ss(0.03, 0.6, prog) // colour richness grows with scroll

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#08070B'
      ctx.fillRect(0, 0, W, H)

      // base blue glow rising from the bottom
      let g = ctx.createLinearGradient(0, H, 0, H * 0.2)
      g.addColorStop(0, rgba(BLUE, 0.62))
      g.addColorStop(0.35, 'rgba(36,66,190,0.2)')
      g.addColorStop(1, 'rgba(8,7,11,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      // soft colour blobs riding the wave crest
      ctx.globalCompositeOperation = 'lighter'
      const blobs = [
        [VIOLET, 0.55], [BLUE, 0.6], [YELLOW, 0.6], [GREEN, 0.55], [TEAL, 0.5],
      ]
      const R = clamp(Math.max(W * 0.26, H * 0.34), 220, 560)
      blobs.forEach(([c, a], i) => {
        const x = W * (i + 0.5) / blobs.length + Math.sin(t * 0.22 + i * 1.7) * W * 0.05
        const y = waveY(x, 0) - H * 0.015
        const alpha = a * (c === BLUE ? 1 : col)
        const rg = ctx.createRadialGradient(x, y, 0, x, y, R)
        rg.addColorStop(0, rgba(c, alpha))
        rg.addColorStop(0.45, rgba(c, alpha * 0.32))
        rg.addColorStop(1, rgba(c, 0))
        ctx.fillStyle = rg
        ctx.fillRect(x - R, y - R, R * 2, R * 2)
      })

      // layered waves, back to front
      ctx.globalCompositeOperation = 'source-over'
      for (let k = 2; k >= 0; k--) {
        ctx.beginPath()
        ctx.moveTo(0, H)
        for (let x = 0; x <= W + 6; x += 6) ctx.lineTo(x, waveY(x, k))
        ctx.lineTo(W, H)
        ctx.closePath()

        const top = waveY(W * 0.5, k) - H * 0.06
        const fg = ctx.createLinearGradient(0, top, 0, H)
        if (k === 0) { fg.addColorStop(0, 'rgba(12,12,26,0.9)'); fg.addColorStop(1, 'rgba(8,7,11,1)') }
        else { fg.addColorStop(0, rgba(BLUE, 0.1 + 0.03 * k)); fg.addColorStop(1, 'rgba(8,7,11,0.85)') }
        ctx.fillStyle = fg
        ctx.fill()

        // glowing rim along the crest
        const rim = ctx.createLinearGradient(0, 0, W, 0)
        const ra = (k === 0 ? 0.95 : 0.3) * (0.45 + 0.55 * col)
        rim.addColorStop(0, rgba(VIOLET, ra))
        rim.addColorStop(0.3, rgba(BLUE, ra))
        rim.addColorStop(0.52, rgba(YELLOW, ra * (0.4 + 0.6 * col)))
        rim.addColorStop(0.75, rgba(GREEN, ra * (0.4 + 0.6 * col)))
        rim.addColorStop(1, rgba(TEAL, ra))
        ctx.beginPath()
        for (let x = 0; x <= W + 6; x += 6) {
          const y = waveY(x, k)
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = rim
        ctx.lineWidth = k === 0 ? 26 : 12
        ctx.globalAlpha = 0.06
        ctx.stroke()
        ctx.lineWidth = k === 0 ? 10 : 6
        ctx.globalAlpha = 0.14
        ctx.stroke()
        ctx.lineWidth = k === 0 ? 1.6 : 1
        ctx.globalAlpha = 1
        ctx.stroke()
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      t += dt
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    resize()
    if (!still) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return <canvas ref={ref} className="aurora" aria-hidden="true" />
}