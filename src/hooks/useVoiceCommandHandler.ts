import { useCallback, useEffect, useRef } from 'react'
import { VoiceCommand, VoiceRecognitionState } from '../types'
import { useVoiceRecognition } from './useVoiceRecognition'
import { usePlayerStore } from '../stores/playerStore'
import { useFileStore } from '../stores/fileStore'
import { useVoiceStore } from '../stores/voiceStore'
import { audioService } from '../services/audioService'
import { soundService } from '../services/soundService'
import { SoundType } from '../constants/sounds'

const SEGMENT_COUNT = 10
const VOLUME_STEP = 0.1
const DEFAULT_VOLUME = 1.0

interface UseVoiceCommandHandlerResult {
  startListening: () => void
  stopListening: () => void
}

export const useVoiceCommandHandler = (): UseVoiceCommandHandlerResult => {
  const volumeRef = useRef(DEFAULT_VOLUME)

  const hasMicPermission = useVoiceStore((state) => state.hasMicPermission)
  const selectedFileId = useFileStore((state) => state.selectedFileId)

  const handleCommandRecognized = useCallback(
    async (command: VoiceCommand) => {
      const { duration, currentPosition } = usePlayerStore.getState()

      try {
        switch (command) {
          case VoiceCommand.PLAY:
            await audioService.play()
            break

          case VoiceCommand.PAUSE:
            await audioService.pause()
            break

          case VoiceCommand.NEXT: {
            if (duration <= 0) break
            const segmentDuration = duration / SEGMENT_COUNT
            const currentSegment = Math.floor(
              currentPosition / segmentDuration
            )
            const nextSegment = Math.min(
              SEGMENT_COUNT - 1,
              currentSegment + 1
            )
            await audioService.seekTo(nextSegment * segmentDuration)
            usePlayerStore.getState().seekTo(nextSegment * segmentDuration)
            break
          }

          case VoiceCommand.PREVIOUS: {
            if (duration <= 0) break
            const segmentDuration = duration / SEGMENT_COUNT
            const currentSegment = Math.floor(
              currentPosition / segmentDuration
            )
            const previousSegment = Math.max(0, currentSegment - 1)
            await audioService.seekTo(previousSegment * segmentDuration)
            usePlayerStore
              .getState()
              .seekTo(previousSegment * segmentDuration)
            break
          }

          case VoiceCommand.SKIP_TO_START:
            await audioService.seekTo(0)
            usePlayerStore.getState().seekTo(0)
            break

          case VoiceCommand.VOLUME_UP: {
            const newVolumeUp = Math.min(
              DEFAULT_VOLUME,
              volumeRef.current + VOLUME_STEP
            )
            await audioService.setVolume(newVolumeUp)
            volumeRef.current = newVolumeUp
            break
          }

          case VoiceCommand.VOLUME_DOWN: {
            const newVolumeDown = Math.max(0, volumeRef.current - VOLUME_STEP)
            await audioService.setVolume(newVolumeDown)
            volumeRef.current = newVolumeDown
            break
          }
        }

        await soundService.play(SoundType.SUCCESS)
      } catch (error) {
        console.error(
          '[useVoiceCommandHandler] command execution failed:',
          error
        )
        await soundService.play(SoundType.FAILURE)
      }
    },
    []
  )

  const {
    startWakeWordListening,
    stopListening,
    recognitionState,
  } = useVoiceRecognition(handleCommandRecognized)

  // マイク権限あり ＋ ファイル選択時に自動でウェイクワード検出開始
  useEffect(() => {
    if (hasMicPermission && selectedFileId) {
      if (recognitionState === VoiceRecognitionState.IDLE) {
        startWakeWordListening()
      }
    }
  }, [hasMicPermission, selectedFileId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    startListening: startWakeWordListening,
    stopListening,
  }
}
