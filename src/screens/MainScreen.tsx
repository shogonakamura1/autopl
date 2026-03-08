import React, { useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { Appbar, Text, useTheme } from 'react-native-paper'
import { DrawerNavigationProp } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { DrawerParamList, RootStackParamList } from '../navigation/types'
import { SegmentedProgressBar } from '../components/player/SegmentedProgressBar'
import { PlayerControls } from '../components/player/PlayerControls'
import { PlaybackRateSelector } from '../components/player/PlaybackRateSelector'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { PlaybackRate } from '../types'

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, 'Main'>
}

const SEGMENT_COUNT = 10

export const MainScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme()
  const stackNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [isRateSelectorVisible, setIsRateSelectorVisible] = useState(false)

  const {
    isPlaying,
    currentPosition,
    duration,
    playbackRate,
    selectedFile,
    play,
    pause,
    seekTo,
    changePlaybackRate,
  } = useAudioPlayer()

  const handleSegmentPress = useCallback(
    (seconds: number) => {
      seekTo(seconds)
    },
    [seekTo]
  )

  const handleSkipBack = useCallback(() => {
    if (duration <= 0) return
    const segmentDuration = duration / SEGMENT_COUNT
    const currentSegment = Math.floor(currentPosition / segmentDuration)
    const previousSegment = Math.max(0, currentSegment - 1)
    seekTo(previousSegment * segmentDuration)
  }, [duration, currentPosition, seekTo])

  const handleSkipForward = useCallback(() => {
    if (duration <= 0) return
    const segmentDuration = duration / SEGMENT_COUNT
    const currentSegment = Math.floor(currentPosition / segmentDuration)
    const nextSegment = Math.min(SEGMENT_COUNT - 1, currentSegment + 1)
    seekTo(nextSegment * segmentDuration)
  }, [duration, currentPosition, seekTo])

  const handleRateSelect = useCallback(
    (rate: PlaybackRate) => {
      changePlaybackRate(rate)
      setIsRateSelectorVisible(false)
    },
    [changePlaybackRate]
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={{ backgroundColor: colors.surface }}>
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.openDrawer()}
          accessibilityLabel="メニューを開く"
        />
        <Appbar.Content
          title={selectedFile?.name ?? 'Autopl'}
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action
          icon="cog"
          onPress={() => stackNavigation.navigate('Settings')}
          accessibilityLabel="設定"
        />
      </Appbar.Header>

      {selectedFile ? (
        <SegmentedProgressBar
          currentPosition={currentPosition}
          duration={duration}
          onSegmentPress={handleSegmentPress}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text
            variant="bodyLarge"
            style={{ color: colors.onSurfaceVariant }}
          >
            音楽ファイルをインポートして
          </Text>
          <Text
            variant="bodyLarge"
            style={{ color: colors.onSurfaceVariant }}
          >
            練習を開始してください
          </Text>
        </View>
      )}

      <PlayerControls
        isPlaying={isPlaying}
        currentPosition={currentPosition}
        duration={duration}
        playbackRate={playbackRate}
        onPlay={play}
        onPause={pause}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onPlaybackRatePress={() => setIsRateSelectorVisible(true)}
      />

      <PlaybackRateSelector
        visible={isRateSelectorVisible}
        currentRate={playbackRate}
        onSelect={handleRateSelect}
        onDismiss={() => setIsRateSelectorVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
})
