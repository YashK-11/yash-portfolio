import { useEffect, useRef } from 'react'

/*
  Two calm scenes in one box, animated in the spirit of 3Blue1Brown / Manim.
  Scene 1 (26s): a tiny neural network
  Scene 2 (24s): computer vision - a kernel convolves a pixel image, then a detector boxes the object
  Scene 3 (24s): k-means - centroids and assignments iterate until the clusters settle
  Scene 1 story:
    01 architecture  : neurons and connections are *created* (strokes draw themselves)
    02 forward pass  : signals travel layer by layer, neurons fill with their activation
    03 loss          : the output is compared with the target
    04 backprop      : gradient pulses flow backwards, weights visibly change, loss drops
  Pure canvas 2D, no dependencies. Pauses off-screen, respects reduced motion.
*/

const LAYERS = [4, 6, 6, 3]
const L = LAYERS.length
const NET_LEN = 26
const CV_LEN = 24
const KM_LEN = 24
const LOOP = NET_LEN + CV_LEN + KM_LEN
const STILL_T = 15.4 // frame shown when the user prefers reduced motion

const COL = {
  ink: '244,237,238',
  blue: '88,196,221', // 3b1b blue   -> positive weight
  red: '243,46,53', // site red    -> negative weight
  yellow: '255,216,77', // 3b1b yellow -> gradients / highlight
  green: '131,193,103', // 3b1b green  -> third cluster
  indigo: '78,80,222',
  muted: '142,137,156',
}

const TAU = Math.PI * 2
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const seg = (t, a, b) => clamp((t - a) / (b - a))
const eio = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t)) // easeInOutSine: slow and calm
const lerp = (a, b, m) => a + (b - a) * m

/* ---------- fixed, deterministic model so the loop is identical every time ---------- */
const MODEL = (() => {
  let s = 11
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const W0 = [], W1 = []
  for (let l = 0; l < L - 1; l++) {
    const a = [], b = []
    for (let j = 0; j < LAYERS[l + 1]; j++) {
      const ra = [], rb = []
      for (let i = 0; i < LAYERS[l]; i++) {
        const w = rnd() * 2 - 1
        ra.push(w)
        rb.push(clamp(w + (rnd() * 2 - 1) * 0.55, -1, 1))
      }
      a.push(ra); b.push(rb)
    }
    W0.push(a); W1.push(b)
  }
  return {
    W0, W1,
    acts: [
      [0.92, 0.18, 0.74, 0.34],
      [0.78, 0.22, 0.9, 0.4, 0.62, 0.15],
      [0.3, 0.85, 0.55, 0.2, 0.92, 0.45],
    ],
    outBefore: [0.08, 0.86, 0.06],
    outAfter: [0.04, 0.93, 0.03],
  }
})()

/* ---------- timeline (seconds) ---------- */
const F0 = [8.0, 10.2, 12.4] // forward  transitions (layer l -> l+1)
const B0 = [17.6, 19.2, 20.8] // backward transitions (layer 3->2, 2->1, 1->0)
const T_OUT = 14.6 // winning class highlighted
const T_LOSS = 15.6
const T_BACK = 17.4
const T_UPDATE = 22.4
const T_FADE = 24.6

const LOSS_BEFORE = -Math.log(MODEL.outBefore[1]) // 0.151
const LOSS_AFTER = -Math.log(MODEL.outAfter[1]) // 0.073

const STAGE_START = [0, F0[0], T_LOSS, T_BACK, T_FADE]
const STAGE_NAME = ['architecture', 'forward pass', 'loss', 'backpropagation']
const STAGE_TEXT = ['ŷ = f( x ; θ )', 'a′ = σ( W a + b )', 'L = − log p(ŷ)', 'θ ← θ − η ∇L']

const SERIF = 'italic 20px "Times New Roman", Georgia, serif'
const MONO = '"Space Mono", ui-monospace, Menlo, monospace'

