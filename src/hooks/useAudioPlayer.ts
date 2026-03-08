import { useEffect, useCallback, useRef } from 'react'
import { Event, State } from 'react-native-track-player'
import TrackPlayer from 'react-native-track-player'
import { usePlayerStore } from '../stores/playerStore'
import { useFileStore } from '../stores/fileStore'
import { audioService } from '../services/audioService'
import { PlaybackRate } from '../types'

const PROGRESS_UPDATE_INTERVAL_MS = 250

export const useAudioPlayer = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const currentPosition = usePlayerStore((state) => state.currentPosition)
  const duration = usePlayerStore((state) => state.duration)
  const playbackRate = usePlayerStore((state) => state.playbackRate)
  const storePlay = usePlayerStore((state) => state.play)
  const storePause = usePlayerStore((state) => state.pause)
  const storeSeekTo = usePlayerStore((state) => state.seekTo)
  const setCurrentPosition = usePlayerStore(
    (state) => state.setCurrentPosition
  )
  const setDuration = usePlayerStore((state) => state.setDuration)
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate)
  const resetPlayer = usePlayerStore((state) => state.resetPlayer)

  const files = useFileStore((state) => state.files)
  const selectedFileId = useFileStore((state) => state.selectedFileId)

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null

  // 進捗ポーリング
  const startProgressUpdates = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(async () => {
      try {
        const progress = await audioService.getProgress()
        setCurrentPosition(progress.position)
        if (progress.duration > 0) {
          setDuration(progress.duration)
        }
      } catch {
        // エラーは握りつぶさない（console.errorはaudioService内で出力済み）
      }
    }, PROGRESS_UPDATE_INTERVAL_MS)
  }, [setCurrentPosition, setDuration])

  const stopProgressUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ファイル選択時にトラックを読み込む
  useEffect(() => {
    let cancelled = false

    const loadSelectedFile = async () => {
      if (!selectedFile) {
        resetPlayer()
        await audioService.reset()
        return
      }

      try {
        await audioService.loadTrack(selectedFile.path, selectedFile.name)
        if (!cancelled) {
          resetPlayer()
          const progress = await audioService.getProgress()
          if (!cancelled && progress.duration > 0) {
            setDuration(progress.duration)
          }
        }
      } catch (error) {
        console.error('[useAudioPlayer] loadSelectedFile failed:', error)
      }
    }

    loadSelectedFile()
    return () => {
      cancelled = true
    }
  }, [selectedFile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // TrackPlayer のイベントリスナー
  useEffect(() => {
    const playbackStateSubscription = TrackPlayer.addEventListener(
      Event.PlaybackState,
      (event) => {
        if (
          event.state === State.Playing ||
          event.state === State.Buffering
        ) {
          storePlay()
          startProgressUpdates()
        } else if (
          event.state === State.Paused ||
          event.state === State.Stopped ||
          event.state === State.Ready
        ) {
          storePause()
          stopProgressUpdates()
        }
      }
    )

    const playbackEndSubscription = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      () => {
        storePause()
        stopProgressUpdates()
        storeSeekTo(0)
      }
    )

    return () => {
      playbackStateSubscription.remove()
      playbackEndSubscription.remove()
      stopProgressUpdates()
    }
  }, [storePlay, storePause, storeSeekTo, startProgressUpdates, stopProgressUpdates])

  // アクション
  const play = useCallback(async () => {
    try {
      await audioService.play()
    } catch (error) {
      console.error('[useAudioPlayer] play failed:', error)
    }
  }, [])

  const pause = useCallback(async () => {
    try {
      await audioService.pause()
    } catch (error) {
      console.error('[useAudioPlayer] pause failed:', error)
    }
  }, [])

  const seekTo = useCallback(async (seconds: number) => {
    try {
      await audioService.seekTo(seconds)
      storeSeekTo(seconds)
    } catch (error) {
      console.error('[useAudioPlayer] seekTo failed:', error)
    }
  }, [storeSeekTo])

  const changePlaybackRate = useCallback(
    async (rate: PlaybackRate) => {
      try {
        await audioService.setRate(rate)
        setPlaybackRate(rate)
      } catch (error) {
        console.error('[useAudioPlayer] changePlaybackRate failed:', error)
      }
    },
    [setPlaybackRate]
  )

  return {
    isPlaying,
    currentPosition,
    duration,
    playbackRate,
    selectedFile,
    play,
    pause,
    seekTo,
    changePlaybackRate,
  }
}
