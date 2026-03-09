const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
  currentTime: 0,
  duration: 0,
  playing: false,
}

const createAudioPlayer = jest.fn().mockReturnValue(mockPlayer)
const setAudioModeAsync = jest.fn().mockResolvedValue(undefined)

module.exports = { createAudioPlayer, setAudioModeAsync }
