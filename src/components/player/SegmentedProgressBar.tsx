import React, { useMemo } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Text, useTheme } from 'react-native-paper'

const SEGMENT_COUNT = 10

interface SegmentedProgressBarProps {
  currentPosition: number
  duration: number
  onSegmentPress: (seconds: number) => void
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  currentPosition,
  duration,
  onSegmentPress,
}) => {
  const { colors } = useTheme()

  const segments = useMemo(() => {
    if (duration <= 0) {
      return Array.from({ length: SEGMENT_COUNT }, (_, index) => ({
        index,
        startTime: 0,
        endTime: 0,
        progress: 0,
      }))
    }

    const segmentDuration = duration / SEGMENT_COUNT
    return Array.from({ length: SEGMENT_COUNT }, (_, index) => {
      const startTime = index * segmentDuration
      const endTime = (index + 1) * segmentDuration
      let progress = 0
      if (currentPosition >= endTime) {
        progress = 1
      } else if (currentPosition > startTime) {
        progress = (currentPosition - startTime) / segmentDuration
      }
      return { index, startTime, endTime, progress }
    })
  }, [currentPosition, duration])

  return (
    <View style={styles.container}>
      {segments.map((segment) => (
        <Pressable
          key={segment.index}
          style={[
            styles.segmentRow,
            { backgroundColor: colors.surfaceVariant },
          ]}
          onPress={() => onSegmentPress(segment.startTime)}
          accessibilityLabel={`第${segment.index + 1}区間 ${formatTime(segment.startTime)}`}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.segmentFill,
              {
                backgroundColor: colors.primary,
                width: `${Math.min(segment.progress * 100, 100)}%`,
              },
            ]}
          />
          <View style={styles.segmentLabel}>
            <Text
              variant="labelSmall"
              style={{ color: colors.onSurfaceVariant }}
            >
              第{segment.index + 1}段
            </Text>
            <Text
              variant="labelSmall"
              style={{ color: colors.onSurfaceVariant }}
            >
              {formatTime(segment.startTime)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentRow: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  segmentFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  segmentLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 1,
  },
})
