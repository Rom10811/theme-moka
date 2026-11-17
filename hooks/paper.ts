import { outline } from './board'
// The paper pieces the conversation is drawn on, scrapbook style: each reply
// on its own scrap (kraft, manila, rose, sage), torn at top and
// bottom and held by two strips of washi tape in one of five colors, with a
// small ink doodle beside it; each run of tool calls on a strip of tape under
// a colored pin. A message's id picks its paper, tape, doodle and pin, so it
// looks the same every time it is drawn.
//
// The app tells a drawing nothing of light or dark, so the card's own color
// is a translucent kraft that reads on cream and on the lamp-lit dark alike.
// The torn edges and tape are SVG images, which switch their colors with
// prefers-color-scheme themselves.

// Translucent, so each reads on the cream strip and on the lamp-lit dark one.
const PAPERS = [
  ['#a57c4b', 0x2c], // kraft
  ['#c49a3f', 0x2e], // manila
  ['#c9766a', 0x2a], // rose
  ['#6f935a', 0x26], // sage
] as const

const hex2 = (n: number) => n.toString(16).padStart(2, '0')

/** The card's body color for a message. */
export const cardColor = (seed: number) => {
  const [c, a] = PAPERS[seed % PAPERS.length]!

  return `${c}${hex2(a)}`
}

const cardFill = (seed: number) => {
  const [c, a] = PAPERS[seed % PAPERS.length]!

  return `fill="${c}" fill-opacity="${(a / 255).toFixed(3)}"`
}

const BANDS = ['#d8b45a38', '#8fc0aa3a', '#e3a09a36', '#a99bd63a']

/** A strip of tape behind a tool run's count line. */
export const tapeBand = (seed: number) => BANDS[seed % BANDS.length]!

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

// Washi tape: mustard, mint, rose, lavender, sky; muted under the lamp.
const WASHI = [
  ['#e7cf86', '#c9ad5c', '#9c8857'],
  ['#a8d3bf', '#7fb39b', '#5f8a76'],
  ['#efb2ad', '#d88d87', '#9a6a66'],
  ['#c5b8e6', '#a091cf', '#7a6f9c'],
  ['#acd0ec', '#82acd0', '#647f99'],
] as const

const tapeStyle = (k: number) => {
  const [fill, line, dark] = WASHI[k % WASHI.length]!

  return (
    `<style>.tp{fill:${fill};opacity:.85}.tl{stroke:${line};opacity:.6}` +
    `@media (prefers-color-scheme:dark){.tp{fill:${dark};opacity:.75}.tl{stroke:${fill};opacity:.3}}</style>`
  )
}

// A torn line across 1000 units, `depth` deep, as points.
const tear = (seed: number, depth: number) => {
  const next = random(seed)
  const points: string[] = []
  let x = 0

  while (x < 1000) {
    points.push(`${r1(x)} ${r1(next() * depth)}`)
    x += 4 + next() * 7
  }
  points.push(`1000 ${r1(next() * depth)}`)

  return points
}

const piece = (w: number, h: number, seed: number) => {
  const next = random(seed)
  const jag = (side: 'l' | 'r') =>
    Array.from({ length: 6 }, (_, i) => {
      const y = (h * i) / 5
      const x = side === 'l' ? next() * 3 : w - next() * 3

      return `${r1(x)},${r1(y)}`
    })
  const outline = [...jag('l'), ...jag('r').reverse()].join(' ')

  return `<polygon class="tp" points="${outline}"/><path class="tl" d="M4 ${r1(h * 0.32)} H${w - 4} M4 ${r1(h * 0.68)} H${w - 4}" stroke-width="1" stroke-dasharray="2 3"/>`
}

// The torn line as a path across `w` x `h`, the paper below it.
const tornPath = (edge: string[], h: number, lift: number) =>
  `M0 ${h} L${edge.map(p => { const [x, y] = p.split(' '); return `${x} ${r1(Number(y) + lift)}` }).join(' L')} L1000 ${h} Z`

/**
 * The card's top, in three pieces laid in a row: a corner with tape, the torn
 * edge between (an image as wide as its slot, stretched sideways only), and the
 * other corner. Each is 24px high, the tear along the bottom 10.
 */
export const cardTopMid = (seed: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="24" viewBox="0 0 1000 24" preserveAspectRatio="none">` +
  `<path d="${tornPath(tear(seed, 6), 24, 15)}" ${cardFill(seed)}/></svg>`

export const cardCorner = (seed: number, side: 'left' | 'right') => {
  const edge = tear(seed + (side === 'left' ? 3 : 5), 6)
  const tapeAt = side === 'left' ? 'translate(10 3) rotate(-6 34 9)' : 'translate(2 3) rotate(5 34 9)'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="24" viewBox="0 0 84 24">${tapeStyle((seed >> 2) + (side === 'left' ? 0 : 2))}` +
    `<svg width="84" height="24" viewBox="0 0 160 24" preserveAspectRatio="none"><path d="${tornPath(edge, 24, 15)}" ${cardFill(seed)}/></svg>` +
    `<g transform="${tapeAt}">${piece(70, 18, seed + (side === 'left' ? 1 : 2))}</g></svg>`
  )
}

/** The card's foot: the same paper torn the other way, and a soft shadow under it. */
export const cardFoot = (seed: number) => {
  const edge = tear(seed + 9, 6)
  const torn = `M0 0 L1000 0 L${edge.map(p => { const [x, y] = p.split(' '); return `${x} ${r1(10 - Number(y) - 2)}` }).reverse().join(' L')} Z`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="14" viewBox="0 0 1000 14" preserveAspectRatio="none">` +
    `<defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a18" stop-opacity=".16"/><stop offset="1" stop-color="#3a2a18" stop-opacity="0"/></linearGradient></defs>` +
    `<path d="${torn}" fill="url(#sh)" transform="translate(0 3)"/><path d="${torn}" ${cardFill(seed)}/></svg>`
  )
}

