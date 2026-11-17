import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { ALT, drawBoard } from './board'
import { compact } from './compact'
import { makeColors } from './make-colors.js'
import { doodle, pin, tapeBand, ticketBody, ticketFootLeft, ticketFootMid, ticketFootRight, ticketHeadLeft, ticketHeadMid, ticketHeadRight } from './paper'

const PLUGIN = 'moka-tourisme'
const SCENE = 'cork'

// Whether Claude is working on a turn: the lights run while it is.
const busy = atom({ plugin: 'moka-tourisme', key: 'busy' } as const, false)

// Cream paper by day, roasted coffee by night. Moka gold for the accent, as
// on moka.cloud; warning leans orange so it stays apart from the gold.
const { theme, problems } = makeColors({
  label: 'Moka Tourisme',
  roles: { accent: '#e2b45c', danger: '#b3392f', success: '#4e7d3a', warning: '#c2651a', pro: '#6d4f94' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ecdcbc',
        'surface-1': '#efe0c2',
        'surface-2': '#f6ecd8',
        'text-primary': '#2e2117',
        'text-secondary': '#584432',
        'text-muted': '#6e5a46',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1c1611',
        'surface-1': '#291f17',
        'surface-2': '#2b231b',
        'surface-3': '#30271f',
        'text-primary': '#f3e7d2',
        'text-secondary': '#d2c1a8',
        'text-muted': '#ab9a82',
      },
    },
  },
})

// The board draws a torn paper strip down the middle of the window, as the
// words sit when the sidebar is closed. The app's own frosted column follows
// the words wherever they are, so it stays as a thin safety tint: enough to
// keep them readable when a sidebar or pane moves them off the strip, little
// enough that its soft edge doesn't fog the strip's torn one.
const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE, glass: { blur: 0, opacity: 0.25 } },
}

// Each message tears its card the same way every time it is drawn.
const seedOf = (id: string) => {
  let h = 2166136261

  for (let i = 0; i < id.length; i += 1) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  }

  return (h >>> 0) % 100000
}

// The clock on the wall shows the time where the team works.
const ZONE = 'Europe/Paris'

/** The zone's offset from UTC at that instant, in seconds; 0 when it can't be read. */
const offsetSeconds = (seconds: number) => {
  try {
    const at = new Date(seconds * 1000)
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(at)
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
    const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))

    return Math.round((wall - at.getTime()) / 1000)
  } catch {
    return -new Date(seconds * 1000).getTimezoneOffset() * 60
  }
}

const working = async ($: EngineInterface, isBusy: boolean) => {
  if ((await read($, busy)) !== isBusy) {
    await update($, busy, () => isBusy)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    // A terminal draws no look: the theme stands and draws once the desktop
    // or mobile app attaches, so there is nothing to say here.
    await $.theme.set(LOOK)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await working($, true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await working($, false)

    return next(e)
  })

  // Each reply printed on an entry ticket: its numbered band, the body, and
  // the stub below a perforation. The desktop app only: the terminal draws
  // no images.
  on('ui.render', { component: 'AssistantMessage', plugin: '*' }, async ($, e, next) => {
    if (e.surface !== 'desktop') {
      return next(e)
    }
    const { Box, Svg } = $.ui.resolve(e)
    const seed = seedOf(e.requestId)
    const reply = await next(e)

    return (
      <Box flexDirection="row" gap="sm" marginTop="xs" marginBottom="xs">
        {/* Kept at full width: an image may shrink to nothing in a flex row. */}
        <Box paddingTop="lg" flexShrink={0}>
          <Svg source={doodle(seed)} alt="doodle" width={28} height={28} />
        </Box>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Box flexDirection="row">
            <Svg source={ticketHeadLeft(seed)} alt="ticket number" width={200} height={30} />
            <Box flexGrow={1} flexShrink={1} overflow="hidden">
              <Svg source={ticketHeadMid()} alt="ticket band" height={30} />
            </Box>
            <Svg source={ticketHeadRight()} alt="ticket band" width={90} height={30} />
          </Box>
          <Box backgroundColor={ticketBody()} paddingX="lg" paddingY="xs">
            {reply}
          </Box>
          <Box flexDirection="row">
            <Svg source={ticketFootLeft(seed)} alt="ticket stub" width={160} height={40} />
            <Box flexGrow={1} flexShrink={1} overflow="hidden">
              <Svg source={ticketFootMid()} alt="ticket stub" height={40} />
            </Box>
            <Svg source={ticketFootRight()} alt="ticket stub" width={60} height={40} />
          </Box>
        </Box>
      </Box>
    )
  })

  // A run of tool calls: its count line on a strip of tape, under a pin, both
  // in a color the run's id picks.
  on('ui.render', { component: 'ToolGroup', plugin: '*' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.isExpanded) {
      return next(e)
    }
    const { Box, Svg } = $.ui.resolve(e)
    const seed = seedOf(e.requestId)
    const line = await next(e)

    return (
      <Box flexDirection="row" alignItems="center" gap="sm" paddingLeft="xl">
        <Svg source={pin(seed)} alt="pin" width={16} height={16} />
        <Box backgroundColor={tapeBand(seed)} paddingX="sm" flexShrink={1}>
          {line}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    const isOurs = e.props.plugin === PLUGIN && e.props.scene === SCENE

    if (!isOurs || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const seconds = (await $.clock.now()) / 1000
    const source = compact(drawBoard({ isBusy: await read($, busy), seconds, localSeconds: seconds + offsetSeconds(seconds) }))

    return <Svg source={source} alt={ALT} isInteractive />
  })
}
