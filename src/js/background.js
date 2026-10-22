// Background: threads spring from the name in the footer and float up along an
// exponential curve. Each thread is a horizontal line that grows as messages
// are appended to its right end. Hovering a thread shows its cross-references.

const canvas = document.getElementById("bg")
const spring = document.getElementById("spring")
const ctx = canvas.getContext("2d")

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches

// Colour along a thread, by distance from its anchor: navy, teal, gold, light
// gold for the solid body, then sand and pale lavender for the message tail.
const SOLID = [
  [30, 58, 76],
  [52, 96, 112],
  [183, 121, 31],
  [222, 178, 96],
]
const TAIL_NEAR = [216, 200, 168]
const TAIL_FAR = [200, 204, 218]
const ARRIVING = [168, 176, 200]
const HIGHLIGHT = [183, 121, 31]
const SEGMENTS = [0, 16, 40, 110, 160]

const THICK = 8
const PITCH = 13
const MAX_MESSAGES = 320
const FLOAT_IN = 1.5
const LAUNCH = 0.9
const BASE_ALPHA = 0.8
const OPEN_SPEED = 7
const FONT_FAMILY = "ui-monospace, Menlo, Consolas, monospace"
const FONT = `10px ${FONT_FAMILY}`
const CREAM = [244, 243, 239]
// Copy for a lifted thread. The four body blocks tell one task's story in
// order: the task, where it looked, how it reasoned, how it checked. The
// tail blocks are outcomes.
const TASKS = [
  "reconcile q3",
  "audit claim 55c0",
  "review policy v14",
  "settle payout 3e1",
  "rebalance shard 07",
  "verify invoice 4411",
  "triage alert 212",
  "merge change 88",
  "close ticket 9f2",
  "replay run 1a7",
  "price quote 0x3d",
  "renew contract b7",
]
const SOURCES = [
  "read ledger",
  "fetch records",
  "load policy",
  "pull evidence",
  "query history",
  "open spec",
  "scan logs",
  "ask registry",
]
const REASONS = [
  "compare 3 rows",
  "plan 4 steps",
  "derive total",
  "infer scope",
  "draft decision",
  "trace cause",
  "weigh 2 options",
  "simulate change",
]
const CHECKS = [
  "verify sums",
  "cross-check",
  "test 12/12",
  "cite sources",
  "check limits",
  "second opinion",
  "replay diff",
  "sign off",
]
const OUTCOMES = [
  "ok 84ms",
  "ok 212ms",
  "ok 371ms",
  "verified",
  "no drift",
  "cached",
  "mismatch",
  "rerun",
  "flagged",
  "ask human",
  "approved",
  "logged",
]
const pick = (list) => list[Math.floor(Math.random() * list.length)]

let W = 0
let H = 0
let Lx = 0
let Ly = 0
let speed = 0
const src = { x: 0, y: 0, left: 0, width: 0 }
const rows = []
let spawnAcc = 0
const pointer = { x: -1e4, y: -1e4, on: false, at: 0, moved: false }
let hovered = null
let cursorOn = false

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const mix = (a, b, k) => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
]

function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1)
  W = innerWidth
  H = innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  speed = Math.max(H, 200) / 48
}

function geometry() {
  const r = spring.getBoundingClientRect()
  if (r.width) {
    src.x = Math.round(r.right + 14)
    src.y = r.top + r.height * 0.55
    src.left = r.left
    src.width = r.width
  } else {
    src.x = Math.min(W * 0.04, 60)
    src.y = H * 0.95
  }
  Lx = (W - src.x) * 0.55
  Ly = Math.max(H * 0.9, src.y + (scrollY || 0) + 60)
}

const tOf = (dy) => Math.pow(Math.max(0, dy / Ly), 1 / 2.7)
const easeOut = (k) => 1 - Math.pow(1 - k, 3)

// Launch progress: 0 while still inside the name, 1 once fully out.
function launched(r, now) {
  return easeOut(Math.min(1, (now - r.start) / LAUNCH))
}

function anchor(r, now) {
  const e = now === undefined ? 1 : launched(r, now)
  const x = src.x + Lx * Math.pow(r.t, 0.7) - 16 * (1 - e)
  return [x, src.y - r.dy]
}