function drawNet(ctx, W, H, t) {
  ctx.clearRect(0, 0, W, H)
  if (W < 10 || H < 10) return

  ctx.globalAlpha = 1 - eio(seg(t, T_FADE, T_FADE + 1.2))
  ctx.lineCap = 'round'

  /* ----- layout ----- */
  const pad = 20
  const x0 = Math.max(34, W * 0.08)
  const x1 = W - Math.max(74, W * 0.15)
  const colGap = (x1 - x0) / (L - 1)
  const cy = H * 0.44
  const gap = Math.min(H * 0.105, colGap * 0.5)
  const r = clamp(gap * 0.3, 6, 15)
  const px = (l) => x0 + l * colGap
  const py = (l, i) => cy + (i - (LAYERS[l] - 1) / 2) * gap

  const upd = eio(seg(t, T_UPDATE, T_UPDATE + 1.2))
  const outAct = (j) => lerp(MODEL.outBefore[j], MODEL.outAfter[j], upd)
  const actOf = (l, j) => (l === 3 ? outAct(j) : MODEL.acts[l][j])

  /* ----- frame ticks + figure caption ----- */
  const capA = eio(seg(t, 0.2, 1.4))
  ctx.strokeStyle = `rgba(${COL.indigo},${0.55 * capA})`
  ctx.lineWidth = 1
  const tk = 10, m = 10
  ;[[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + sy * tk); ctx.lineTo(x, y); ctx.lineTo(x + sx * tk, y); ctx.stroke()
  })
  ctx.font = `10px ${MONO}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = `rgba(${COL.muted},${capA})`
  ctx.fillText('fig. 01 — feed-forward network  4·6·6·3', pad + 4, pad + 12)

  /* ----- edges: blue = positive weight, red = negative, thickness = |w| ----- */
  for (let l = 0; l < L - 1; l++) {
    const nS = LAYERS[l], nT = LAYERS[l + 1], total = nS * nT
    const morph = eio(seg(t, B0[2 - l] + 0.6, B0[2 - l] + 1.6))
    for (let i = 0; i < nS; i++) {
      for (let j = 0; j < nT; j++) {
        const s0 = 3.0 + l * 0.9 + ((i * nT + j) / total) * 1.0
        const created = eio(seg(t, s0, s0 + 1.1))
        if (created <= 0) continue
        const w = lerp(MODEL.W0[l][j][i], MODEL.W1[l][j][i], morph)
        const aw = Math.abs(w)
        const ax = px(l), ay = py(l, i), bx = px(l + 1), by = py(l + 1, j)
        ctx.strokeStyle = `rgba(${w >= 0 ? COL.blue : COL.red},${0.1 + 0.42 * aw})`
        ctx.lineWidth = 0.5 + 1.3 * aw
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(lerp(ax, bx, created), lerp(ay, by, created))
        ctx.stroke()
      }
    }
  }

  /* ----- travelling pulses: forward = pale blue, backward = yellow ----- */
  const pulse = (ax, ay, bx, by, u, color, env) => {
    const tail = clamp(u - 0.2)
    ctx.save()
    ctx.shadowColor = `rgba(${color},.9)`
    ctx.shadowBlur = 8
    ctx.strokeStyle = `rgba(${color},${0.85 * env})`
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(lerp(ax, bx, tail), lerp(ay, by, tail))
    ctx.lineTo(lerp(ax, bx, u), lerp(ay, by, u))
    ctx.stroke()
    ctx.fillStyle = `rgba(${color},${env})`
    ctx.beginPath()
    ctx.arc(lerp(ax, bx, u), lerp(ay, by, u), 2.4, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  for (let l = 0; l < L - 1; l++) {
    for (let i = 0; i < LAYERS[l]; i++) {
      for (let j = 0; j < LAYERS[l + 1]; j++) {
        const ax = px(l), ay = py(l, i), bx = px(l + 1), by = py(l + 1, j)
        const f = seg(t, F0[l] + i * 0.03 + j * 0.05, F0[l] + 1.4 + i * 0.03 + j * 0.05)
        if (f > 0 && f < 1) pulse(ax, ay, bx, by, eio(f), '214,244,255', Math.sin(Math.PI * f))
        const b = seg(t, B0[2 - l] + j * 0.03 + i * 0.05, B0[2 - l] + 1.2 + j * 0.03 + i * 0.05)
        if (b > 0 && b < 1) pulse(bx, by, ax, ay, eio(b), COL.yellow, Math.sin(Math.PI * b))
      }
    }
  }

  /* ----- neurons ----- */
  const win = eio(seg(t, T_OUT, T_OUT + 1.0))
  for (let l = 0; l < L; l++) {
    for (let i = 0; i < LAYERS[l]; i++) {
      const n0 = 0.4 + l * 0.55 + i * 0.07
      const created = eio(seg(t, n0, n0 + 0.9))
      if (created <= 0) continue
      const x = px(l), y = py(l, i)

      const fillIn = l === 0 ? eio(seg(t, 6.8, 7.8)) : eio(seg(t, F0[l - 1] + 1.3, F0[l - 1] + 2.0))
      const fill = fillIn * actOf(l, i)

      ctx.fillStyle = `rgba(8,7,11,${created})`
      ctx.beginPath(); ctx.arc(x, y, r - 0.5, 0, TAU); ctx.fill()
      if (fill > 0) {
        ctx.fillStyle = `rgba(${COL.ink},${fill * 0.92})`
        ctx.beginPath(); ctx.arc(x, y, r - 0.5, 0, TAU); ctx.fill()
      }

      // the outline draws itself (Manim "Create")
      ctx.strokeStyle = `rgba(${COL.ink},0.85)`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * created)
      ctx.stroke()

      // winning class ring
      if (l === 3 && i === 1 && win > 0) {
        ctx.save()
        ctx.shadowColor = `rgba(${COL.yellow},.8)`; ctx.shadowBlur = 10
        ctx.strokeStyle = `rgba(${COL.yellow},${0.9 * win})`
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(x, y, r + 4, 0, TAU); ctx.stroke()
        ctx.restore()
      }

      // gradient arrives -> yellow flash
      const flash = l === 3
        ? Math.sin(Math.PI * seg(t, B0[0] - 0.5, B0[0] + 0.5))
        : Math.sin(Math.PI * seg(t, B0[2 - l] + 1.0, B0[2 - l] + 1.8))
      if (flash > 0) {
        ctx.save()
        ctx.shadowColor = `rgba(${COL.yellow},.9)`; ctx.shadowBlur = 12
        ctx.strokeStyle = `rgba(${COL.yellow},${flash})`
        ctx.lineWidth = 1.8
        ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, TAU); ctx.stroke()
        ctx.restore()
      }
    }
  }

  /* ----- layer labels + output probabilities ----- */
  const names = ['input  x', 'hidden', 'hidden', 'output  ŷ']
  const labelY = cy + ((Math.max(...LAYERS) - 1) / 2) * gap + r + 20
  ctx.font = `9px ${MONO}`
  ctx.textAlign = 'center'
  for (let l = 0; l < L; l++) {
    ctx.fillStyle = `rgba(${COL.muted},${eio(seg(t, 2.2 + l * 0.4, 3.2 + l * 0.4))})`
    ctx.fillText(names[l].toUpperCase(), px(l), labelY)
  }
  const pa = eio(seg(t, F0[2] + 1.6, F0[2] + 2.4))
  if (pa > 0) {
    ctx.textAlign = 'left'
    ctx.font = `11px ${MONO}`
    for (let j = 0; j < 3; j++) {
      const winner = j === 1
      ctx.fillStyle = `rgba(${winner && win > 0 ? COL.yellow : COL.ink},${pa * (winner ? 1 : 0.55)})`
      ctx.fillText(outAct(j).toFixed(2), px(3) + r + 12, py(3, j) + 4)
    }
  }

  /* ----- loss read-out (top right) ----- */
  const la = eio(seg(t, T_LOSS, T_LOSS + 1.0))
  if (la > 0) {
    ctx.textAlign = 'right'
    ctx.font = `9px ${MONO}`
    ctx.fillStyle = `rgba(${COL.muted},${la})`
    ctx.fillText('LOSS', W - pad - 4, pad + 12)
    ctx.font = `bold 18px ${MONO}`
    ctx.fillStyle = `rgba(${upd > 0.5 ? COL.blue : COL.ink},${la})`
    ctx.fillText(lerp(LOSS_BEFORE, LOSS_AFTER, upd).toFixed(3), W - pad - 4, pad + 34)
  }

  /* ----- chapter bars, formula, stage name (bottom) ----- */
  const baseY = H - pad - 4
  const barY = baseY - 38
  let stage = 0
  for (let k = 0; k < 4; k++) if (t >= STAGE_START[k]) stage = k
  for (let k = 0; k < 4; k++) {
    const prog = k === stage ? seg(t, STAGE_START[k], STAGE_START[k + 1]) : k < stage ? 1 : 0
    const bx = pad + 4 + k * 38
    ctx.strokeStyle = `rgba(${COL.ink},${0.16 * capA})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(bx, barY); ctx.lineTo(bx + 30, barY); ctx.stroke()
    if (prog > 0) {
      ctx.strokeStyle = `rgba(${k === 3 ? COL.yellow : COL.red},${capA})`
      ctx.beginPath(); ctx.moveTo(bx, barY); ctx.lineTo(bx + 30 * prog, barY); ctx.stroke()
    }
  }
  for (let k = 0; k < 4; k++) {
    const fadeIn = eio(seg(t, STAGE_START[k], STAGE_START[k] + 0.7))
    const fadeOutK = k === 3 ? 1 : 1 - eio(seg(t, STAGE_START[k + 1] - 0.5, STAGE_START[k + 1]))
    const a = fadeIn * fadeOutK
    if (a <= 0) continue
    ctx.textAlign = 'left'
    ctx.font = SERIF
    ctx.fillStyle = `rgba(${COL.ink},${0.92 * a})`
    ctx.fillText(STAGE_TEXT[k], pad + 4, baseY)
    ctx.textAlign = 'right'
    ctx.font = `10px ${MONO}`
    ctx.fillStyle = `rgba(${k === 3 ? COL.yellow : COL.red},${a})`
    ctx.fillText(`0${k + 1} / 04  ${STAGE_NAME[k].toUpperCase()}`, W - pad - 4, baseY)
  }

  /* ----- loop hairline ----- */
  ctx.fillStyle = `rgba(${COL.indigo},0.55)`
  ctx.fillRect(0, H - 1, W * (t / LOOP), 1)
  ctx.globalAlpha = 1
}

