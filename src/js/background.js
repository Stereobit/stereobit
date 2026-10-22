// Background: threads spring from a dot beside the name in the footer and
// float straight up, one row pitch apart, while messages are appended to
// their right end. Moving the cursor onto a thread opens it: its blocks
// spread into labelled chips, the threads it refers to open with it, and
// arcs join them. A click keeps one thread open until it fades out at the top.

const canvas = document.getElementById("bg")
const spring = document.getElementById("spring")
const ctx = canvas.getContext("2d")
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches

// Geometry.
const THICK = 8 // thread thickness at rest
const PITCH = 13 // vertical distance between threads
const SEGMENTS = [0, 16, 40, 110, 160] // body colour bands, px from anchor
const TAIL_SPLIT = 240 // tail blocks beyond this are the far colour
const MAX_MESSAGES = 320

// Timing, in seconds.
const FLOAT_IN = 1.5 // a new message glides in from the right
const LAUNCH = 0.9 // a new thread slides out of the spring dot
const OPEN_SPEED = 7 // how fast a thread opens and closes
const POINTER_IDLE = 6 // hover is dropped after the pointer rests this long

// Opening: thickness, text and lift grow with r.open in [0, 1].
const OPEN_SCALE = 2 // extra thickness when fully open
const OPEN_FONT = 0.4 // extra text size when fully open
const OPEN_LIFT = 6 // px raised when fully open
const FONT_FAMILY = "ui-monospace, Menlo, Consolas, monospace"

// Colours. Body bands run navy, teal, gold, light gold; the tail is sand then
// pale lavender. Arriving messages start grey-blue and settle into their band.
const BANDS = [
  [30, 58, 76],
  [52, 96, 112],
  [183, 121, 31],
  [222, 178, 96],
  [216, 200, 168],
  [200, 204, 218],
]
const NAVY = BANDS[0]
const GOLD = BANDS[2]
const ARRIVING = [168, 176, 200]
const CREAM = [244, 243, 239]
const BASE_ALPHA = 0.8

// Copy for an open thread. The body blocks tell one task's story in order:
// the task, where it looked, how it reasoned, how it checked. Tail blocks
// are outcomes.
const STORY = [
  [
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
  ],
  [
    "read ledger",
    "fetch records",
    "load policy",
    "pull evidence",
    "query history",
    "open spec",
    "scan logs",
    "ask registry",
  ],
  [
    "compare 3 rows",
    "plan 4 steps",
    "derive total",
    "infer scope",
    "draft decision",
    "trace cause",
    "weigh 2 options",
    "simulate change",
  ],
  [
    "verify sums",
    "cross-check",
    "test 12/12",
    "cite sources",
    "check limits",
    "second opinion",
    "replay diff",
    "sign off",
  ],
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

// State.
let W = 0
let H = 0
let Lx = 0 // horizontal reach of the thread curve
let Ly = 0 // height a thread rises before it is gone
let speed = 0 // px per second upwards
const src = { x: 0, y: 0 } // where threads start, beside the footer name
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
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const easeOut = (k) => 1 - Math.pow(1 - k, 3)

function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1)
  W = innerWidth
  H = innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  speed = Math.max(H, 200) / 48
}

// The spring point follows the footer name, so threads scroll with the page.
function geometry() {
  const r = spring.getBoundingClientRect()
  if (r.width) {
    src.x = Math.round(r.right + 14)
    src.y = r.top + r.height * 0.55
  } else {
    src.x = Math.min(W * 0.04, 60)
    src.y = H * 0.95
  }
  Lx = (W - src.x) * 0.55
  Ly = Math.max(H * 0.9, src.y + (scrollY || 0) + 60)
}

// --- Threads ---------------------------------------------------------------

// Launch progress: 0 while still at the spring dot, 1 once fully out.
const launched = (r, now) => easeOut(Math.min(1, (now - r.start) / LAUNCH))

// Anchor (left end) of a thread. Without `now` the launch slide is ignored.
function anchor(r, now) {
  const e = now === undefined ? 1 : launched(r, now)
  return [src.x + Lx * Math.pow(r.t, 0.7) - 16 * (1 - e), src.y - r.dy]
}

