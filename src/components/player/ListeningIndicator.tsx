import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { Modal, Portal, Text, useTheme } from 'react-native-paper'
import { VoiceRecognitionState } from '../../types'
import { useVoiceStore } from '../../stores/voiceStore'

const CIRCLE_COUNT = 3
const ANIMATION_DURATION = 1200

interface ListeningIndicatorProps {
  visible: boolean
}

export const ListeningIndicator: React.FC<ListeningIndicatorProps> = ({
  visible,
}) => {
  const { colors } = useTheme()
  const recognitionState = useVoiceStore((state) => state.recognitionState)

  const pulseAnimations = useRef(
    Array.from({ length: CIRCLE_COUNT }, () => new Animated.Value(0))
  ).current

  useEffect(() => {
    if (!visible) return

    const animations = pulseAnimations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * (ANIMATION_DURATION / CIRCLE_COUNT)),
          Animated.timing(anim, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    )

    animations.forEach((animation) => animation.start())

    return () => {
      animations.forEach((animation) => animation.stop())
      pulseAnimations.forEach((anim) => anim.setValue(0))
    }
  }, [visible, pulseAnimations])

  const isListening =
    recognitionState === VoiceRecognitionState.LISTENING_FOR_COMMAND
  const isProcessing = recognitionState === VoiceRecognitionState.PROCESSING

  const statusText = isProcessing ? '処理中...' : '聞き取り中...'

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={false}
        contentContainerStyle={styles.modalContainer}
      >
        <View
          style={[
            styles.indicatorContainer,
            { backgroundColor: colors.surface + 'E6' },
          ]}
        >
          <View style={styles.circleContainer}>
            {pulseAnimations.map((anim, index) => {
              const scale = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1.4],
              })
              const opacity = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 0.4, 0],
              })

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.pulseCircle,
                    {
                      backgroundColor: colors.primary,
                      transform: [{ scale }],
                      opacity,
                    },
                  ]}
                />
              )
            })}
            <View
              style={[
                styles.centerCircle,
                {
                  backgroundColor: isListening || isProcessing
                    ? colors.primary
                    : colors.surfaceVariant,
                },
              ]}
            />
          </View>

          <Text
            variant="titleMedium"
            style={[styles.statusText, { color: colors.onSurface }]}
            accessibilityLabel={statusText}
            accessibilityRole="text"
          >
            {statusText}
          </Text>
        </View>
      </Modal>
    </Portal>
  )
}

const INDICATOR_SIZE = 160
const CENTER_CIRCLE_SIZE = 48
const PULSE_CIRCLE_SIZE = 80

const styles = StyleSheet.create({
  modalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    width: INDICATOR_SIZE,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  circleContainer: {
    width: PULSE_CIRCLE_SIZE * 1.8,
    height: PULSE_CIRCLE_SIZE * 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseCircle: {
    position: 'absolute',
    width: PULSE_CIRCLE_SIZE,
    height: PULSE_CIRCLE_SIZE,
    borderRadius: PULSE_CIRCLE_SIZE / 2,
  },
  centerCircle: {
    width: CENTER_CIRCLE_SIZE,
    height: CENTER_CIRCLE_SIZE,
    borderRadius: CENTER_CIRCLE_SIZE / 2,
  },
  statusText: {
    textAlign: 'center',
  },
})
