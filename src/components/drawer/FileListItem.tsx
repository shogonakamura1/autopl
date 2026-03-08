import React, { useCallback, useRef } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Pressable,
} from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { AudioFile } from '../../types'

const SWIPE_THRESHOLD = -80
const DELETE_BUTTON_WIDTH = 80

interface FileListItemProps {
  file: AudioFile
  isSelected: boolean
  onPress: (id: string) => void
  onDelete: (file: AudioFile) => void
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const FileListItem: React.FC<FileListItemProps> = ({
  file,
  isSelected,
  onPress,
  onDelete,
}) => {
  const { colors } = useTheme()
  const translateX = useRef(new Animated.Value(0)).current
  const isSwipeOpen = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = isSwipeOpen.current
          ? gestureState.dx - DELETE_BUTTON_WIDTH
          : gestureState.dx
        if (newX <= 0) {
          translateX.setValue(newX)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentX = isSwipeOpen.current
          ? gestureState.dx - DELETE_BUTTON_WIDTH
          : gestureState.dx

        if (currentX < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
          }).start()
          isSwipeOpen.current = true
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start()
          isSwipeOpen.current = false
        }
      },
    })
  ).current

  const handlePress = useCallback(() => {
    if (isSwipeOpen.current) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start()
      isSwipeOpen.current = false
      return
    }
    onPress(file.id)
  }, [file.id, onPress, translateX])

  const handleDelete = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      isSwipeOpen.current = false
    })
    onDelete(file)
  }, [file, onDelete, translateX])

  const displayName = file.name.replace(/\.[^.]+$/, '')

  return (
    <View style={styles.wrapper}>
      <View style={styles.deleteButtonContainer}>
        <Pressable
          style={[
            styles.deleteButton,
            { backgroundColor: colors.error },
          ]}
          onPress={handleDelete}
          accessibilityLabel={`${file.name}を削除`}
          accessibilityRole="button"
        >
          <Text style={[styles.deleteText, { color: colors.onError }]}>
            削除
          </Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.itemContainer,
          {
            backgroundColor: isSelected
              ? colors.primaryContainer
              : colors.surface,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.contentArea}
          onPress={handlePress}
          accessibilityLabel={`${file.name}${isSelected ? '（選択中）' : ''}`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <View style={styles.textContainer}>
            <Text
              variant="bodyLarge"
              style={{
                color: isSelected
                  ? colors.onPrimaryContainer
                  : colors.onSurface,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayName}
            </Text>
            {file.duration > 0 && (
              <Text
                variant="bodySmall"
                style={{
                  color: isSelected
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant,
                  opacity: 0.7,
                }}
              >
                {formatDuration(file.duration)}
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontWeight: '600',
    fontSize: 14,
  },
  itemContainer: {
    minHeight: 56,
  },
  contentArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
})
