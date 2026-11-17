import { GLYPHS } from './glyphs'
// The Moka board: the pinboard's cork, pinned with the scraps of a day at a
// visitor site (ticket, phone scanner, open sign, postcard). Pinboard: along both edges of the
// window, under a string of small lights. By day the lights are unlit; at
// night a lamp warms the board and the lights glow. While Claude works the
// lights come on and run along the string.
//
// One SVG for both modes: colors are CSS variables switched by
// prefers-color-scheme. The art keeps to two bands, one pinned to each edge,
// and the conversation sits on a strip of torn paper in the middle.

const W = 1600
const H = 1000
// The width of each edge band, in the board's units.
const BAND = 540

export type Live = {
  /** Claude is working on a turn. */
  isBusy: boolean
  /** Seconds since the epoch, so a redraw resumes the motion where it was. */
  seconds: number
  /** The same instant on the wall clock: seconds since the epoch, shifted by the local offset. */
  localSeconds: number
}

const random = (seed: number) => {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r1 = (v: number) => Math.round(v * 10) / 10

// Pinboard's own pens (fontkit/): a ballpoint for notes, a chisel marker for
// the sticky note, the polaroid and the tag, a typewriter for printed paper.
// The desktop won't load a font inside a backdrop, so each label is drawn as
// outlines: every letter once in <defs>, placed with <use> at the font's own
// advances and kerning. GLYPHS is in units of 1/200 em, y down.
const UNIT = 200
/** Every letter a label asked for, by pen: read by the glyph generator. */
export const USED: Record<'hand' | 'mk' | 'type', string> = { hand: '', mk: '', type: '' }
const TEXT = /<text ([^>]*class="(hand|mk|type)[^"]*"[^>]*)>([^<]+)<\/text>/g

/** The board's labels turned into outlines, and the letters they use. */
export const outline = (svg: string) => {
  const used = new Map<string, string>()
  const body = svg.replace(TEXT, (_, attrs: string, pen: keyof typeof GLYPHS, words: string) => {
    const a = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]))
    const { adv, kern, d } = GLYPHS[pen]
    const scale = Number(a['font-size']) / UNIT
    const track = Number(a['letter-spacing'] ?? 0) / scale
    let x = 0
    const uses: string[] = []
    const chars = [...words]
    USED[pen] += words
    chars.forEach((ch, i) => {
      const path = d[ch]
      if (path) {
        const id = `${pen[0]}${ch.codePointAt(0)!.toString(36)}`
        used.set(id, path)
        uses.push(`<use href="#${id}" x="${r1(x)}"/>`)
      }
      x += (adv[ch] ?? 0) + (kern[ch + (chars[i + 1] ?? '')] ?? 0) + track
    })
    const width = x - track
    const shift = a['text-anchor'] === 'middle' ? -width / 2 : a['text-anchor'] === 'end' ? -width : 0
    const place = `${a.transform ?? ''} translate(${a.x ?? 0} ${a.y ?? 0}) scale(${r1(scale * 1e4) / 1e4})${shift ? ` translate(${r1(shift)} 0)` : ''}`
    const fill = a.fill ? ` fill="${a.fill}"` : ''

    return `<g class="${a.class}"${fill} transform="${place.trim()}">${uses.join('')}</g>`
  })
  const defs = [...used].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('')

  return body.replace('<defs>', `<defs>${defs}`)
}

const LIGHT = {
  cork: '#a87749', g1: '#bf8d5a', g2: '#7a5232', vig: '0.2',
  paper: '#f5ecda', paperEdge: '#e9dcc2', fringe: '#fcf8ee', fiber: '#b89a72', ring: '#8a5a2b', ringOp: '0.13',
  veil: '0', lamp: '0', bulb: '#ffd98f', idle: '1',
}
const DARK = {
  cork: '#a27246', g1: '#b98654', g2: '#734c2e', vig: '0.55',
  paper: '#2b241d', paperEdge: '#231d17', fringe: '#4a3f33', fiber: '#8a7559', ring: '#c79a63', ringOp: '0.1',
  veil: '0.6', lamp: '0.3', bulb: '#ffd98f', idle: '1',
}

const vars = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';')

// Pinned to the edges: the root is sliced, so on narrower windows each band
// moves in by what the slice crops, and fades once it reaches the words.
const EDGES =
  [
    [150, 50], [140, 100], [130, 150], [120, 200], [110, 250], [100, 300],
    [90, 350], [80, 400], [70, 450], [60, 500], [50, 550],
  ]
    .map(([ar, c]) => `@media (max-aspect-ratio:${ar}/100){.L{transform:translateX(${c}px)}.R{transform:translate(${W - BAND - (c ?? 0)}px,0)}}`)
    .join('') +
  `@media (max-aspect-ratio:110/100){.L,.R{opacity:.55}}@media (max-aspect-ratio:75/100){.L,.R{opacity:.35}}`

// ---------- small things ----------

const pin = (x: number, y: number, color: string) =>
  `<g><ellipse cx="${x + 3}" cy="${y + 5}" rx="7" ry="4" fill="#000" opacity=".22"/>` +
  `<circle cx="${x}" cy="${y}" r="8" fill="${color}"/><circle cx="${x}" cy="${y}" r="8" fill="url(#pinShade)"/>` +
  `<circle cx="${x - 2.6}" cy="${y - 2.8}" r="2.4" fill="#fff" opacity=".75"/></g>`

const tape = (x: number, y: number, w: number, h: number, rot: number, color: string, seed: number) => {
  const next = random(seed)
  const edge = (side: number) =>
    Array.from({ length: 7 }, (_, i) => `${r1(side + (next() * 3 - 1.5) * (side === 0 ? -1 : 1))},${r1((h * i) / 6)}`)
  const points = [...edge(0), ...edge(w).reverse()].join(' ')

  return `<g transform="translate(${x} ${y}) rotate(${rot})"><polygon points="${points}" fill="${color}" opacity=".76"/></g>`
}