function addMessage(r, now) {
  const n = r.n
  if (n >= MAX_MESSAGES) return
  if (n && r.pos[n - 1] > Math.min(520, W * 0.5)) return
  r.w[n] = 3 + Math.round(Math.random() * 3)
  r.pos[n] = n ? r.pos[n - 1] + r.w[n - 1] + 2 : 0
  r.born[n] = now
  r.n = n + 1
}

function spawn(now) {
  const r = {
    dy: 0, // distance risen
    t: 0, // 0..1 progress along the curve
    n: 0, // message count
    w: new Float32Array(MAX_MESSAGES), // message widths
    pos: new Float32Array(MAX_MESSAGES), // message offsets from the anchor
    born: new Float32Array(MAX_MESSAGES), // arrival times
    seed: new Float32Array(MAX_MESSAGES), // per-message randomness, -0.5..0.5
    rate: 1.1 + Math.random() * 1.4, // messages per second, roughly
    next: 0.12, // seconds until the next message
    burst: 3 + Math.floor(Math.random() * 3), // first messages come together
    start: now,
    story: STORY.map(pick),
    refs: [], // { row, seg }: threads this one refers to, by body block
    open: 0, // 0 closed .. 1 open
    pinned: false,
  }
  for (let i = 0; i < MAX_MESSAGES; i++) r.seed[i] = Math.random() - 0.5
  addMessage(r, now)
  if (rows.length > 4) {
    for (let i = 0; i < 2; i++) {
      r.refs.push({ row: pick(rows), seg: Math.floor(Math.random() * 4) })
    }
  }
  rows.push(r)
  return r
}