function addMessage(r, now) {
  if (r.n >= MAX_MESSAGES) return
  const n = r.n
  if (n && r.pos[n - 1] > Math.min(520, W * 0.5)) return
  r.w[n] = 3 + Math.round(Math.random() * 3)
  r.pos[n] = n ? r.pos[n - 1] + r.w[n - 1] + 2 : 0
  r.born[n] = now
  r.n = n + 1
}

function spawn(now) {
  const r = {
    dy: 0,
    t: 0,
    n: 0,
    rate: 1.1 + Math.random() * 1.4,
    next: 0.12,
    burst: 3 + Math.floor(Math.random() * 3),
    start: now,
    w: new Float32Array(MAX_MESSAGES),
    pos: new Float32Array(MAX_MESSAGES),
    born: new Float32Array(MAX_MESSAGES),
    seed: new Float32Array(MAX_MESSAGES),
    refs: [],
    open: 0,
    pinned: false,
    story: [pick(TASKS), pick(SOURCES), pick(REASONS), pick(CHECKS)],
  }
  for (let i = 0; i < MAX_MESSAGES; i++) r.seed[i] = Math.random() - 0.5
  addMessage(r, now)
  if (rows.length > 4) {
    for (let i = 0; i < 2; i++) {
      r.refs.push({
        row: rows[Math.floor(Math.random() * rows.length)],
        seg: Math.floor(Math.random() * 4),
      })
    }
  }
  rows.push(r)
  return r
}

function step(now, dt) {
  spawnAcc += (dt * speed) / PITCH
  while (spawnAcc > 1) {
    spawnAcc--
    spawn(now).dy = spawnAcc * PITCH
  }
  const lengthScale = Math.min(1, (H * 0.9) / Ly)
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]
    r.dy += dt * speed
    r.t = tOf(r.dy)
    if (r.dy > Ly + 20) {
      rows.splice(i, 1)
      continue
    }
    r.next -= dt
    while (r.next <= 0) {
      addMessage(r, now)
      if (r.burst > 0) {
        // The first few messages spring out together.
        r.burst--
        r.next += 0.07 + Math.random() * 0.05
      } else {
        // An open thread works faster while you watch it.
        const boost = r.open > 0.5 ? 3 : 1
        r.next +=
          (0.85 + Math.random() * 0.3) /
          (r.rate * (0.5 + 0.8 * r.t) * lengthScale * boost)
      }
    }
  }
}

// Whether a thread is under the pointer, with a little vertical tolerance.
function underPointer(r, tol) {
  const [ax, ay] = anchor(r)
  const end = r.n ? r.pos[r.n - 1] + r.w[r.n - 1] : 0
  return (
    Math.abs(ay - pointer.y) < tol &&
    pointer.x > ax - 10 &&
    pointer.x < ax + end + 12
  )
}

// Hover follows the pointer, not the stream: a thread opens only when the
// cursor moves onto it, and stays open while it is still underneath. Threads
// that float under a resting cursor are left alone.
function updateHovered() {
  if (!pointer.on || performance.now() - pointer.at > 6000) {
    hovered = null
    return
  }
  if (pointer.moved) {
    pointer.moved = false
    // Half a pitch each way, so the gaps between threads count too.
    let best = PITCH / 2 + 0.5
    hovered = null
    for (const r of rows) {
      const dy = Math.abs(anchor(r)[1] - pointer.y)
      if (dy < best && underPointer(r, best)) {
        best = dy
        hovered = r
      }
    }
  } else if (
    hovered &&
    (!rows.includes(hovered) || !underPointer(hovered, PITCH / 2 + 2))
  ) {
    hovered = null
  }
}