/** A string of lights sagging from (x0,y0) to (x1,y1) through (cx,cy). */
const lights = (curve: readonly [number, number, number, number, number, number], count: number, seed: number, first: number) => {
  const [x0, y0, cx, cy, x1, y1] = curve
  const next = random(seed)
  let out = `<path class="wire" d="M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}"/>`

  for (let i = 1; i < count; i += 1) {
    const t = i / count
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
    const n = first + i
    out +=
      `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${Math.round(next() * 30 - 15)})">` +
      `<circle class="glow b${n % 4}" style="animation-delay:${r1(-n * 0.19)}s" cy="13" r="24" fill="url(#bulbGlow)"/>` +
      `<rect x="-3" y="-1" width="6" height="6" rx="1" class="cap"/>` +
      `<ellipse class="bulb" cy="12" rx="4.6" ry="7"/></g>`
  }

  return out
}

const fern = () => {
  let s = `<path d="M0 0 Q 60 -10 150 -4 T 300 10" fill="none" stroke="#5b6e3c" stroke-width="2.4"/>`

  for (let i = 0; i < 16; i += 1) {
    const t = i / 16
    const x = r1(12 + t * 280)
    const y = -6 + Math.sin(t * 3) * 6
    const len = 34 * (1 - t * 0.75)
    s +=
      `<ellipse cx="${x}" cy="${r1(y - len / 2)}" rx="${r1(len / 5)}" ry="${r1(len / 2)}" fill="#6e8a4b" transform="rotate(${r1(28 - t * 10)} ${x} ${r1(y)})"/>` +
      `<ellipse cx="${x}" cy="${r1(y + len / 2)}" rx="${r1(len / 5)}" ry="${r1(len / 2)}" fill="#5d7a3e" transform="rotate(${r1(-28 + t * 10)} ${x} ${r1(y)})"/>`
  }

  return s
}

const lavender = () => {
  const next = random(5)
  let s = ''

  for (let k = 0; k < 3; k += 1) {
    const dx = k * 16 - 16
    const lean = k * 10 - 8
    s += `<path d="M${dx} 0 Q ${dx + 6} -120 ${dx + lean} -230" fill="none" stroke="#6f7f55" stroke-width="2"/>`

    for (let i = 0; i < 12; i += 1) {
      const t = 0.55 + (i / 12) * 0.45
      const x = dx + lean * t + Math.sin(t * 3) * 3
      const y = -230 * t
      s +=
        `<ellipse cx="${r1(x - 4)}" cy="${r1(y)}" rx="3.6" ry="5.4" fill="${next() < 0.5 ? '#8a72b8' : '#a28ccc'}"/>` +
        `<ellipse cx="${r1(x + 4)}" cy="${r1(y - 3)}" rx="3.4" ry="5" fill="${next() < 0.5 ? '#7d66ad' : '#9b85c6'}"/>`
    }
  }

  return s
}

// Tourism stamps: a belfry, a lighthouse, a hot-air balloon, a coffee cup.
const STAMPS: readonly (readonly [string, string, string])[] = [
  ['#2f4a6b', 'beffroi', `<path d="M-12 26 V-8 L-16 -8 L0 -30 L16 -8 L12 -8 V26 Z" fill="#f2ead8"/><rect x="-5" y="-2" width="10" height="12" rx="5" fill="#2f4a6b"/><circle cy="-14" r="3.4" fill="#2f4a6b"/><path d="M-26 26 H26" stroke="#f2ead8" stroke-width="2"/>`],
  ['#c9573f', 'phare', `<path d="M-9 26 L-6 -16 H6 L9 26 Z" fill="#f6e3c9"/><path d="M-7.4 6 H7.4 M-8.2 16 H8.2" stroke="#c9573f" stroke-width="4"/><path d="M-8 -16 H8 V-24 H-8 Z M-4 -24 L0 -30 L4 -24" fill="#f6e3c9"/><path d="M8 -20 L26 -28 M8 -20 L26 -12" stroke="#f3d27a" stroke-width="2"/>`],
  ['#e2b45c', 'ballon', `<path d="M0 -30 C-22 -30 -22 0 -6 10 H6 C22 0 22 -30 0 -30 Z" fill="#c9573f"/><path d="M0 -30 C-8 -20 -8 0 -3 10 M0 -30 C8 -20 8 0 3 10" fill="none" stroke="#f6e3c9" stroke-width="2"/><path d="M-5 10 L-4 18 M5 10 L4 18" stroke="#5a3a22" stroke-width="1.4"/><rect x="-5" y="18" width="10" height="8" fill="#5a3a22"/>`],
  ['#5a3a22', 'café', `<path d="M-18 -4 h30 v8 a15 15 0 0 1 -30 0 Z" fill="#f2ead8"/><path d="M12 0 a7 7 0 0 1 0 13" fill="none" stroke="#f2ead8" stroke-width="3"/><path d="M-8 -12 q4 -7 0 -14 M2 -12 q4 -7 0 -14" fill="none" stroke="#e2b45c" stroke-width="2" stroke-linecap="round"/><path d="M-22 22 H18" stroke="#f2ead8" stroke-width="2"/>`],
]

const stamps = (x: number, y: number) => {
  const sheet = STAMPS.map(([bg, name, art], i) => {
    const sx = (i % 2) * 120
    const sy = Math.floor(i / 2) * 142
    const rot = [-4, 3, 5, -2][i] ?? 0

    return (
      `<g transform="translate(${sx} ${sy}) rotate(${rot} 52 62)" filter="url(#sh)"><rect width="104" height="124" fill="#fbf7ee" mask="url(#perf)"/>` +
      `<rect x="9" y="9" width="86" height="88" fill="${bg}"/><g transform="translate(52 53)">${art}</g>` +
      `<text x="52" y="115" text-anchor="middle" class="type" font-size="10.5" fill="#5a5048">${name} · 02</text></g>`
    )
  }).join('')
  const postmark =
    `<g transform="translate(64 40) rotate(-10)" fill="none" stroke="#3a3f55" stroke-width="1.4" opacity=".5"><circle r="28"/><circle r="22"/>` +
    `<path d="M32 -8 q 11 -8 22 0 t 22 0 t 22 0 M32 4 q 11 -8 22 0 t 22 0 t 22 0 M32 16 q 11 -8 22 0 t 22 0 t 22 0"/></g>`

  return `<g transform="translate(${x} ${y})">${sheet}${postmark}</g>`
}