/* =====================================================================
   Scene 2: computer vision  (convolution -> feature map -> detection)
   ===================================================================== */
const IMG_ROWS = [
  '0000000000',
  '0111111100',
  '0000001100',
  '0000011000',
  '0000110000',
  '0000110000',
  '0001100000',
  '0001100000',
  '0001100000',
  '0000000000',
]
const KERNEL = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] // Sobel-x: responds to vertical edges
const CVM = (() => {
  let s = 5
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const img = IMG_ROWS.map((row) => [...row].map((ch) => (ch === '1' ? 0.84 + 0.16 * rnd() : 0.03 + 0.07 * rnd())))
  const out = []
  let maxAbs = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      let v = 0
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) v += KERNEL[a][b] * img[r + a][c + b]
      out.push(v)
      maxAbs = Math.max(maxAbs, Math.abs(v))
    }
  }
  return { img, out, maxAbs }
})()

const CV_STAGE_START = [0, 3.6, 16.8, 24]
const CV_STAGE_NAME = ['input', 'convolution', 'detection']
const CV_STAGE_TEXT = ['I : 10 × 10 px', 'y = I ∗ K', 'p( 7 | I ) = 0.97']

function frame(ctx, W, H, capA, caption) {
  ctx.strokeStyle = `rgba(${COL.indigo},${0.55 * capA})`
  ctx.lineWidth = 1
  const tk = 10, m = 10
  ;[[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + sy * tk); ctx.lineTo(x, y); ctx.lineTo(x + sx * tk, y); ctx.stroke()
  })
  ctx.font = `10px ${MONO}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = `rgba(${COL.muted},${capA})`
  ctx.fillText(caption, 24, 32)
}

function footer(ctx, W, H, s, capA, starts, names, texts) {
  const n = names.length, pad = 20
  const baseY = H - pad - 4, barY = baseY - 38
  let stage = 0
  for (let k = 0; k < n; k++) if (s >= starts[k]) stage = k
  for (let k = 0; k < n; k++) {
    const prog = k === stage ? seg(s, starts[k], starts[k + 1]) : k < stage ? 1 : 0
    const bx = pad + 4 + k * 38
    ctx.strokeStyle = `rgba(${COL.ink},${0.16 * capA})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(bx, barY); ctx.lineTo(bx + 30, barY); ctx.stroke()
    if (prog > 0) {
      ctx.strokeStyle = `rgba(${k === n - 1 ? COL.yellow : COL.red},${capA})`
      ctx.beginPath(); ctx.moveTo(bx, barY); ctx.lineTo(bx + 30 * prog, barY); ctx.stroke()
    }
  }
  for (let k = 0; k < n; k++) {
    const a = eio(seg(s, starts[k], starts[k] + 0.7)) * (k === n - 1 ? 1 : 1 - eio(seg(s, starts[k + 1] - 0.5, starts[k + 1])))
    if (a <= 0) continue
    ctx.textAlign = 'left'
    ctx.font = SERIF
    ctx.fillStyle = `rgba(${COL.ink},${0.92 * a})`
    ctx.fillText(texts[k], pad + 4, baseY)
    ctx.textAlign = 'right'
    ctx.font = `10px ${MONO}`
    ctx.fillStyle = `rgba(${k === n - 1 ? COL.yellow : COL.red},${a})`
    ctx.fillText(`0${k + 1} / 0${n}  ${names[k].toUpperCase()}`, W - pad - 4, baseY)
  }
}