function draw(now, dt) {
  ctx.clearRect(0, 0, W, H)
  updateHovered()
  let pulse = 0
  ctx.lineCap = "butt"

  if ((hovered !== null) !== cursorOn) {
    cursorOn = hovered !== null
    document.body.style.cursor = cursorOn ? "pointer" : ""
  }
  // Hovered and pinned threads open, and so does every thread they refer to.
  const wanted = new Set()
  for (const r of rows) {
    if (r !== hovered && !r.pinned) continue
    wanted.add(r)
    for (const ref of r.refs) wanted.add(ref.row)
  }
  for (const r of rows) {
    const target = wanted.has(r) ? 1 : 0
    r.open += (target - r.open) * Math.min(1, dt * OPEN_SPEED)
    if (r.open < 0.005) r.open = 0
  }

  // Each row as a hairline across the whole page, swept out from the spring
  // dot while the thread launches, then resting faint.
  const dotX = src.x - 5
  for (const r of rows) {
    const y = Math.round(src.y - r.dy)
    if (y < -2 || y > H + 2) continue
    const e = launched(r, now)
    const reach = W * e
    const x0 = Math.max(0, dotX - reach)
    const x1 = Math.min(W, dotX + reach)
    ctx.fillStyle = rgba(SOLID[0], 0.035 + (1 - e) * 0.09)
    ctx.fillRect(x0, y, x1 - x0, 1)
  }

  // Lifted threads are drawn last so they sit on top of their neighbours.
  const lifted = []
  for (const r of rows) {
    if (r.open > 0) lifted.push(r)
    else pulse = Math.max(pulse, drawRow(r, now))
  }
  // Arcs go under every lifted thread so they never cross a chip.
  for (const r of lifted) {
    if (r === hovered || r.pinned) {
      drawReferences(r, r.open * Math.min(1, (Ly - r.dy) / 80), now)
    }
  }
  for (const r of lifted) pulse = Math.max(pulse, drawRow(r, now))

  // The spring dot, just right of the name, swells on every launch.
  ctx.fillStyle = rgba(HIGHLIGHT, 0.75 + pulse * 0.25)
  ctx.beginPath()
  ctx.arc(src.x - 5, Math.round(src.y), 2.4 + pulse * 2, 0, Math.PI * 2)
  ctx.fill()
}

// Copy and text widths for a thread, measured once each.
function ensureLabels(r) {
  ctx.font = FONT
  if (!r.label) {
    r.label = []
    r.lw = []
    r.storyW = r.story.map((t) => ctx.measureText(t).width)
  }
  for (let j = r.label.length; j < r.n; j++) {
    const text =
      OUTCOMES[
        Math.floor((r.seed[j] + 0.5) * OUTCOMES.length) % OUTCOMES.length
      ]
    r.label[j] = text
    r.lw[j] = ctx.measureText(text).width
  }
}

// The blocks a thread is drawn as: its body segments, the settled tail
// messages and the messages still gliding in. As the thread opens, the same
// blocks spread out from the anchor as chips wide enough for their copy, so
// the first few stay on screen and the rest push off to the right.
function layout(r, now) {
  const [px, py] = anchor(r, now)
  const hl = r.open
  const fz = 1 + 0.4 * hl
  const ax = Math.round(px)
  const ay = Math.round(py) - Math.round(6 * hl)
  let recent = 0
  while (recent < r.n && now - r.born[r.n - 1 - recent] < FLOAT_IN) recent++
  const settled = r.n - recent
  const len = settled > 0 ? r.pos[settled - 1] + r.w[settled - 1] : 0
  ensureLabels(r)
  const pad = Math.round(7 * fz)
  const gap = Math.round(2 * fz)
  const blocks = []
  let chipX = 0
  const push = (p0, p1, band, label, lw, j) => {
    const cw = Math.round(lw * fz + pad * 2)
    blocks.push({
      p0,
      band,
      label,
      lw: lw * fz,
      j,
      x: ax + p0 * (1 - hl) + chipX * hl,
      w: (p1 - p0) * (1 - hl) + cw * hl,
    })
    chipX += cw + gap
  }
  for (let s = 0; s < 4; s++) {
    const from = SEGMENTS[s]
    const to = Math.min(SEGMENTS[s + 1], len)
    if (to <= from) break
    push(from, to, s, r.story[s], r.storyW[s], -1)
  }
  for (let j = 0; j < r.n; j++) {
    const p = r.pos[j]
    if (j < settled && p < 160) continue
    push(p, p + r.w[j], p < 240 ? 4 : 5, r.label[j], r.lw[j], j)
  }
  return { ax, ay, fz, pad, settled, blocks }
}

