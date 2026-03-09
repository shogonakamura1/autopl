import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Icon, IconButton, Text, useTheme } from 'react-native-paper'
import { PlaybackRate } from '../../types'

interface PlayerControlsProps {
  isPlaying: boolean
  currentPosition: number
  duration: number
  playbackRate: PlaybackRate
  onPlay: () => void
  onPause: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  onPlaybackRatePress: () => void
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatRate = (rate: PlaybackRate): string => {
  if (rate === PlaybackRate.NORMAL) return '1x'
  return `${rate}x`
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentPosition,
  duration,
  playbackRate,
  onPlay,
  onPause,
  onSkipBack,
  onSkipForward,
  onPlaybackRatePress,
}) => {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text
        variant="bodySmall"
        style={[styles.timeText, { color: colors.onSurfaceVariant }]}
      >
        {formatTime(currentPosition)} / {formatTime(duration)}
      </Text>
      <View style={styles.controlsRow}>
        <IconButton
          icon="skip-previous"
          size={32}
          iconColor={colors.onSurface}
          onPress={onSkipBack}
          accessibilityLabel="前の区間"
        />
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          size={48}
          mode="contained"
          containerColor={colors.primary}
          iconColor={colors.onPrimary}
          onPress={isPlaying ? onPause : onPlay}
          accessibilityLabel={isPlaying ? '一時停止' : '再生'}
        />
        <IconButton
          icon="skip-next"
          size={32}
          iconColor={colors.onSurface}
          onPress={onSkipForward}
          accessibilityLabel="次の区間"
        />
        <Pressable
          onPress={onPlaybackRatePress}
          style={({ pressed }) => [
            styles.rateButton,
            { backgroundColor: pressed ? colors.surfaceVariant : colors.surface },
          ]}
          accessibilityLabel={`再生速度 ${formatRate(playbackRate)}`}
          accessibilityRole="button"
        >
          <Icon source="speedometer" size={18} color={colors.onSurfaceVariant} />
          <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
            {formatRate(playbackRate)}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  timeText: {
    textAlign: 'center',
    marginBottom: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
})
