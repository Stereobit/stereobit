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

let W = 0
let H = 0
let Lx = 0
let Ly = 0
let speed = 0
const src = { x: 0, y: 0, left: 0, width: 0 }
const rows = []
let spawnAcc = 0
const pointer = { x: -1e4, y: -1e4, on: false, at: 0 }

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

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
    src.x = Math.round(r.right + 8)
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
  }
  for (let i = 0; i < MAX_MESSAGES; i++) r.seed[i] = Math.random() - 0.5
  addMessage(r, now)
  if (rows.length > 4) {
    for (let i = 0; i < 2; i++) {
      r.refs.push({
        row: rows[Math.floor(Math.random() * rows.length)],
        index: Math.floor(Math.random() * 40),
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
        r.next +=
          (0.85 + Math.random() * 0.3) /
          (r.rate * (0.5 + 0.8 * r.t) * lengthScale)
      }
    }
  }
}

function findHovered() {
  if (!pointer.on || performance.now() - pointer.at > 6000) return null
  let best = 6
  let hit = null
  for (const r of rows) {
    const [ax, ay] = anchor(r)
    const dy = Math.abs(ay - pointer.y)
    const end = r.n ? r.pos[r.n - 1] + r.w[r.n - 1] : 0
    if (dy < best && pointer.x > ax - 10 && pointer.x < ax + end + 12) {
      best = dy
      hit = r
    }
  }
  return hit
}

function draw(now) {
  ctx.clearRect(0, 0, W, H)
  const hovered = findHovered()
  let pulse = 0
  ctx.lineCap = "butt"

  for (const r of rows) {
    const [px, py] = anchor(r, now)
    const ax = Math.round(px)
    const ay = Math.round(py)
    if (ay < -10 || ay > H + 10) continue
    const launch = launched(r, now)

    let recent = 0
    while (recent < r.n && now - r.born[r.n - 1 - recent] < FLOAT_IN) recent++
    const settled = r.n - recent
    const len = settled > 0 ? r.pos[settled - 1] + r.w[settled - 1] : 0
    const alpha =
      BASE_ALPHA * (0.22 + 0.78 * Math.min(1, r.t * 2.5)) * (0.4 + 0.6 * launch)
    const isHovered = r === hovered

    // Solid body, in colour bands by distance from the anchor.
    ctx.lineWidth = isHovered ? THICK + 2 : THICK
    for (let s = 0; s < 4; s++) {
      const from = SEGMENTS[s]
      const to = Math.min(SEGMENTS[s + 1], len)
      if (to <= from) break
      ctx.strokeStyle = rgba(isHovered ? HIGHLIGHT : SOLID[s], alpha)
      ctx.beginPath()
      ctx.moveTo(ax + from, ay)
      ctx.lineTo(ax + to, ay)
      ctx.stroke()
    }

    // Message tail: one block per message with a fixed gap.
    for (let j = 0; j < settled; j++) {
      const p = r.pos[j]
      if (p < 160) continue
      const c = isHovered ? HIGHLIGHT : p < 240 ? TAIL_NEAR : TAIL_FAR
      ctx.fillStyle = rgba(c, alpha * 0.9)
      ctx.fillRect(ax + p, ay - THICK / 2, r.w[j], THICK)
    }

    // Messages still floating in from the right.
    for (let j = settled; j < r.n; j++) {
      const k = Math.min(1, (now - r.born[j]) / FLOAT_IN)
      const e = 1 - Math.pow(1 - k, 3)
      const dist = (70 + r.seed[j] * 50) * (1 - e)
      const x = ax + r.pos[j] + dist
      const y = ay + r.seed[(j * 7 + 3) % MAX_MESSAGES] * 14 * (1 - e)
      ctx.fillStyle = rgba(
        isHovered ? HIGHLIGHT : ARRIVING,
        alpha * (0.25 + 0.75 * e),
      )
      ctx.fillRect(Math.round(x), Math.round(y) - THICK / 2, r.w[j], THICK)
    }

    // Anchor tick at the thread's start.
    ctx.strokeStyle = rgba(isHovered ? HIGHLIGHT : SOLID[0], alpha * 0.8)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(ax + 1, ay - THICK)
    ctx.lineTo(ax + 1, ay + THICK / 2)
    ctx.stroke()

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
      pulse = Math.max(pulse, g)
    }
  }

  // The spring dot, just right of the name, swells on every launch.
  ctx.fillStyle = rgba(HIGHLIGHT, 0.75 + pulse * 0.25)
  ctx.beginPath()
  ctx.arc(src.x - 5, Math.round(src.y), 2.4 + pulse * 2, 0, Math.PI * 2)
  ctx.fill()

  if (hovered) drawReferences(hovered)
}

function drawReferences(r) {
  const [hx, hy] = anchor(r)
  const ay = Math.round(hy)
  ctx.lineWidth = 1
  for (let i = 0; i < r.refs.length; i++) {
    const ref = r.refs[i]
    const o = ref.row
    if (o === r || !rows.includes(o)) continue
    const oi = Math.min(ref.index, o.n - 1)
    const hi = Math.min(ref.index + (i ? 9 : -9), r.n - 1)
    if (oi < 0 || hi < 0) continue
    const [ox, oy] = anchor(o)
    const ax = hx + r.pos[hi]
    const bx = ox + o.pos[oi]
    const by = Math.round(oy)
    ctx.strokeStyle = rgba(HIGHLIGHT, 0.85)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.quadraticCurveTo(
      (ax + bx) / 2 + (by - ay) * 0.3,
      (ay + by) / 2 - (bx - ax) * 0.3,
      bx,
      by,
    )
    ctx.stroke()
    ctx.fillStyle = rgba(HIGHLIGHT, 0.9)
    ctx.beginPath()
    ctx.arc(bx, by, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ax, ay, 2.4, 0, Math.PI * 2)
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
  draw(now)
  requestAnimationFrame(frame)
}

function onPointer(e) {
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.on = true
  pointer.at = performance.now()
}

resize()
geometry()
seed()

if (reduced) {
  draw(0)
} else {
  addEventListener("pointermove", onPointer, { passive: true })
  addEventListener("pointerdown", onPointer, { passive: true })
  document.addEventListener("mouseleave", () => (pointer.on = false))
  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  resize()
  geometry()
  seed()
  if (reduced) draw(0)
})