function step(now, dt) {
  // Spawning is tied to the rise speed so threads sit exactly PITCH apart.
  spawnAcc += (dt * speed) / PITCH
  while (spawnAcc > 1) {
    spawnAcc--
    spawn(now).dy = spawnAcc * PITCH
  }
  const lengthScale = Math.min(1, (H * 0.9) / Ly)
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]
    r.dy += dt * speed
    r.t = Math.pow(Math.max(0, r.dy / Ly), 1 / 2.7)
    if (r.dy > Ly + 20) {
      rows.splice(i, 1)
      continue
    }
    r.next -= dt
    while (r.next <= 0) {
      addMessage(r, now)
      if (r.burst > 0) {
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

// --- Hover -----------------------------------------------------------------

function underPointer(r, tol) {
  const [ax, ay] = anchor(r)
  const end = r.n ? r.pos[r.n - 1] + r.w[r.n - 1] : 0
  return (
    Math.abs(ay - pointer.y) < tol &&
    pointer.x > ax - 10 &&
    pointer.x < ax + end + 12
  )
}

// Hover follows the pointer, not the stream: a thread is picked only when the
// cursor moves, and stays hovered while it is still underneath. Threads that
// float under a resting cursor are left alone. The pick reaches half a pitch
// each way, so the gaps between threads count too.
function updateHovered() {
  if (!pointer.on || performance.now() - pointer.at > POINTER_IDLE * 1000) {
    hovered = null
  } else if (pointer.moved) {
    pointer.moved = false
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

// --- Blocks ----------------------------------------------------------------

// Copy and text widths for a thread, measured once each.
function ensureLabels(r) {
  ctx.font = `10px ${FONT_FAMILY}`
  if (!r.label) {
    r.label = []
    r.lw = []
    r.storyW = r.story.map((t) => ctx.measureText(t).width)
  }
  for (let j = r.label.length; j < r.n; j++) {
    const i = Math.floor((r.seed[j] + 0.5) * OUTCOMES.length) % OUTCOMES.length
    r.label[j] = OUTCOMES[i]
    r.lw[j] = ctx.measureText(OUTCOMES[i]).width
  }
}

// Per-thread drawing metrics, in a shared scratch object.
const m = { ax: 0, ay: 0, open: 0, fz: 1, pad: 7, gap: 2, settled: 0, len: 0 }
function measure(r, now) {
  const [px, py] = anchor(r, now)
  m.open = r.open
  m.fz = 1 + OPEN_FONT * m.open
  m.ax = Math.round(px)
  m.ay = Math.round(py) - Math.round(OPEN_LIFT * m.open)
  m.pad = Math.round(7 * m.fz)
  m.gap = Math.round(2 * m.fz)
  let settled = r.n
  while (settled > 0 && now - r.born[settled - 1] < FLOAT_IN) settled--
  m.settled = settled
  m.len = settled ? r.pos[settled - 1] + r.w[settled - 1] : 0
  return m
}

// Walk the blocks a thread is drawn as: its body segments, the settled tail
// messages, then the messages still gliding in. As the thread opens, the same
// blocks spread out from the anchor as chips wide enough for their copy, so
// the first few stay on screen and the rest push off to the right.
// fn(x, w, band, j, label, textWidth) is called per block; j is the message
// index, or -1 for a body segment. Returning false stops the walk.
function eachBlock(r, now, fn) {
  measure(r, now)
  const { ax, open, fz, pad, gap, settled, len } = m
  if (open > 0) ensureLabels(r)
  let chipX = 0
  const emit = (p0, p1, band, j, label, lw) => {
    const chip = Math.round(lw * fz + pad * 2)
    const x = ax + p0 * (1 - open) + chipX * open
    const w = (p1 - p0) * (1 - open) + chip * open
    chipX += chip + gap
    return fn(x, w, band, j, label, lw * fz)
  }
  for (let s = 0; s < 4; s++) {
    const to = Math.min(SEGMENTS[s + 1], len)
    if (to <= SEGMENTS[s]) break
    const label = open > 0 ? r.story[s] : ""
    const lw = open > 0 ? r.storyW[s] : 0
    if (emit(SEGMENTS[s], to, s, -1, label, lw) === false) return
  }
  for (let j = 0; j < r.n; j++) {
    const p = r.pos[j]
    if (j < settled && p < SEGMENTS[4]) continue
    const band = p < TAIL_SPLIT ? 4 : 5
    const label = open > 0 ? r.label[j] : ""
    const lw = open > 0 ? r.lw[j] : 0
    if (emit(p, p + r.w[j], band, j, label, lw) === false) return
  }
}

// Centre x, y and band of a thread's seg-th body block (or its last one).
function bodyBlock(r, now, seg) {
  let hit = null
  eachBlock(r, now, (x, w, band, j) => {
    if (j !== -1) return false
    hit = [x + w / 2, m.ay, band]
    return seg-- > 0
  })
  return hit
}

// --- Drawing ---------------------------------------------------------------

function draw(now, dt) {
  ctx.clearRect(0, 0, W, H)
  ctx.lineCap = "butt"
  updateHovered()
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
    const x0 = Math.max(0, dotX - W * e)
    const x1 = Math.min(W, dotX + W * e)
    ctx.fillStyle = rgba(NAVY, 0.035 + (1 - e) * 0.09)
    ctx.fillRect(x0, y, x1 - x0, 1)
  }

  // Open threads are drawn last so they sit on top; their arcs go underneath
  // all of them so an arc never crosses a chip.
  let pulse = 0
  const open = []
  for (const r of rows) {
    if (r.open > 0) open.push(r)
    else pulse = Math.max(pulse, drawThread(r, now))
  }
  for (const r of open) {
    if (r === hovered || r.pinned) drawReferences(r, now)
  }
  for (const r of open) pulse = Math.max(pulse, drawThread(r, now))

  // The spring dot, just right of the name, swells on every launch.
  ctx.fillStyle = rgba(GOLD, 0.75 + pulse * 0.25)
  ctx.beginPath()
  ctx.arc(dotX, Math.round(src.y), 2.4 + pulse * 2, 0, Math.PI * 2)
  ctx.fill()
}

// One thread. Returns the launch glint strength for the spring dot.
function drawThread(r, now) {
  const { ax, ay, open, fz, pad, settled } = measure(r, now)
  if (ay < -16 || ay > H + 10) return 0
  const launch = launched(r, now)
  const alpha =
    BASE_ALPHA * (0.22 + 0.78 * Math.min(1, r.t * 2.5)) * (0.4 + 0.6 * launch)
  const T = THICK * (1 + OPEN_SCALE * open)
  const textAlpha = Math.max(0, (open - 0.5) / 0.5)

  if (open > 0) {
    ctx.shadowColor = rgba(NAVY, 0.3 * open)
    ctx.shadowBlur = 24 * open
    ctx.shadowOffsetY = 8 * open
    ctx.font = `${(10 * fz).toFixed(1)}px ${FONT_FAMILY}`
    ctx.textBaseline = "middle"
  }

  eachBlock(r, now, (x, w, band, j, label, lw) => {
    if (x > W) return false
    const base = BANDS[band]
    let y = ay
    let a = band < 4 ? alpha : alpha * 0.9
    let c = base
    if (j >= settled) {
      // Still gliding in from the right, settling into its band colour.
      const e = easeOut(Math.min(1, (now - r.born[j]) / FLOAT_IN))
      x += (70 + r.seed[j] * 50) * (1 - e)
      y += r.seed[(j * 7 + 3) % MAX_MESSAGES] * 14 * (1 - e)
      a *= 0.25 + 0.75 * e
      c = mix(ARRIVING, base, e)
    }
    x = Math.round(x)
    y = Math.round(y)
    ctx.fillStyle = rgba(c, a)
    ctx.fillRect(x, y - T / 2, w, T)
    if (textAlpha > 0 && w > lw + 6) {
      ctx.fillStyle = rgba(band < 3 ? CREAM : NAVY, a * textAlpha)
      ctx.fillText(label, x + pad, y + 1)
    }
  })

  // Anchor tick at the thread's start.
  ctx.strokeStyle = rgba(NAVY, alpha * 0.8)
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
  if (launch >= 1) return 0
  const g = 1 - launch
  const end = ax + (r.n ? r.pos[r.n - 1] + r.w[r.n - 1] : 0)
  ctx.strokeStyle = rgba(GOLD, g * 0.7)
  ctx.lineWidth = THICK
  ctx.beginPath()
  ctx.moveTo(src.x - 4, ay)
  ctx.lineTo(end, ay)
  ctx.stroke()
  ctx.strokeStyle = rgba(GOLD, g * 0.8)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(end, ay)
  ctx.lineTo(end + 24 * g + 6, ay)
  ctx.stroke()
  return g
}

// Arcs from a thread's body blocks to body blocks of the threads it refers
// to, in the colour of the block they leave from, between the facing edges.
function drawReferences(r, now) {
  const fade = r.open * Math.min(1, (Ly - r.dy) / 80)
  ctx.lineWidth = 2
  r.refs.forEach((ref, i) => {
    const o = ref.row
    if (o === r || !rows.includes(o)) return
    const a = bodyBlock(r, now, (ref.seg + (i ? 1 : 3)) % 4)
    const b = bodyBlock(o, now, ref.seg)
    if (!a || !b) return
    const up = b[1] < a[1]
    const ha = (THICK * (1 + OPEN_SCALE * r.open)) / 2
    const hb = (THICK * (1 + OPEN_SCALE * o.open)) / 2
    const ax = Math.round(a[0])
    const ay = a[1] + (up ? -ha : ha)
    const bx = Math.round(b[0])
    const by = b[1] + (up ? hb : -hb)
    const c = BANDS[a[2]]
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
    for (const [x, y] of [
      [ax, ay],
      [bx, by],
    ]) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

// --- Lifecycle -------------------------------------------------------------

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

// Click a thread to keep it open, one at a time; it still rises and fades
// out. Clicking it again, or empty space, lets it go.
function onClick(e) {
  if (e.target.closest("a, button")) return
  onPointer(e)
  updateHovered()
  const pin = hovered !== null && !hovered.pinned
  for (const r of rows) r.pinned = false
  if (pin) hovered.pinned = true
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
