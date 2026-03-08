import { create } from 'zustand'
import { PlaybackRate } from '../types'
import { DEFAULT_PLAYBACK_RATE } from '../constants/defaults'

interface PlayerState {
  isPlaying: boolean
  currentPosition: number
  duration: number
  playbackRate: PlaybackRate
}

interface PlayerActions {
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  setPlaybackRate: (rate: PlaybackRate) => void
  setCurrentPosition: (seconds: number) => void
  setDuration: (seconds: number) => void
  resetPlayer: () => void
}

type PlayerStore = PlayerState & PlayerActions

const INITIAL_PLAYER_STATE: PlayerState = {
  isPlaying: false,
  currentPosition: 0,
  duration: 0,
  playbackRate: DEFAULT_PLAYBACK_RATE,
}

export const usePlayerStore = create<PlayerStore>()((set) => ({
  ...INITIAL_PLAYER_STATE,

  play: () => {
    set({ isPlaying: true })
  },

  pause: () => {
    set({ isPlaying: false })
  },

  seekTo: (seconds: number) => {
    set({ currentPosition: Math.max(0, seconds) })
  },

  setPlaybackRate: (rate: PlaybackRate) => {
    set({ playbackRate: rate })
  },

  setCurrentPosition: (seconds: number) => {
    set({ currentPosition: Math.max(0, seconds) })
  },

  setDuration: (seconds: number) => {
    set({ duration: Math.max(0, seconds) })
  },

  resetPlayer: () => {
    set(INITIAL_PLAYER_STATE)
  },
}))