// One of a layout's body blocks, or the last one that exists.
function bodyBlock(L, seg) {
  let b = null
  for (const c of L.blocks) {
    if (c.j !== -1) break
    b = c
    if (seg-- === 0) break
  }
  return b
}

// One thread. Returns the launch glint strength for the spring dot.
function drawRow(r, now) {
  const [px, py] = anchor(r, now)
  const ax = Math.round(px)
  const ay0 = Math.round(py)
  if (ay0 < -10 || ay0 > H + 10) return 0
  const launch = launched(r, now)

  let recent = 0
  while (recent < r.n && now - r.born[r.n - 1 - recent] < FLOAT_IN) recent++
  const settled = r.n - recent
  const len = settled > 0 ? r.pos[settled - 1] + r.w[settled - 1] : 0
  const alpha =
    BASE_ALPHA * (0.22 + 0.78 * Math.min(1, r.t * 2.5)) * (0.4 + 0.6 * launch)
  const hl = r.open
  // A lifted thread is drawn bigger, raised, and with a soft shadow.
  const sc = 1 + 2 * hl
  const fz = 1 + 0.4 * hl
  const T = THICK * sc
  const ay = ay0 - Math.round(6 * hl)
  if (hl > 0) {
    ctx.shadowColor = rgba(SOLID[0], 0.3 * hl)
    ctx.shadowBlur = 24 * hl
    ctx.shadowOffsetY = 8 * hl
  }

  if (hl < 0.02) {
    // Solid body, in colour bands by distance from the anchor.
    ctx.lineWidth = T
    for (let s = 0; s < 4; s++) {
      const from = SEGMENTS[s]
      const to = Math.min(SEGMENTS[s + 1], len)
      if (to <= from) break
      ctx.strokeStyle = rgba(SOLID[s], alpha)
      ctx.beginPath()
      ctx.moveTo(ax + from, ay)
      ctx.lineTo(ax + to, ay)
      ctx.stroke()
    }

    // Message tail: one block per message with a fixed gap.
    for (let j = 0; j < settled; j++) {
      const p = r.pos[j]
      if (p < 160) continue
      ctx.fillStyle = rgba(p < 240 ? TAIL_NEAR : TAIL_FAR, alpha * 0.9)
      ctx.fillRect(ax + p, ay - T / 2, r.w[j], T)
    }

    // Messages still floating in from the right.
    for (let j = settled; j < r.n; j++) {
      const k = Math.min(1, (now - r.born[j]) / FLOAT_IN)
      const e = 1 - Math.pow(1 - k, 3)
      const dist = (70 + r.seed[j] * 50) * (1 - e)
      const x = ax + r.pos[j] + dist
      const y = ay + r.seed[(j * 7 + 3) % MAX_MESSAGES] * 14 * (1 - e)
      ctx.fillStyle = rgba(ARRIVING, alpha * (0.25 + 0.75 * e))
      ctx.fillRect(Math.round(x), Math.round(y) - T / 2, r.w[j], T)
    }
  } else {
    // Lifted: the thread's blocks spread into chips that carry its copy.
    const L = layout(r, now)
    ctx.font = `${(10 * L.fz).toFixed(1)}px ${FONT_FAMILY}`
    ctx.textBaseline = "middle"
    const textA = Math.max(0, (hl - 0.5) / 0.5)
    for (const b of L.blocks) {
      if (b.x > W) break
      const base =
        b.band < 4 ? SOLID[b.band] : b.band === 4 ? TAIL_NEAR : TAIL_FAR
      let x = b.x
      let y = ay
      let a = alpha
      let c = base
      if (b.j >= settled) {
        const k = Math.min(1, (now - r.born[b.j]) / FLOAT_IN)
        const e = 1 - Math.pow(1 - k, 3)
        x += (70 + r.seed[b.j] * 50) * (1 - e)
        y += r.seed[(b.j * 7 + 3) % MAX_MESSAGES] * 14 * (1 - e)
        a *= 0.25 + 0.75 * e
        c = mix(ARRIVING, base, e)
      }
      x = Math.round(x)
      y = Math.round(y)
      ctx.fillStyle = rgba(c, a)
      ctx.fillRect(x, y - T / 2, b.w, T)
      if (textA > 0 && b.w > b.lw + 6) {
        ctx.fillStyle = rgba(b.band < 3 ? CREAM : SOLID[0], a * textA)
        ctx.fillText(b.label, x + L.pad, y + 1)
      }
    }
  }

  // Anchor tick at the thread's start.
  ctx.strokeStyle = rgba(SOLID[0], alpha * 0.8)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ax + 1, ay - T)
  ctx.lineTo(ax + 1, ay + T / 2)
  ctx.stroke()
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Launch glint: the new thread glows gold from the spring dot outward,
  // with a short streak running ahead of its end, then fades.
  if (launch < 1) {
    const g = 1 - launch
    const end = r.n ? r.pos[r.n - 1] + r.w[r.n - 1] : 0
    ctx.strokeStyle = rgba(HIGHLIGHT, g * 0.7)
    ctx.lineWidth = THICK
    ctx.beginPath()
    ctx.moveTo(src.x - 4, ay)
    ctx.lineTo(ax + end, ay)
    ctx.stroke()
    ctx.strokeStyle = rgba(HIGHLIGHT, g * 0.8)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(ax + end, ay)
    ctx.lineTo(ax + end + 24 * g + 6, ay)
    ctx.stroke()
    return g
  }
  return 0
}