// A small QR code: three finder squares and a fixed scatter of modules.
const qr = (x: number, y: number, size: number, seed: number, cls = 'qr') => {
  const n = 21
  const u = size / n
  const next = random(seed)
  const finder = (fx: number, fy: number) =>
    `<rect x="${r1(fx * u + u / 2)}" y="${r1(fy * u + u / 2)}" width="${r1(6 * u)}" height="${r1(6 * u)}" style="fill:none;stroke:currentColor" stroke-width="${r1(u)}"/>` +
    `<rect x="${r1((fx + 2) * u)}" y="${r1((fy + 2) * u)}" width="${r1(3 * u)}" height="${r1(3 * u)}"/>`
  let d = ''

  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const inFinder = (i < 8 && j < 8) || (i > 12 && j < 8) || (i < 8 && j > 12)
      if (!inFinder && next() < 0.48) d += `M${r1(i * u)} ${r1(j * u)}h${r1(u)}v${r1(u)}h${r1(-u)}z`
    }
  }

  return (
    `<g class="${cls}" transform="translate(${x} ${y})"><path d="${d}"/>` +
    finder(0, 0) + finder(14, 0) + finder(0, 14) + `</g>`
  )
}

// The Moka bean, as an enamel pin: a gold drop split by a cream S.
const BEAN =
  `<clipPath id="beanC"><path id="beanP" d="M-2 -54 C 28 -54 44 -28 42 2 C 40 30 24 50 8 58 C -12 52 -36 32 -42 4 C -46 -26 -30 -54 -2 -54 Z"/></clipPath><use href="#beanP" fill="url(#gold)"/>` +
  `<path d="M50 -30 C 22 -30 10 -16 2 2 C -6 20 -20 30 -50 36" fill="none" class="beanS" stroke-width="10" clip-path="url(#beanC)"/>`

const PERF = (() => {
  let holes = ''

  for (let i = 0; i <= 13; i += 1) holes += `<circle cx="${r1(i * 8)}" cy="0" r="3.2"/><circle cx="${r1(i * 8)}" cy="124" r="3.2"/>`
  for (let i = 0; i <= 15; i += 1) holes += `<circle cx="0" cy="${r1(i * 8.27)}" r="3.2"/><circle cx="104" cy="${r1(i * 8.27)}" r="3.2"/>`

  return `<mask id="perf"><rect width="104" height="124" fill="#fff"/><g fill="#000">${holes}</g></mask>`
})()

const GRAINS = (() => {
  const next = random(7)
  let s = ''

  for (let i = 0; i < 90; i += 1) {
    const x = r1(next() * 160)
    const y = r1(next() * 160)
    const rx = r1(0.8 + next() * 2.2)
    const ry = r1(0.6 + next() * 1.4)
    const a = Math.round(next() * 180)
    s += `<ellipse class="${next() < 0.5 ? 'g1' : 'g2'}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})"/>`
  }

  return s
})()

// A till receipt, its foot torn in zigzags.
const RECEIPT = (() => {
  let foot = ''
  for (let i = 0; i <= 12; i += 1) foot += `L${120 - i * 10} ${i % 2 ? 176 : 170}`
  const row = (y: number, a: string, b: string) =>
    `<text x="10" y="${y}" class="type rcp" font-size="9">${a}</text><text x="110" y="${y}" text-anchor="end" class="type rcp" font-size="9">${b}</text>`

  return (
    `<path d="M0 0 H120 V170 ${foot} Z" class="receipt"/>` +
    `<text x="60" y="22" text-anchor="middle" class="type rcp" font-size="10" letter-spacing="1">CAISSE 1</text>` +
    `<path d="M10 32 H110 M10 112 H110" class="rcpLine"/>` +
    row(50, '2 x adulte', '24,00') + row(68, '1 x enfant', '6,00') + row(86, '1 x café', '2,50') +
    `<text x="10" y="104" class="type rcp" font-size="9">CB</text>` +
    `<text x="10" y="130" class="type rcp" font-size="11">TOTAL</text><text x="110" y="130" text-anchor="end" class="type rcp" font-size="11">32,50</text>` +
    `<text x="60" y="156" text-anchor="middle" class="hand rcpHand" font-size="15">merci !</text>`
  )
})()

// A folded town map: blocks, a river, a dotted walk to a red pin.
const MAP =
  `<rect width="150" height="120" class="map"/><path d="M50 0 V120 M100 0 V120" class="fold"/>` +
  `<path d="M0 84 C 40 70 70 104 150 86" class="river"/>` +
  `<path d="M14 14 h26 v20 h-26z M58 12 h32 v26 h-32z M110 16 h28 v22 h-28z M18 46 h24 v18 h-24z M112 50 h26 v16 h-26z M60 98 h30 v16 h-30z" class="block"/>` +
  `<path d="M24 110 C 40 60 70 70 86 50 S 112 34 118 30" class="walk" stroke-dasharray="3 4"/>` +
  `<path d="M118 30 c-6 -8 -8 -11 -8 -14 a8 8 0 0 1 16 0 c0 3 -2 6 -8 14z" class="mapPin"/><circle cx="118" cy="16" r="3" fill="#fbf7ee"/>` +
  `<text x="128" y="44" class="hand ink" font-size="15">ici</text>`

// An entry wristband, closed in a loop and dropped on the cork.
const WRISTBAND =
  `<ellipse rx="54" ry="24" class="wrist" stroke-width="13"/>` +
  `<ellipse rx="54" ry="24" class="wristLine" stroke-dasharray="2 5"/>` +
  `<rect x="-14" y="14" width="28" height="18" rx="3" class="wristClip"/>` +
  `<text x="0" y="-34" text-anchor="middle" class="type wristInk" font-size="9" letter-spacing="1">PASS 1 JOUR</text>`

