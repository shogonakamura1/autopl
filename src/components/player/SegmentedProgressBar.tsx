import React, { useMemo, useRef, useCallback } from 'react'
import { View, StyleSheet, Pressable, GestureResponderEvent } from 'react-native'
import { useTheme } from 'react-native-paper'

const SEGMENT_COUNT = 10

interface SegmentedProgressBarProps {
  currentPosition: number
  duration: number
  onSegmentPress: (seconds: number) => void
}

export const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  currentPosition,
  duration,
  onSegmentPress,
}) => {
  const { colors } = useTheme()
  const segmentWidthRef = useRef(0)

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

  const handlePress = useCallback(
    (event: GestureResponderEvent, startTime: number, endTime: number) => {
      if (duration <= 0 || segmentWidthRef.current <= 0) return
      const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / segmentWidthRef.current))
      const exactTime = startTime + ratio * (endTime - startTime)
      onSegmentPress(exactTime)
    },
    [duration, onSegmentPress]
  )

  return (
    <View style={styles.container}>
      {segments.map((segment) => (
        <Pressable
          key={segment.index}
          style={[
            styles.segmentRow,
            { backgroundColor: colors.surfaceVariant },
          ]}
          onLayout={(e) => { segmentWidthRef.current = e.nativeEvent.layout.width }}
          onPress={(event) => handlePress(event, segment.startTime, segment.endTime)}
          accessibilityLabel={`区間${segment.index + 1}`}
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
})