// Cross-reference arcs from a thread's blocks to blocks of the threads it
// refers to, in the colour of the block they leave from.
function drawReferences(r, fade, now) {
  const Lr = layout(r, now)
  ctx.lineWidth = 2
  for (let i = 0; i < r.refs.length; i++) {
    const ref = r.refs[i]
    const o = ref.row
    if (o === r || !rows.includes(o)) continue
    // Both ends sit on body blocks, so the arc always lands on the chips
    // that stay on screen when the threads open.
    const Lo = layout(o, now)
    const a = bodyBlock(Lr, (ref.seg + (i ? 1 : 3)) % 4)
    const b = bodyBlock(Lo, ref.seg)
    if (!a || !b) continue
    const c = SOLID[a.band]
    // Leave from the chip edges that face each other.
    const ha = (THICK * (1 + 2 * r.open)) / 2
    const hb = (THICK * (1 + 2 * o.open)) / 2
    const up = Lo.ay < Lr.ay
    const ax = Math.round(a.x + a.w / 2)
    const ay = Lr.ay + (up ? -ha : ha)
    const bx = Math.round(b.x + b.w / 2)
    const by = Lo.ay + (up ? hb : -hb)
    ctx.strokeStyle = rgba(c, 0.9 * fade)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.quadraticCurveTo(
      (ax + bx) / 2 + (by - ay) * 0.3,
      (ay + by) / 2 - (bx - ax) * 0.3,
      bx,
      by,
    )
    ctx.stroke()
    ctx.fillStyle = rgba(c, 0.95 * fade)
    ctx.beginPath()
    ctx.arc(bx, by, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ax, ay, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Fill the page as if the stream had been running all along.
function seed() {
  rows.length = 0
  spawnAcc = 0
  const total = Math.min(240, Math.ceil(Ly / speed) + 6)
  for (let t = -total; t < 0; t += 0.05) step(t, 0.05)
}

let last = 0
function frame(ms) {
  const now = ms / 1000
  const dt = last ? Math.min(0.05, now - last) : 1 / 60
  last = now
  geometry()
  step(now, dt)
  draw(now, dt)
  requestAnimationFrame(frame)
}

function onPointer(e) {
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.on = true
  pointer.at = performance.now()
  pointer.moved = true
}

// Click a thread to keep it open (one at a time); it still rises and fades
// out with the thread. Clicking it again, or elsewhere, lets it go.
function onClick(e) {
  if (e.target.closest("a, button")) return
  onPointer(e)
  updateHovered()
  const r = hovered
  const pin = r !== null && !r.pinned
  for (const x of rows) x.pinned = false
  if (pin) r.pinned = true
}

resize()
geometry()
seed()

if (reduced) {
  draw(0, 0)
} else {
  addEventListener("pointermove", onPointer, { passive: true })
  addEventListener("pointerdown", onClick, { passive: true })
  document.addEventListener("mouseleave", () => (pointer.on = false))
  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  resize()
  geometry()
  seed()
  if (reduced) draw(0, 0)
})
