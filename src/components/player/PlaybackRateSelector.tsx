import React, { useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import Slider from '@react-native-community/slider'
import { Modal, Portal, Text, Button, useTheme } from 'react-native-paper'
import { PlaybackRate } from '../../types'

interface PlaybackRateSelectorProps {
  visible: boolean
  currentRate: PlaybackRate
  onSelect: (rate: PlaybackRate) => void
  onDismiss: () => void
}

/**
 * スライダーの値（0〜1）を再生速度に変換する
 *
 * 設計: 1倍未満のレンジを広く（スライダー0〜0.75）、1倍以降を短く（0.75〜1.0）
 *   0.00 → 0.25x
 *   0.75 → 1.00x
 *   1.00 → 2.00x
 */
const sliderToRate = (value: number): number => {
  if (value <= 0.75) {
    // 0〜0.75 → 0.25〜1.00x (線形)
    return 0.25 + value * (0.75 / 0.75)
  } else {
    // 0.75〜1.0 → 1.00〜2.00x (線形)
    return 1.0 + (value - 0.75) * (1.0 / 0.25)
  }
}

const rateToSlider = (rate: number): number => {
  if (rate <= 1.0) {
    return ((rate - 0.25) / 0.75) * 0.75
  } else {
    return 0.75 + ((rate - 1.0) / 1.0) * 0.25
  }
}

const formatRate = (rate: number): string => {
  if (rate < 1) return `${(rate * 100).toFixed(0)}%`
  return `${rate.toFixed(2).replace(/\.?0+$/, '')}x`
}

export const PlaybackRateSelector: React.FC<PlaybackRateSelectorProps> = ({
  visible,
  currentRate,
  onSelect,
  onDismiss,
}) => {
  const { colors } = useTheme()
  const [sliderValue, setSliderValue] = useState(rateToSlider(currentRate))
  const [thumbRate, setThumbRate] = useState(currentRate)

  const handleValueChange = useCallback((value: number) => {
    setSliderValue(value)
    const rate = Math.round(sliderToRate(value) * 100) / 100
    setThumbRate(rate as PlaybackRate)
  }, [])

  const handleSlidingComplete = useCallback(
    (value: number) => {
      const rate = Math.round(sliderToRate(value) * 100) / 100
      onSelect(rate as PlaybackRate)
    },
    [onSelect]
  )

  const thumbPosition = sliderValue

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: colors.surface },
        ]}
      >
        <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]}>
          再生速度
        </Text>

        <View style={styles.sliderContainer}>
          {/* つまみの真上に速度表示 */}
          <View
            style={[
              styles.thumbLabel,
              { left: `${thumbPosition * 100}%` as unknown as number },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.thumbLabelBubble, { backgroundColor: colors.primary }]}>
              <Text variant="labelLarge" style={{ color: colors.onPrimary, fontWeight: 'bold' }}>
                {formatRate(thumbRate)}
              </Text>
            </View>
            <View style={[styles.thumbLabelArrow, { borderTopColor: colors.primary }]} />
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={sliderValue}
            onValueChange={handleValueChange}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.surfaceVariant}
            thumbTintColor={colors.primary}
            accessibilityLabel={`再生速度 ${formatRate(thumbRate)}`}
          />

          <View style={styles.labels}>
            <Text variant="bodySmall" style={[styles.labelAbs, { left: 0, color: colors.onSurfaceVariant }]}>0.25x</Text>
            <Text variant="bodySmall" style={[styles.labelAbs, { left: '25%' as unknown as number, transform: [{ translateX: -14 }], color: colors.onSurfaceVariant }]}>0.5x</Text>
            <Text variant="bodySmall" style={[styles.labelAbs, { left: '75%' as unknown as number, transform: [{ translateX: -8 }], color: colors.onSurfaceVariant }]}>1x</Text>
            <Text variant="bodySmall" style={[styles.labelAbs, { right: 0, color: colors.onSurfaceVariant }]}>2x</Text>
          </View>
        </View>

        <Button onPress={onDismiss} style={styles.closeButton}>
          閉じる
        </Button>
      </Modal>
    </Portal>
  )
}

const SLIDER_HORIZONTAL_PADDING = 16

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
  },
  sliderContainer: {
    paddingHorizontal: SLIDER_HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  thumbLabel: {
    position: 'absolute',
    top: -44,
    alignItems: 'center',
    transform: [{ translateX: -28 }],
    zIndex: 10,
  },
  thumbLabelBubble: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  thumbLabelArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    position: 'relative',
    height: 20,
    marginTop: 4,
  },
  labelAbs: {
    position: 'absolute',
  },
  closeButton: {
    marginTop: 8,
  },
})
