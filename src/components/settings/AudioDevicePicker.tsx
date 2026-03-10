import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Icon, Menu, Text, TouchableRipple, useTheme } from 'react-native-paper'
import type { AudioPort } from '../../../modules/audio-route'

interface Props {
  iconName: string
  selectedUID: string | null
  devices: AudioPort[]
  onSelect: (uid: string) => void
  accessibilityLabel: string
}

export const AudioDevicePicker: React.FC<Props> = ({
  iconName,
  selectedUID,
  devices,
  onSelect,
  accessibilityLabel,
}) => {
  const { colors } = useTheme()
  const [menuVisible, setMenuVisible] = useState(false)

  const selectedDevice = devices.find((d) => d.uid === selectedUID) ?? devices[0]

  if (devices.length === 0) return null

  // react-native-paper の Menu は anchor を内部 View で包むため、
  // flex: 1 を効かせるには外側の View が必要
  return (
    <View style={styles.wrapper}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableRipple
            onPress={() => setMenuVisible(true)}
            style={[
              styles.pill,
              {
                borderColor: colors.outline,
                backgroundColor: colors.surfaceVariant,
              },
            ]}
            accessibilityLabel={accessibilityLabel}
            borderless={false}
          >
            <View style={styles.pillContent}>
              <Icon source={iconName} size={14} color={colors.onSurfaceVariant} />
              <Text
                variant="bodySmall"
                style={[styles.deviceName, { color: colors.onSurface }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedDevice?.name ?? '—'}
              </Text>
              <Icon source="chevron-down" size={14} color={colors.onSurfaceVariant} />
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
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceName: {
    flex: 1,
  },
})