// ---------- the counter's pieces ----------

// Wood paneling: plank seams every 80 units, wavy grain between them.
const WOOD = (() => {
  const next = random(7)
  let s = `<path d="M0 0 V160 M80 0 V160" class="seam"/>`

  for (let i = 0; i < 14; i += 1) {
    const x = r1(4 + next() * 72 + (i % 2) * 80)
    const w = r1(2 + next() * 4)
    s += `<path d="M${x} 0 C ${r1(x + w)} 40 ${r1(x - w)} 90 ${x} 160" class="${next() < 0.5 ? 'g1' : 'g2'} grain"/>`
  }
  s += `<ellipse cx="${r1(20 + next() * 40)}" cy="${r1(30 + next() * 100)}" rx="3" ry="9" class="g2 knot"/>`

  return s
})()

// A split-flap departures board: each letter on its own flap.
const flapRow = (y: number, words: string, first: number) =>
  [...words].map((ch, i) => {
    const x = 12 + i * 21
    const n = first + i

    return (
      `<g class="flap f${n % 5}" style="animation-delay:${r1(-n * 0.23)}s"><rect x="${x}" y="${y}" width="19" height="28" rx="2" class="cell"/>` +
      `<path d="M${x} ${y + 14} h19" class="cellCut"/>` +
      (ch === ' ' ? '' : `<text x="${x + 9.5}" y="${y + 20}" text-anchor="middle" class="type flapInk" font-size="16">${ch}</text>`) +
      `</g>`
    )
  }).join('')

const FLAPS =
  `<rect width="320" height="196" rx="8" class="board"/>` +
  `<text x="160" y="26" text-anchor="middle" class="type boardHead" font-size="11" letter-spacing="2">PROCHAINES SÉANCES</text>` +
  flapRow(40, '14:30 DRAGON', 0) + flapRow(84, '15:00 VARAN', 12) + flapRow(128, '16:15 VISITE', 25) +
  `<circle cx="16" cy="178" r="4" class="lampOk"/><text x="28" y="182" class="type boardHead" font-size="9">À L’HEURE</text>`

// A roll of numbered entry tickets, the strip hanging down from it.
const ROLL = (() => {
  let strip = ''

  for (let i = 0; i < 6; i += 1) {
    const y = 40 + i * 50
    strip +=
      `<rect x="-44" y="${y}" width="88" height="50" class="rollTk"/>` +
      `<path d="M-44 ${y} h88" class="rollCut"/>` +
      `<text x="0" y="${y + 22}" text-anchor="middle" class="type rollInk" font-size="11" letter-spacing="1">ENTRÉE</text>` +
      `<text x="0" y="${y + 40}" text-anchor="middle" class="type rollInk" font-size="10">N° 04${17 + i}</text>`
  }

  return (
    `<svg x="-60" y="30" width="120" height="290" overflow="hidden"><g transform="translate(60 -30)"><g class="feed">${strip}</g></g></svg>` +
    `<circle r="44" class="rollTk"/><circle r="44" fill="none" class="rollEdge"/><circle r="30" fill="none" class="rollEdge"/>` +
    `<circle r="14" class="rollCore"/><circle r="5" class="hole"/>`
  )
})()

// A station clock; the second hand sweeps, faster while Claude works.
const CLOCK = (() => {
  let ticks = ''

  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 6
    const r0 = i % 3 ? 58 : 52
    ticks += `<path d="M${r1(Math.sin(a) * r0)} ${r1(-Math.cos(a) * r0)} L${r1(Math.sin(a) * 64)} ${r1(-Math.cos(a) * 64)}" class="tickMark" stroke-width="${i % 3 ? 2 : 4}"/>`
  }

  return (
    `<path d="M0 -150 V-78" class="rod"/><circle r="76" class="clockRim"/><circle r="70" class="clockFace"/>${ticks}` +
    // Each hand turns about the axle: its own box, the axle's place in it.
    `<g class="hh"><path d="M0 6 V-38" class="hand" stroke-width="6"/></g><g class="mm"><path d="M0 8 V-56" class="hand" stroke-width="4"/></g>` +
    `<g class="ss"><path d="M0 14 V-58" class="secHand"/><circle cy="-46" r="5" class="secDot"/></g><circle r="5" class="secDot"/>`
  )
})()

// The ticket window: an arched frame, glass, bars and its number plate.
const WINDOW =
  `<path d="M0 260 V100 A130 100 0 0 1 260 100 V260 Z" class="frame2"/>` +
  `<path d="M18 246 V104 A112 86 0 0 1 242 104 V246 Z" class="glass"/>` +
  `<path d="M70 30 V246 M130 14 V246 M190 30 V246" class="bars"/>` +
  `<path d="M40 70 L80 150 M150 40 L210 160" class="shine"/>` +
  `<rect x="-14" y="236" width="288" height="34" rx="4" class="sill"/>` +
  `<rect x="74" y="168" width="112" height="44" rx="6" class="plate"/>` +
  `<text x="130" y="196" text-anchor="middle" class="type plateInk" font-size="14" letter-spacing="2">GUICHET 1</text>` +
  `<rect x="96" y="118" width="68" height="28" rx="4" class="openTag"/>` +
  `<text x="130" y="138" text-anchor="middle" class="hand openInk" font-size="17">ouvert</text>`

// A phone checking a ticket at the gate; the scan line runs while Claude works.
const PHONE =
  `<rect width="178" height="340" rx="26" class="phone"/><rect x="10" y="12" width="158" height="316" rx="18" class="screen"/>` +
  `<rect x="66" y="20" width="46" height="8" rx="4" class="phone"/>` +
  `<text x="89" y="62" text-anchor="middle" class="type scrInk" font-size="12" letter-spacing="1">CONTRÔLE D’ACCÈS</text>` +
  `<g transform="translate(39 84)">` + qr(10, 10, 80, 17) +
  `<path d="M0 22 V0 H22 M78 0 H100 V22 M100 78 V100 H78 M22 100 H0 V78" class="frame"/>` +
  `<rect x="-4" width="108" height="3" rx="1.5" class="laser"/></g>` +
  `<rect x="34" y="214" width="110" height="38" rx="19" class="okPill"/>` +
  `<path d="M52 233 l7 7 l13 -15" class="okTick"/>` +
  `<text x="80" y="240" class="hand okInk" font-size="20">valide</text>` +
  `<text x="89" y="284" text-anchor="middle" class="type scrInk2" font-size="11">dragon · 14:30</text>` +
  `<text x="89" y="304" text-anchor="middle" class="type scrInk2" font-size="11">2 adultes · 1 enfant</text>`