function rectCreate(ctx, x, y, w, h, p) {
  const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]
  let rem = p * 2 * (w + h)
  ctx.beginPath(); ctx.moveTo(x, y)
  for (let i = 1; i < 5 && rem > 0; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    const f = Math.min(1, rem / len)
    ctx.lineTo(lerp(ax, bx, f), lerp(ay, by, f))
    rem -= len
  }
  ctx.stroke()
}

function drawCV(ctx, W, H, s) {
  ctx.clearRect(0, 0, W, H)
  if (W < 10 || H < 10) return
  ctx.globalAlpha = 1 - eio(seg(s, 22.6, 23.8))
  ctx.lineCap = 'round'

  /* ----- layout ----- */
  const x0 = Math.max(30, W * 0.07)
  const gapMid = Math.max(78, W * 0.12)
  const c1 = Math.max(8, Math.min((W - 2 * x0 - gapMid) / 18, H * 0.05))
  const cy = H * 0.44
  const ix = x0, iy = cy - 5 * c1
  const ox = x0 + 10 * c1 + gapMid, oy = cy - 4 * c1
  const mcx = ix + 10 * c1 + gapMid / 2

  const capA = eio(seg(s, 0.2, 1.4))
  frame(ctx, W, H, capA, 'fig. 02 — 2D convolution · Sobel-x kernel')

  /* ----- input image: pixels are created diagonally ----- */
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const d = (r + c) * 0.08
      const p = eio(seg(s, 0.3 + d, 1.1 + d))
      if (p <= 0) continue
      const x = ix + c * c1, y = iy + r * c1
      ctx.fillStyle = `rgba(${COL.ink},${CVM.img[r][c] * 0.9 * p})`
      ctx.fillRect(x + 1, y + 1, c1 - 2, c1 - 2)
      ctx.strokeStyle = `rgba(${COL.ink},${0.14 * p})`
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, c1 - 1, c1 - 1)
    }
  }

  /* ----- empty feature-map cells ----- */
  const fa = eio(seg(s, 2.4, 3.4))
  ctx.strokeStyle = `rgba(${COL.ink},${0.1 * fa})`
  ctx.lineWidth = 1
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) ctx.strokeRect(ox + c * c1 + 0.5, oy + r * c1 + 0.5, c1 - 1, c1 - 1)

  ctx.font = `9px ${MONO}`
  ctx.textAlign = 'left'
  ctx.fillStyle = `rgba(${COL.muted},${capA})`
  ctx.fillText('INPUT  I', ix, iy - 10)
  ctx.fillStyle = `rgba(${COL.muted},${fa})`
  ctx.fillText('FEATURE MAP  I ∗ K', ox, oy - 10)

  /* ----- kernel matrix ----- */
  const ka = eio(seg(s, 2.2, 3.2))
  const kc = clamp(c1 * 0.95, 13, 19)
  const kx = mcx - 1.5 * kc, ky = cy - 1.5 * kc - 6
  if (ka > 0) {
    ctx.textAlign = 'center'
    ctx.fillStyle = `rgba(${COL.muted},${ka})`
    ctx.font = `9px ${MONO}`
    ctx.fillText('KERNEL  K', mcx, ky - 10)
    ctx.font = `10px ${MONO}`
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        const v = KERNEL[a][b]
        const col = v > 0 ? COL.blue : v < 0 ? COL.red : COL.muted
        ctx.strokeStyle = `rgba(${COL.ink},${0.2 * ka})`
        ctx.strokeRect(kx + b * kc + 0.5, ky + a * kc + 0.5, kc - 1, kc - 1)
        ctx.fillStyle = `rgba(${col},${ka * (v === 0 ? 0.6 : 1)})`
        ctx.fillText(String(v).replace('-', '−'), kx + b * kc + kc / 2, ky + a * kc + kc / 2 + 3.5)
      }
    }
  }

  /* ----- sliding window (starts slow, accelerates) ----- */
  const tau = seg(s, 3.6, 16.6)
  const k = 64 * Math.pow(tau, 1.7)
  const kk = Math.min(Math.floor(k), 63)
  const frac = k >= 64 ? 0 : k - Math.floor(k)
  const wr = Math.floor(kk / 8)
  let wc = kk % 8
  if (kk < 63 && (kk + 1) % 8 !== 0) wc += eio(frac)
  const wa = eio(seg(s, 3.4, 4.0)) * (1 - eio(seg(s, 16.6, 17.4)))

  // feature-map cells fill as the window passes (blue = +, red = −)
  for (let idx = 0; idx < 64; idx++) {
    const p = s < 3.6 ? 0 : eio(seg(k, idx + 0.2, idx + 0.8))
    if (p <= 0) continue
    const v = CVM.out[idx], mag = Math.abs(v) / CVM.maxAbs
    if (mag < 0.04) continue
    ctx.fillStyle = `rgba(${v >= 0 ? COL.blue : COL.red},${p * (0.14 + 0.8 * mag)})`
    ctx.fillRect(ox + (idx % 8) * c1 + 1, oy + Math.floor(idx / 8) * c1 + 1, c1 - 2, c1 - 2)
  }

  if (wa > 0) {
    ctx.save()
    ctx.shadowColor = `rgba(${COL.yellow},.8)`; ctx.shadowBlur = 8
    ctx.fillStyle = `rgba(${COL.yellow},${0.08 * wa})`
    ctx.fillRect(ix + wc * c1, iy + wr * c1, 3 * c1, 3 * c1)
    ctx.strokeStyle = `rgba(${COL.yellow},${0.95 * wa})`
    ctx.lineWidth = 1.6
    ctx.strokeRect(ix + wc * c1, iy + wr * c1, 3 * c1, 3 * c1)
    ctx.strokeRect(ox + (kk % 8) * c1 + 0.5, oy + wr * c1 + 0.5, c1 - 1, c1 - 1)
    ctx.restore()

    const v = CVM.out[kk]
    ctx.textAlign = 'center'
    ctx.font = 'bold 12px ' + MONO
    ctx.fillStyle = `rgba(${v >= 0 ? COL.blue : COL.red},${wa})`
    ctx.fillText(`${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`, mcx, ky + 3 * kc + 22)
  }

  /* ----- detection: box draws itself, label appears ----- */
  const bp = eio(seg(s, 17.8, 19.6))
  if (bp > 0) {
    const bx = ix + c1 - 3, by = iy + c1 - 3, bw = 7 * c1 + 6, bh = 8 * c1 + 6
    ctx.save()
    ctx.shadowColor = `rgba(${COL.yellow},.8)`; ctx.shadowBlur = 8
    ctx.strokeStyle = `rgba(${COL.yellow},.95)`
    ctx.lineWidth = 1.8
    rectCreate(ctx, bx, by, bw, bh, bp)
    ctx.restore()
    const la = eio(seg(s, 19.2, 20.2))
    if (la > 0) {
      ctx.textAlign = 'left'
      ctx.font = 'bold 10px ' + MONO
      ctx.fillStyle = `rgba(${COL.yellow},${la})`
      ctx.fillText('7   p = 0.97', bx + 2, by - 6)
    }
  }

  footer(ctx, W, H, s, capA, CV_STAGE_START, CV_STAGE_NAME, CV_STAGE_TEXT)

  ctx.fillStyle = `rgba(${COL.indigo},0.55)`
  ctx.fillRect(0, H - 1, W * ((NET_LEN + s) / LOOP), 1)
  ctx.globalAlpha = 1
}