const PIN_COLORS = ['#c8423b', '#e2b45c', '#8a5a36', '#4f8a5b']

/** A push pin, 16px square, for a tool run's line, its color picked by `seed`. */
export const pin = (seed: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">` +
  `<ellipse cx="9.5" cy="11" rx="5" ry="2.6" fill="#000" opacity=".18"/>` +
  `<circle cx="8" cy="7.5" r="5.5" fill="${PIN_COLORS[seed % PIN_COLORS.length]}"/><circle cx="6.2" cy="5.6" r="1.7" fill="#fff" opacity=".7"/></svg>`

// Small doodles in ballpoint ink, drawn with a slightly shaky hand.
const DOODLES = [
  // a ticket with its notch
  '<path d="M3 8 H25 V12 a2 2 0 0 0 0 4 V20 H3 V16 a2 2 0 0 0 0 -4 Z M18 9 V19"/>',
  // a map pin
  '<path d="M14 25 C8 17 6 14 6 11 a8 8 0 0 1 16 0 c0 3 -2 6 -8 14 Z M14 8 a3 3 0 1 0 .1 0"/>',
  // a little castle
  '<path d="M4 24 V10 H8 V13 H11 V10 H17 V13 H20 V10 H24 V24 Z M12 24 V18 a2 2 0 0 1 4 0 V24"/>',
  // a coffee bean
  '<path d="M14 3 C21 3 25 9 24 15 C23 21 18 25 13 25 C7 24 4 19 4 14 C4 8 8 3 14 3 Z M22 6 C15 9 15 18 6 22"/>',
  // a scan frame
  '<path d="M4 10 V4 H10 M18 4 H24 V10 M24 18 V24 H18 M10 24 H4 V18 M6 14 H22"/>',
]

/** An ink doodle, 28px square, beside a reply. */
export const doodle = (seed: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
  `<style>g{stroke:#8a5a36}@media (prefers-color-scheme:dark){g{stroke:#e2b45c}}</style>` +
  `<g fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${r1((random(seed + 5)() - 0.5) * 16)} 14 14)">` +
  `${DOODLES[(seed >> 3) % DOODLES.length]}</g></svg>`

// ---------- replies as entry tickets ----------
// Each reply is printed on a ticket: a gold band with its number across the
// top, a pale gold body, and a stub torn along a perforation at the foot, with
// a barcode. The band and the stub are SVG pieces, the body a Box.

const GOLD = '#e2b45c'
const GOLD_A = 0x26
const TICKET =
  `<style>.band{fill:${GOLD}}.bandInk{fill:#3b2a20}.perf{stroke:#a87a35;stroke-width:1.6;stroke-dasharray:4 4}.bar{fill:#5a4027}` +
  `@media (prefers-color-scheme:dark){.band{fill:#c99a45}.perf{stroke:#e2b45c}.bar{fill:#e8d3a8}}</style>`
const bodyFill = `fill="${GOLD}" fill-opacity="${(GOLD_A / 255).toFixed(3)}"`

/** The ticket body's color, behind the reply. */
export const ticketBody = () => `${GOLD}${hex2(GOLD_A)}`

/** The ticket's number, the same for a reply every time it is drawn. */
const number = (seed: number) => String(1000 + (seed % 9000))

export const ticketHeadLeft = (seed: number) =>
  outline(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="30" viewBox="0 0 200 30"><defs></defs>${TICKET}` +
    `<path d="M10 0 H200 V30 H0 V10 A10 10 0 0 1 10 0 Z" class="band"/>` +
    `<text x="16" y="20" class="type bandInk" font-size="11" letter-spacing="1">BILLET · N° ${number(seed)}</text></svg>`,
  )

export const ticketHeadMid = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="30" viewBox="0 0 1000 30" preserveAspectRatio="none">${TICKET}<rect width="1000" height="30" class="band"/></svg>`

export const ticketHeadRight = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="30" viewBox="0 0 90 30">${TICKET}` +
  `<path d="M0 0 H80 A10 10 0 0 1 90 10 V30 H0 Z" class="band"/>` +
  `<circle cx="22" cy="15" r="4" class="bandInk" opacity=".35"/><circle cx="40" cy="15" r="4" class="bandInk" opacity=".35"/><circle cx="58" cy="15" r="4" class="bandInk" opacity=".35"/></svg>`

/** The foot's left piece: a notch at the perforation, the stub's corner and its barcode. */
export const ticketFootLeft = (seed: number) => {
  const next = random(seed + 11)
  let bars = ''
  let x = 18

  while (x < 150) {
    const w = next() < 0.5 ? 1.5 : 3
    bars += `<rect x="${r1(x)}" y="18" width="${w}" height="14" class="bar"/>`
    x += w + 1.5 + Math.round(next() * 2)
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40">${TICKET}` +
    `<path d="M0 0 H160 V40 H10 A10 10 0 0 1 0 30 V16 A6 6 0 0 0 0 4 Z" ${bodyFill}/>` +
    `<path d="M8 10 H160" class="perf"/>${bars}</svg>`
  )
}

export const ticketFootMid = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="40" viewBox="0 0 4000 40">${TICKET}` +
  `<rect width="4000" height="40" ${bodyFill}/><path d="M0 10 H4000" class="perf"/></svg>`

export const ticketFootRight = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40" viewBox="0 0 60 40">${TICKET}` +
  `<path d="M0 0 H60 V4 A6 6 0 0 0 60 16 V30 A10 10 0 0 1 50 40 H0 Z" ${bodyFill}/><path d="M0 10 H52" class="perf"/></svg>`