// The price board, chalk on green.
const CHALK = (() => {
  const row = (y: number, a: string, b: string) =>
    `<text x="18" y="${y}" class="hand chalk" font-size="17">${a}</text><text x="152" y="${y}" text-anchor="end" class="hand chalk" font-size="17">${b}</text>`

  return (
    `<rect width="170" height="200" rx="4" class="chalkFrame"/><rect x="9" y="9" width="152" height="182" class="chalkBoard"/>` +
    `<text x="85" y="42" text-anchor="middle" class="mk chalk" font-size="22">tarifs</text>` +
    `<path d="M40 50 q45 6 90 0" class="chalkLine"/>` +
    row(84, 'dragon', '9,50 €') + row(114, '4 à 11 ans', '7,50 €') + row(144, '0 à 3 ans', 'gratuit') +
    `<text x="18" y="176" class="hand chalk2" font-size="13">balade de 45 min</text>`
  )
})()

// The blueprint of a walking mechanical dragon: white lines on blue, jointed
// legs, folded wings, a deck on its back and vents that breathe mist.
const BLUEPRINT = (() => {
  let grid = ''

  for (let x = 20; x < 320; x += 20) grid += `M${x} 0 V220 `
  for (let y = 20; y < 220; y += 20) grid += `M0 ${y} H320 `
  const leg = (x: number, k: number) =>
    `<path d="M${x} 132 L${x + k} 162 L${x - 4} 190 h14" class="bpLine"/><circle cx="${x}" cy="132" r="5" class="bpLine"/><circle cx="${x + k}" cy="162" r="4" class="bpLine"/>`
  const gear = (cx: number, cy: number, r: number) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" class="bpLine"/><circle cx="${cx}" cy="${cy}" r="${r + 3}" class="bpLine" stroke-dasharray="2.5 2.5"/><circle cx="${cx}" cy="${cy}" r="2" class="bpFill"/>`

  return (
    `<rect width="320" height="220" class="bp"/><path d="${grid}" class="bpGrid"/>` +
    `<rect x="6" y="6" width="308" height="208" class="bpLine" fill="none"/>` +
    // tail, back, neck and head
    `<path d="M14 150 C 40 150 52 128 74 112 C 104 92 150 86 196 96 C 222 102 236 112 246 104 C 256 94 258 70 270 60 L 300 64 L 302 74 L 284 78 L 296 84 L 280 88 C 270 92 262 112 252 128 C 236 136 210 140 180 140 L 96 140 C 76 140 50 150 14 150 Z" class="bpLine"/>` +
    `<circle cx="282" cy="68" r="2.4" class="bpFill"/><path d="M262 60 L254 46 L270 58" class="bpLine"/>` +
    // the deck and its rail
    `<path d="M104 92 H196 M104 92 V80 H196 V96 M120 80 V92 M140 80 V92 M160 80 V92 M180 80 V92" class="bpLine"/>` +
    // folded wing
    `<path d="M150 100 L120 60 L176 70 Z M120 60 L150 100 M140 64 L154 96 M160 68 L160 98" class="bpLine"/>` +
    leg(110, -10) + leg(150, -8) + leg(206, 8) + leg(236, 10) +
    gear(130, 120, 9) + gear(186, 118, 7) +
    // vents, and the mist they breathe
    `<circle cx="96" cy="102" r="3" class="bpLine"/><circle cx="214" cy="104" r="3" class="bpLine"/>` +
    `<g class="mist"><circle cx="96" cy="88" r="7"/><circle cx="104" cy="78" r="5"/><circle cx="214" cy="90" r="7"/><circle cx="222" cy="80" r="5"/></g>` +
    // dimensions and title
    `<path d="M14 204 H302 M14 198 V210 M302 198 V210" class="bpLine"/>` +
    `<text x="158" y="200" text-anchor="middle" class="type bpInk" font-size="9" letter-spacing="1">25 M</text>` +
    `<text x="16" y="28" class="hand bpInk" font-size="16">bestiaire mécanique</text>` +
    `<text x="304" y="28" text-anchor="end" class="type bpInk" font-size="9" letter-spacing="1">PLANCHE 1</text>`
  )
})()

// ---------- the two edges ----------

const LEFT =
  // the departures board, hung on two nails
  `<g transform="translate(26 70)" filter="url(#sh)">${FLAPS}</g>` +
  pin(46, 76, '#9aa3ab') + pin(326, 76, '#9aa3ab') +
  // the ticket roll
  `<g transform="translate(96 340)" filter="url(#sh)">${ROLL}</g>` +
  // the price board
  `<g transform="translate(190 326) rotate(2)" filter="url(#sh)">${CHALK}</g>` +
  pin(276, 330, '#c8423b') +
  // the receipt and the phone that scans the tickets
  `<g transform="translate(196 700) rotate(-4)" filter="url(#sh)">${RECEIPT}</g>` +
  `<g transform="translate(26 690) rotate(-5) scale(.86)" filter="url(#sh)">${PHONE}</g>`