/* =====================================================================
   Scene 3: classic ML  (k-means clustering)
   ===================================================================== */
const KM = (() => {
  let s = 23
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd())
  const centers = [[0.24, 0.66], [0.74, 0.7], [0.5, 0.26]]
  const pts = []
  centers.forEach(([cx, cy]) => {
    for (let i = 0; i < 30; i++) pts.push([clamp(cx + gauss() * 0.075, 0.04, 0.96), clamp(cy + gauss() * 0.075, 0.04, 0.96)])
  })
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]]
  }
  const d2 = (p, c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
  let C = [[0.1, 0.5], [0.4, 0.92], [0.9, 0.2]] // deliberately poor start
  const Cs = [C], As = [], Jb = [], Ja = []
  for (let it = 0; it < 4; it++) {
    const A = pts.map((p) => {
      let b = 0
      for (let k = 1; k < 3; k++) if (d2(p, C[k]) < d2(p, C[b])) b = k
      return b
    })
    Jb.push(pts.reduce((a, p, i) => a + d2(p, C[A[i]]), 0))
    const N = C.map((c, k) => {
      const m = pts.filter((_, i) => A[i] === k)
      return m.length ? [m.reduce((a, p) => a + p[0], 0) / m.length, m.reduce((a, p) => a + p[1], 0) / m.length] : c
    })
    Ja.push(pts.reduce((a, p, i) => a + d2(p, N[A[i]]), 0))
    As.push(A); Cs.push(N)
    const shift = Math.max(...N.map((c, k) => Math.hypot(c[0] - C[k][0], c[1] - C[k][1])))
    C = N
    if (shift < 1e-3) break
  }
  // 2-sigma covariance ellipse per final cluster
  const fin = As[As.length - 1]
  const ell = [0, 1, 2].map((k) => {
    const m = pts.filter((_, i) => fin[i] === k)
    const mx = m.reduce((a, p) => a + p[0], 0) / m.length
    const my = m.reduce((a, p) => a + p[1], 0) / m.length
    let sxx = 0, syy = 0, sxy = 0
    m.forEach((p) => { sxx += (p[0] - mx) ** 2; syy += (p[1] - my) ** 2; sxy += (p[0] - mx) * (p[1] - my) })
    sxx /= m.length; syy /= m.length; sxy /= m.length
    const tr = (sxx + syy) / 2, dt = Math.sqrt(Math.max(tr * tr - (sxx * syy - sxy * sxy), 0))
    return { mx, my, a: 2 * Math.sqrt(tr + dt), b: 2 * Math.sqrt(Math.max(tr - dt, 1e-6)), ang: 0.5 * Math.atan2(2 * sxy, sxx - syy) }
  })
  return { pts, Cs, As, Jb, Ja, ell, n: As.length }
})()

