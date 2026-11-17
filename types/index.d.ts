declare module 'claude-code' {
  interface PluginState {
    'moka-tourisme': {
      /** Whether Claude is working on a turn; the string lights run while it is. */
      busy: boolean
    }
  }
}

/** What the string lights are doing. */
export type Lights = 'resting' | 'running'