const RIGHT =
  // the enamel sign
  `<g transform="translate(190 60)" filter="url(#sh)"><rect width="310" height="72" rx="12" class="enamel"/>` +
  `<rect x="7" y="7" width="296" height="58" rx="8" fill="none" class="enamelLine"/>` +
  `<text x="155" y="46" text-anchor="middle" class="type enamelInk" font-size="22" letter-spacing="4">BILLETTERIE</text></g>` +
  // the clock, on its rod from the sign
  `<g transform="translate(400 300)" filter="url(#sh)">${CLOCK}</g>` +
  // the Moka bean as an enamel pin
  `<g transform="translate(232 260) scale(1.1)" filter="url(#sh)">${BEAN}</g>` +
  // the ticket window
  `<g transform="translate(206 420)" filter="url(#sh)">${WINDOW}</g>` +
  // the dragon's blueprint, pinned at its corners
  `<g transform="translate(186 740) rotate(-3)" filter="url(#sh)">${BLUEPRINT}</g>` +
  pin(196, 750, '#e2b45c') + pin(496, 734, '#e2b45c')

// The strip of paper the conversation is written on: torn down both sides,
// a fixed width in screen points, centred under the words whatever the
// window's shape. Drawn in points, so it sits outside the sliced board.
const STRIP_HALF = 410
const STRIP_TALL = 3200

const tornEdge = (seed: number, x: number, down: boolean) => {
  const rand = random(seed)
  const points: string[] = []

  for (let y = -40; y <= STRIP_TALL; y += 7 + rand() * 6) {
    const notch = rand() < 0.06 ? 4 + rand() * 4 : 0
    const dx = (rand() - 0.5) * 4 + (x < 0 ? notch : -notch)
    points.push(`${r1(x + dx)} ${r1(y)}`)
  }

  return (down ? points : points.reverse()).join(' L')
}

const STRIP_PATH = `M${tornEdge(7, -STRIP_HALF, true)} L${tornEdge(19, STRIP_HALF, false)} Z`

const FIBERS = (() => {
  const rand = random(41)
  let out = ''

  for (let i = 0; i < 46; i += 1) {
    const x = r1(rand() * 240)
    const y = r1(rand() * 240)
    const len = 6 + rand() * 16
    const a = rand() * Math.PI
    out += `<path d="M${x} ${y} q${r1(Math.cos(a) * len * 0.5 + 2)} ${r1(Math.sin(a) * len * 0.5 - 2)} ${r1(Math.cos(a) * len)} ${r1(Math.sin(a) * len)}"/>`
  }

  return out
})()

const SPECKS = (() => {
  const rand = random(53)
  let out = ''

  for (let i = 0; i < 70; i += 1) {
    out += `<circle cx="${r1(rand() * 240)}" cy="${r1(rand() * 240)}" r="${r1(0.4 + rand() * 0.9)}"/>`
  }

  return out
})()

// A strip of washi tape holding the paper to the cork, centred on (x, y).
const stripTape = (x: number, y: number, rot: number, cls: string, seed: number) => {
  const rand = random(seed)
  const w = 118
  const h = 30
  const jag = (side: number) =>
    Array.from({ length: 6 }, (_, i) => `${r1(side === 0 ? rand() * 4 : w - rand() * 4)},${r1((h * i) / 5)}`)
  const outline = [...jag(0), ...jag(1).reverse()].join(' ')

  return (
    `<g transform="translate(${x} ${y}) rotate(${rot}) translate(${-w / 2} ${-h / 2})">` +
    `<polygon points="${outline}" class="washi ${cls}"/>` +
    `<path d="M6 ${h * 0.3} H${w - 6} M6 ${h * 0.7} H${w - 6}" class="washiLine" stroke-dasharray="3 4"/></g>`
  )
}

// A faint ring left by a mug, two arcs that don't quite meet.
const RING =
  `<g class="ring2" fill="none" stroke-linecap="round">` +
  `<path d="M-44 6 A46 44 0 0 1 40 -22" stroke-width="5"/><path d="M44 -6 A46 44 0 0 1 -30 36" stroke-width="3.5"/>` +
  `<path d="M-40 14 A42 40 0 0 0 -8 41" stroke-width="1.5"/></g>`

const STRIP =
  `<svg x="50%" y="0" width="1" height="1" overflow="visible">` +
  `<path d="${STRIP_PATH}" class="paperBody" filter="url(#stripSh)"/>` +
  `<path d="${STRIP_PATH}" fill="url(#fibers)" opacity=".5"/>` +
  `<path d="${STRIP_PATH}" fill="url(#specks)"/>` +
  stripTape(-STRIP_HALF + 8, 58, -38, 'w0', 3) + stripTape(STRIP_HALF - 8, 58, 36, 'w1', 5) +
  `</svg>` +
  `<svg x="50%" y="100%" width="1" height="1" overflow="visible">` +
  `<g transform="translate(${STRIP_HALF - 130} -190) rotate(-14)">${RING}</g>` +
  stripTape(-STRIP_HALF + 8, -40, 34, 'w2', 7) + stripTape(STRIP_HALF - 8, -40, -32, 'w3', 9) +
  `</svg>`

const LIGHTS_LEFT = lights([-20, 14, 150, 92, 560, 18], 9, 3, 0)
const LIGHTS_RIGHT = lights([-20, 22, 300, 98, 560, 8], 9, 8, 9)

const DEFS =
  `<filter id="stripSh" x="-10%" y="-1%" width="120%" height="102%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dx="0" dy="3"/>` +
  `<feComponentTransfer><feFuncA type="linear" slope=".38"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
  `<linearGradient id="paperG" gradientUnits="userSpaceOnUse" x1="${-STRIP_HALF}" x2="${STRIP_HALF}" y1="0" y2="0">` +
  `<stop offset="0" class="pe"/><stop offset=".05" class="pp"/><stop offset=".95" class="pp"/><stop offset="1" class="pe"/></linearGradient>` +
  `<pattern id="specks" width="240" height="240" patternUnits="userSpaceOnUse"><g class="speck">${SPECKS}</g></pattern>` +
  `<pattern id="fibers" width="240" height="240" patternUnits="userSpaceOnUse"><g fill="none" stroke-width=".8" class="fiber">${FIBERS}</g></pattern>` +
  `<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dx="2" dy="6"/>` +
  `<feComponentTransfer><feFuncA type="linear" slope=".28"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
  `<radialGradient id="pinShade" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>` +
  PERF +
  `<pattern id="corkTex" width="160" height="160" patternUnits="userSpaceOnUse">${WOOD}</pattern>` +
  `<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2b45c"/><stop offset="1" stop-color="#b98a55"/></linearGradient>` +
  `<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b6f9c"/><stop offset=".6" stop-color="#e9a06b"/><stop offset="1" stop-color="#f3cf8f"/></linearGradient>` +
  `<radialGradient id="bulbGlow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".85"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="lampG" cx=".5" cy="-.05" r=".85"><stop offset="0" stop-color="#ffbf6e" stop-opacity="1"/><stop offset=".55" stop-color="#ff9f4a" stop-opacity=".25"/><stop offset="1" stop-color="#ff9f4a" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="vigG" cx=".5" cy=".5" r=".75"><stop offset=".5" stop-color="#2a1a0c" stop-opacity="0"/><stop offset="1" stop-color="#2a1a0c" stop-opacity="1"/></radialGradient>`

