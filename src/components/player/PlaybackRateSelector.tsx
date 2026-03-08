import React from 'react'
import { StyleSheet } from 'react-native'
import { Modal, Portal, Button, useTheme } from 'react-native-paper'
import { View } from 'react-native'
import { PlaybackRate } from '../../types'
import { PLAYBACK_RATE_OPTIONS } from '../../constants/defaults'

interface PlaybackRateSelectorProps {
  visible: boolean
  currentRate: PlaybackRate
  onSelect: (rate: PlaybackRate) => void
  onDismiss: () => void
}

export const PlaybackRateSelector: React.FC<PlaybackRateSelectorProps> = ({
  visible,
  currentRate,
  onSelect,
  onDismiss,
}) => {
  const { colors } = useTheme()

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
        <View style={styles.content}>
          {PLAYBACK_RATE_OPTIONS.map((option) => (
            <Button
              key={option.rate}
              mode={currentRate === option.rate ? 'contained' : 'outlined'}
              onPress={() => onSelect(option.rate)}
              style={styles.button}
              accessibilityLabel={`再生速度 ${option.label}`}
            >
              {option.label}
            </Button>
          ))}
        </View>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 40,
    borderRadius: 16,
    padding: 20,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  button: {
    minWidth: 70,
  },
})
