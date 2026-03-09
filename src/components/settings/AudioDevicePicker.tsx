import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Menu, Text, TouchableRipple, useTheme } from 'react-native-paper'
import type { AudioPort } from '../../../modules/audio-route'

interface Props {
  icon: string
  selectedUID: string | null
  devices: AudioPort[]
  onSelect: (uid: string) => void
  accessibilityLabel: string
}

export const AudioDevicePicker: React.FC<Props> = ({
  icon,
  selectedUID,
  devices,
  onSelect,
  accessibilityLabel,
}) => {
  const { colors } = useTheme()
  const [menuVisible, setMenuVisible] = useState(false)

  const selectedDevice = devices.find((d) => d.uid === selectedUID) ?? devices[0]

  if (devices.length === 0) return null

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <TouchableRipple
          onPress={() => setMenuVisible(true)}
          style={[
            styles.picker,
            {
              borderColor: colors.outline,
              backgroundColor: colors.surfaceVariant,
            },
          ]}
          accessibilityLabel={accessibilityLabel}
          borderless={false}
        >
          <View style={styles.pickerContent}>
            <Text
              variant="bodyMedium"
              style={[styles.deviceName, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {icon} {selectedDevice?.name ?? '—'}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              ▼
            </Text>
          </View>
        </TouchableRipple>
      }
    >
      {devices.map((device) => (
        <Menu.Item
          key={device.uid}
          title={device.name}
          onPress={() => {
            onSelect(device.uid)
            setMenuVisible(false)
          }}
          leadingIcon={
            device.uid === (selectedUID ?? devices[0]?.uid) ? 'check' : undefined
          }
        />
      ))}
    </Menu>
  )
}

const styles = StyleSheet.create({
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
  },
  pickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    flex: 1,
  },
})