const STYLE_FIXED =
  `.speck{fill:var(--fiber);opacity:.28}.ring2{stroke:var(--ring);opacity:var(--ringOp)}` +
  `.washi{opacity:.86}.washiLine{fill:none;stroke:#fff;stroke-width:1;opacity:.35}.w0{fill:#e7cf86}.w1{fill:#efb2ad}.w2{fill:#a8d3bf}.w3{fill:#c5b8e6}` +
  `@media (prefers-color-scheme:dark){.washi{opacity:.62}}` +
  `.paperBody{fill:url(#paperG);stroke:var(--fringe);stroke-width:2.4}.pp{stop-color:var(--paper)}.pe{stop-color:var(--paperEdge)}.fiber{stroke:var(--fiber);opacity:.35}` +
  `.cork{fill:var(--cork)}.g1{fill:var(--g1);opacity:.55}.g2{fill:var(--g2);opacity:.5}` +
  `.sheet{fill:#f7f6f1}.photo{fill:#fbf8f1}.card{fill:#fdfcf6}.kraft{fill:#c99c63}.sticky{fill:#f4dc84}.stickyFold{fill:#d9bd60}.ticket{fill:#e2b45c}.perfLine{stroke:#fbf7ee;stroke-width:2;opacity:.8}` +
  `.ink{fill:#2c3a55}.ink2{fill:#5a6377}.pencil{fill:#5d6670}.tk{fill:#4a3220}.tkInk{fill:#3b2a20}.phone{fill:#2a2420}.screen{fill:#f8f3e8}.scrInk{fill:#8a5a36}.scrInk2{fill:#6b5e4d}.frame{fill:none;stroke:#e2b45c;stroke-width:4;stroke-linecap:round}.qr{fill:#2b231b;color:#2b231b}.laser{fill:#e0473c;opacity:.85}.okPill{fill:#dcebd2}.okTick{fill:none;stroke:#3f7a35;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.okInk{fill:#2f5f27}.sign{fill:#b8352e}.signLine{stroke:#fbe9d6;stroke-width:1.5;opacity:.7}.signInk{fill:#fbf1e2}.beanS{stroke:#f6ecd8}.seam{stroke:#5a3a20;stroke-width:2.2;opacity:.55}.grain{fill:none;stroke-width:1.4}.g1.grain{stroke:var(--g1);fill:none;opacity:.5}.g2.grain{stroke:var(--g2);fill:none;opacity:.45}.knot{opacity:.5}.board{fill:#24211e}.cell{fill:#34302b}.cellCut{stroke:#141210;stroke-width:1.2}.flapInk{fill:#f3ead6}.boardHead{fill:#e2b45c}.lampOk{fill:#7bc46b}.flap{transform-box:fill-box;transform-origin:50% 50%}.rollTk{fill:#f1d9a4}.rollCut{stroke:#b58a4a;stroke-width:1.2;stroke-dasharray:3 3}.rollInk{fill:#7a3a22}.rollEdge{stroke:#c89e5e;stroke-width:1.5}.rollCore{fill:#8a5a36}.rod{stroke:#3b3631;stroke-width:5}.clockRim{fill:#2f2b27}.clockFace{fill:#fbf7ee}.tickMark{stroke:#2b231b}.hand{stroke:#2b231b;stroke-linecap:round}.secHand{stroke:#c8423b;stroke-width:2}.secDot{fill:#c8423b}.hh,.mm,.ss{transform-box:fill-box}.hh{transform-origin:50% 86.36%}.mm{transform-origin:50% 87.5%}.ss{transform-origin:50% 80.56%}.frame2{fill:#6b4527}.glass{fill:#cfe0e6;opacity:.85}.bars{stroke:#8a6a3c;stroke-width:4}.shine{stroke:#fff;stroke-width:6;opacity:.35}.sill{fill:#7d5432}.plate{fill:#1f3f73}.plateInk{fill:#f3ead6}.openTag{fill:#b8352e}.openInk{fill:#fbf1e2}.bellBase{fill:#3b3631}.bellDome{fill:#d9ab5c}.bellShine{fill:none;stroke:#fff3d0;stroke-width:4;opacity:.6;stroke-linecap:round}.chalkFrame{fill:#8a5a36}.chalkBoard{fill:#2f3f36}.chalk{fill:#f1eee4}.chalk2{fill:#e8d9a8}.chalkLine{fill:none;stroke:#f1eee4;stroke-width:1.6;opacity:.8}.bp{fill:#24507e}.bpGrid{fill:none;stroke:#cfe3f5;stroke-width:.6;opacity:.25}.bpLine{fill:none;stroke:#eef6fc;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}.bpFill{fill:#eef6fc}.bpInk{fill:#eef6fc}.mist{fill:#eef6fc;opacity:.35;transform-box:fill-box;transform-origin:50% 100%}.enamel{fill:#1f3f73}.enamelLine{stroke:#f3ead6;stroke-width:2}.enamelInk{fill:#f3ead6}.receipt{fill:#fbfaf4}.rcp{fill:#3d3a36}.rcpHand{fill:#8a5a36}.rcpLine{stroke:#8d877c;stroke-width:1;stroke-dasharray:2 3}.map{fill:#f3ead2}.fold{stroke:#cdbf9f;stroke-width:1}.river{fill:none;stroke:#8fb5cf;stroke-width:7;opacity:.8}.block{fill:#d9cba9}.walk{fill:none;stroke:#b8352e;stroke-width:1.8}.mapPin{fill:#c8423b}.wrist{fill:none;stroke:#e2b45c}.wristLine{fill:none;stroke:#fbf1e2;stroke-width:1.2;opacity:.8}.wristClip{fill:#8a5a36}.wristInk{fill:#5a3a22}` +
  `.pen{stroke:#2c3a55}.penS{stroke:#2c3a55;stroke-width:1.4}.tick{fill:none;stroke:#c0392b;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}` +
  `.twine{fill:none;stroke:#8b6b45;stroke-width:1.6}.hole{fill:var(--cork)}.ring{stroke:#a88050;stroke-width:2}` +
  `.string{fill:none;stroke:#b8352e;stroke-width:1.7;opacity:.9}.clip{fill:none;stroke:#9aa3ab;stroke-width:2.6;stroke-linecap:round}` +
  `.wire{fill:none;stroke:#4b3b2b;stroke-width:1.4;opacity:.8}.cap{fill:#6e6252}.bulb{fill:var(--bulb)}` +
  `.cabin{fill:#f7c96b}.veil{fill:#1a0f07;opacity:var(--veil)}.lamp{opacity:var(--lamp)}.vig{opacity:var(--vig)}` +
  `.sway{transform-box:fill-box;transform-origin:50% 0}` +
  `@keyframes sway{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}` +
  `@keyframes twinkle{0%,100%{opacity:var(--idle)}50%{opacity:calc(var(--idle) * .1)}}` +
  `@keyframes scan{0%,100%{transform:translateY(4px)}50%{transform:translateY(94px)}}` +
  `@keyframes flip{0%,86%,100%{transform:scaleY(1)}93%{transform:scaleY(.08)}}@keyframes puff{0%,100%{opacity:.1;transform:translateY(4px) scale(.8)}50%{opacity:.6;transform:translateY(-4px) scale(1.15)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes feed{from{transform:translateY(-50px)}to{transform:translateY(0)}}` +
  `@keyframes chase{0%,100%{opacity:.25}35%{opacity:1}}` +
  `.star{animation:star 4s ease-in-out infinite}.s1{animation-duration:5.5s;animation-delay:-2s}.s2{animation-duration:7s;animation-delay:-4s}` +
  `@keyframes star{0%,100%{opacity:1}50%{opacity:.35}}`