const KM_IT0 = 5.0 // first assignment step
const KM_ITL = 3.4 // seconds per iteration (assign 0-1.6, update 1.6-3.2)
const KM_END = KM_IT0 + KM.n * KM_ITL
const KM_STAGE_START = [0, 3.2, KM_IT0, KM_END, 24]
const KM_STAGE_NAME = ['data', 'initialise', 'iterate', 'converged']
const KM_STAGE_TEXT = ['X ∈ ℝ²  ·  n = 90', 'k = 3 centroids', 'μ ← mean(cluster)', 'min J( μ, c )']
const KM_COLS = [COL.blue, COL.red, COL.green]
const KM_RGB = KM_COLS.map((c) => c.split(',').map(Number))
const GREY = [196, 190, 200]

function drawKM(ctx, W, H, s) {
  ctx.clearRect(0, 0, W, H)
  if (W < 10 || H < 10) return
  ctx.globalAlpha = 1 - eio(seg(s, 22.6, 23.8))
  ctx.lineCap = 'round'

  /* ----- layout: plot rectangle in data space [0,1]^2 ----- */
  const x0 = Math.max(40, W * 0.09)
  const px0 = x0, px1 = W - x0, py0 = 62, py1 = H - 96
  const X = (u) => px0 + u * (px1 - px0)
  const Y = (v) => py1 - v * (py1 - py0)
  const pr = clamp(Math.min(px1 - px0, py1 - py0) * 0.011, 2.4, 4.2)

  const capA = eio(seg(s, 0.2, 1.4))
  frame(ctx, W, H, capA, 'fig. 03 — k-means clustering  k = 3')

  /* ----- plane: faint grid, axes that draw themselves, ticks ----- */
  const ga = eio(seg(s, 0.2, 1.6))
  ctx.lineWidth = 1
  ctx.strokeStyle = `rgba(${COL.indigo},${0.16 * ga})`
  for (let i = 1; i <= 4; i++) {
    const u = i / 4
    ctx.beginPath(); ctx.moveTo(X(u), py0); ctx.lineTo(X(u), py1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px0, Y(u)); ctx.lineTo(px1, Y(u)); ctx.stroke()
  }
  const axp = eio(seg(s, 0.2, 1.8))
  ctx.strokeStyle = `rgba(${COL.ink},0.55)`
  ctx.lineWidth = 1.3
  ctx.beginPath(); ctx.moveTo(px0, py1); ctx.lineTo(lerp(px0, px1, axp), py1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(px0, py1); ctx.lineTo(px0, lerp(py1, py0, axp)); ctx.stroke()
  ctx.font = `9px ${MONO}`
  ctx.fillStyle = `rgba(${COL.muted},${ga})`
  ctx.textAlign = 'center'
  for (let i = 0; i <= 4; i++) ctx.fillText((i / 4).toFixed(2).replace('0.00', '0'), X(i / 4), py1 + 15)
  ctx.textAlign = 'right'
  for (let i = 1; i <= 4; i++) ctx.fillText((i / 4).toFixed(2), px0 - 8, Y(i / 4) + 3)
  ctx.textAlign = 'right'
  ctx.fillText('x₁', px1, py1 + 28)
  ctx.textAlign = 'left'
  ctx.fillText('x₂', px0 + 6, py0 + 4)

  /* ----- iteration state ----- */
  const n = KM.n
  const itRaw = s < KM_IT0 ? -1 : Math.floor((s - KM_IT0) / KM_ITL)
  const done = itRaw >= n
  const it = done ? n - 1 : Math.max(itRaw, 0)
  const loc = done ? KM_ITL : Math.max(s - KM_IT0 - it * KM_ITL, 0)
  const running = itRaw >= 0
  const g = running ? eio(seg(loc, 1.6, 3.0)) : 0
  const cpos = (k) => {
    if (!running) return KM.Cs[0][k]
    const a = KM.Cs[it][k], b = KM.Cs[it + 1][k]
    return [lerp(a[0], b[0], g), lerp(a[1], b[1], g)]
  }

  /* ----- final 2-sigma ellipses (Create) ----- */
  if (done || s > KM_END - 0.01) {
    const te = s - KM_END
    KM.ell.forEach((e, k) => {
      const p = eio(seg(te, 0.2 + k * 0.3, 1.5 + k * 0.3))
      if (p <= 0) return
      ctx.save()
      ctx.translate(X(e.mx), Y(e.my))
      ctx.scale(px1 - px0, -(py1 - py0))
      ctx.rotate(e.ang)
      ctx.beginPath()
      ctx.ellipse(0, 0, e.a, e.b, 0, -Math.PI / 2, -Math.PI / 2 + TAU * p)
      ctx.restore()
      ctx.strokeStyle = `rgba(${KM_COLS[k]},0.75)`
      ctx.lineWidth = 1.4
      ctx.stroke()
    })
  }

  /* ----- assignment lines (point -> its centroid) ----- */
  if (running && !done) {
    const la = Math.sin(Math.PI * seg(loc, 0.1, 1.5))
    if (la > 0) {
      KM.pts.forEach((p, i) => {
        const k = KM.As[it][i], c = KM.Cs[it][k]
        ctx.strokeStyle = `rgba(${KM_COLS[k]},${0.26 * la})`
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(X(p[0]), Y(p[1])); ctx.lineTo(X(c[0]), Y(c[1])); ctx.stroke()
      })
    }
  }

  /* ----- points: appear staggered, then recolour by assignment ----- */
  const m = running ? eio(seg(loc, 0.2, 1.2)) : 0
  KM.pts.forEach((p, i) => {
    const ap = eio(seg(s, 0.5 + i * 0.026, 1.1 + i * 0.026))
    if (ap <= 0) return
    let rgb = GREY
    if (running) {
      const cur = KM_RGB[KM.As[it][i]]
      const prev = it > 0 ? KM_RGB[KM.As[it - 1][i]] : GREY
      rgb = [0, 1, 2].map((q) => Math.round(lerp(prev[q], cur[q], m)))
    }
    ctx.fillStyle = `rgba(${rgb.join(',')},${(running ? 0.92 : 0.6) * ap})`
    ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), pr * ap, 0, TAU); ctx.fill()
  })

  /* ----- centroids: diamonds, with a dashed trail while they move ----- */
  const ca = eio(seg(s, 3.2, 4.2))
  if (ca > 0) {
    const trail = running ? eio(seg(loc, 1.6, 1.9)) * (1 - eio(seg(loc, 3.0, 3.3))) : 0
    for (let k = 0; k < 3; k++) {
      const [cx, cy] = cpos(k)
      const x = X(cx), y = Y(cy)
      if (trail > 0) {
        const o = KM.Cs[it][k]
        ctx.save()
        ctx.setLineDash([3, 4])
        ctx.strokeStyle = `rgba(${COL.yellow},${0.8 * trail})`
        ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(X(o[0]), Y(o[1])); ctx.lineTo(x, y); ctx.stroke()
        ctx.restore()
      }
      const sz = (pr * 2.3 + 2) * ca
      ctx.save()
      ctx.shadowColor = `rgba(${COL.yellow},.7)`
      ctx.shadowBlur = trail > 0 || s < 4.6 ? 10 : 0
      ctx.beginPath()
      ctx.moveTo(x, y - sz); ctx.lineTo(x + sz, y); ctx.lineTo(x, y + sz); ctx.lineTo(x - sz, y); ctx.closePath()
      ctx.fillStyle = `rgba(${KM_COLS[k]},${ca})`
      ctx.fill()
      ctx.strokeStyle = `rgba(${COL.ink},${0.95 * ca})`
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()
    }
  }

  /* ----- inertia read-out (top right) ----- */
  const ja = eio(seg(s, KM_IT0, KM_IT0 + 0.8))
  if (ja > 0) {
    const prevJ = it > 0 ? KM.Ja[it - 1] : KM.Jb[0]
    const J = lerp(lerp(prevJ, KM.Jb[it], m), KM.Ja[it], g)
    ctx.textAlign = 'right'
    ctx.font = `9px ${MONO}`
    ctx.fillStyle = `rgba(${COL.muted},${ja})`
    ctx.fillText('INERTIA  J', W - 24, 32)
    ctx.font = 'bold 18px ' + MONO
    ctx.fillStyle = `rgba(${done ? COL.blue : COL.ink},${ja})`
    ctx.fillText(J.toFixed(2), W - 24, 54)
  }
  const ea = eio(seg(s, KM_END + 0.4, KM_END + 1.4))
  if (ea > 0) {
    ctx.textAlign = 'right'
    ctx.font = `9px ${MONO}`
    ctx.fillStyle = `rgba(${COL.yellow},${ea})`
    ctx.fillText(`CONVERGED · ${n} ITERATIONS`, W - 24, 68)
  }

  footer(ctx, W, H, s, capA, KM_STAGE_START, KM_STAGE_NAME, KM_STAGE_TEXT)

  ctx.fillStyle = `rgba(${COL.indigo},0.55)`
  ctx.fillRect(0, H - 1, W * ((NET_LEN + CV_LEN + s) / LOOP), 1)
  ctx.globalAlpha = 1
}

function draw(ctx, W, H, t) {
  if (t < NET_LEN) drawNet(ctx, W, H, t)
  else if (t < NET_LEN + CV_LEN) drawCV(ctx, W, H, t - NET_LEN)
  else drawKM(ctx, W, H, t - NET_LEN - CV_LEN)
}

export default function DataViz() {
  const wrap = useRef(null)
  const cv = useRef(null)

  useEffect(() => {
    const el = wrap.current
    const canvas = cv.current
    const ctx = canvas.getContext('2d')
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0, H = 0, t = still ? STILL_T : 0
    let raf = 0, last = 0, visible = true

    const render = () => draw(ctx, W, H, t)
    const resize = () => {
      const r = el.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = r.width; H = r.height
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      render()
    }
    const loop = (now) => {
      raf = 0
      if (!visible) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      t = (t + dt) % LOOP
      render()
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (still || raf || !visible) return
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
    })
    io.observe(el)
    resize()
    start()
    document.fonts?.ready.then(render)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <div className="dv" ref={wrap} aria-hidden="true">
      <div className="dv-grid" />
      <canvas ref={cv} />
    </div>
  )
}