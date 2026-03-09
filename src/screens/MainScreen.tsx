import React, { useState, useCallback, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Appbar, Snackbar, Text, useTheme } from 'react-native-paper'
import { DrawerNavigationProp } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { DrawerParamList, RootStackParamList } from '../navigation/types'
import { SegmentedProgressBar } from '../components/player/SegmentedProgressBar'
import { PlayerControls } from '../components/player/PlayerControls'
import { PlaybackRateSelector } from '../components/player/PlaybackRateSelector'
import { ListeningIndicator } from '../components/player/ListeningIndicator'
import { StatusBanners } from '../components/common/StatusBanners'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useVoiceStore } from '../stores/voiceStore'
import { PlaybackRate, VoiceRecognitionState } from '../types'

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, 'Main'>
}

const SEGMENT_COUNT = 10

export const MainScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme()
  const stackNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [isRateSelectorVisible, setIsRateSelectorVisible] = useState(false)
  const [isFailureSnackbarVisible, setIsFailureSnackbarVisible] =
    useState(false)

  const recognitionState = useVoiceStore((state) => state.recognitionState)
  const previousRecognitionStateRef = React.useRef(recognitionState)

  const isListeningModalVisible =
    recognitionState === VoiceRecognitionState.LISTENING_FOR_COMMAND ||
    recognitionState === VoiceRecognitionState.PROCESSING

  useEffect(() => {
    const previousState = previousRecognitionStateRef.current
    previousRecognitionStateRef.current = recognitionState

    const wasListeningOrProcessing =
      previousState === VoiceRecognitionState.LISTENING_FOR_COMMAND ||
      previousState === VoiceRecognitionState.PROCESSING

    const isNowIdle =
      recognitionState === VoiceRecognitionState.IDLE ||
      recognitionState === VoiceRecognitionState.LISTENING_FOR_WAKEWORD

    if (wasListeningOrProcessing && isNowIdle) {
      const lastText = useVoiceStore.getState().lastRecognizedText
      if (lastText === null) {
        setIsFailureSnackbarVisible(true)
      }
    }
  }, [recognitionState])

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

      <StatusBanners />

      {selectedFile ? (
        <SegmentedProgressBar
          currentPosition={currentPosition}
          duration={duration}
          onSegmentPress={handleSegmentPress}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={{ color: colors.onSurfaceVariant }}>
            🎵
          </Text>
          <Text
            variant="bodyLarge"
            style={{ color: colors.onSurface, marginTop: 12 }}
          >
            ファイルが選択されていません
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center', lineHeight: 22 }}
          >
            左上の <Text style={{ fontWeight: 'bold' }}>≡</Text> をタップしてドロワーを開き、{'\n'}
            <Text style={{ fontWeight: 'bold' }}>+</Text> ボタンから音楽ファイルをインポートしてください
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: colors.onSurfaceVariant, marginTop: 16, opacity: 0.7 }}
          >
            対応形式: mp3 / wav / m4a
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

      <ListeningIndicator visible={isListeningModalVisible} />

      <Snackbar
        visible={isFailureSnackbarVisible}
        onDismiss={() => setIsFailureSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: colors.errorContainer }}
        action={{
          label: '閉じる',
          onPress: () => setIsFailureSnackbarVisible(false),
        }}
      >
        <Text style={{ color: colors.onErrorContainer }}>
          認識できませんでした
        </Text>
      </Snackbar>
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