/** The whole board as one SVG, for the session as it is now. */
export const drawBoard = (live: Live) => {
  // Each animation picks up where the clock says it is, so a redraw doesn't jump.
  const at = (period: number) => `${r1(-(live.seconds % period))}s`
  const motion = live.isBusy
    ? `.sway{animation:sway 2.8s ease-in-out ${at(5.6)} infinite alternate}` +
      `.glow{animation:chase 1.6s ease-in-out infinite}.bulb{fill:#ffd98f}.flap{animation:flip 1.1s linear infinite}.mist{animation:puff 1.4s ease-in-out infinite}.laser{animation:scan 1.4s ease-in-out ${at(1.4)} infinite}.feed{animation:feed 2s ease-in-out ${at(2)} infinite}`
    : `.sway{animation:sway 5s ease-in-out ${at(10)} infinite alternate}` +
      `.glow{opacity:var(--idle)}.b0{animation:twinkle 3.1s ease-in-out infinite}.b1{animation:twinkle 4.3s ease-in-out infinite}` +
      `.b2{animation:twinkle 5.7s ease-in-out infinite}.b3{animation:twinkle 7.9s ease-in-out infinite}` +
      `.f0{animation:flip 9s linear infinite}.mist{animation:puff 6s ease-in-out infinite}.laser{animation:scan 4.5s ease-in-out ${at(4.5)} infinite}`
  // The station clock shows the real time: each hand starts where the wall
  // clock is and turns on from there.
  const wall = (period: number) => `${r1(-(live.localSeconds % period))}s`
  const hands =
    `.hh{animation:spin 43200s linear ${wall(43200)} infinite}.mm{animation:spin 3600s linear ${wall(3600)} infinite}` +
    `.ss{animation:spin 60s steps(60) ${wall(60)} infinite}`
  const style =
    `:root{${vars(LIGHT)}}@media (prefers-color-scheme:dark){:root{${vars(DARK)}}}` +
    STYLE_FIXED + motion + hands + EDGES +
    ``
  const band = (cls: string, content: string) =>
    cls === 'L' ? `<g class="L">${content}</g>` : `<g class="R" transform="translate(${W - BAND} 0)">${content}</g>`

  return outline(
    // The root is the backdrop's own box in points; the board inside it is sliced.
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">` +
    `<style>${style}</style><defs>${DEFS}</defs>` +
    `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="${W}" height="${H}" class="cork"/><rect width="${W}" height="${H}" fill="url(#corkTex)"/>` +
    `<rect width="${W}" height="${H}" fill="url(#vigG)" class="vig"/>` +
    band('L', LEFT) + band('R', RIGHT) +
    // night: a warm veil, the lamp's pool, then the lights above both
    `<rect width="${W}" height="${H}" class="veil"/><rect width="${W}" height="${H}" fill="url(#lampG)" class="lamp"/>` +
    `</svg>` +
    STRIP +
    // The lights hang from the window's top edge, wherever the slice crops the board.
    `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice">` +
    band('L', LIGHTS_LEFT) + band('R', LIGHTS_RIGHT) +
    `</svg></svg>`
  )
}

export const ALT = 'A wood-paneled ticket counter: a split-flap board announcing the dragon, a roll of entry tickets, a chalk price board, a station clock on the real time, the ticket window, a phone scanning a ticket and the blueprint of a mechanical dragon breathing mist'
