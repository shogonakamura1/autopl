import TrackPlayer, { Event } from 'react-native-track-player'

/**
 * TrackPlayer のバックグラウンドサービスハンドラー
 * アプリ起動時に registerPlaybackService で登録する
 */
export async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play())
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause())
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop())
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) =>
    TrackPlayer.seekTo(event.position)
  )
}
