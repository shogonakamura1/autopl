const mockSound = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  setPositionAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
}

const Audio = {
  Sound: {
    createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}

const InterruptionModeIOS = { MixWithOthers: 0 }
const InterruptionModeAndroid = { DuckOthers: 1 }

module.exports = { Audio, InterruptionModeIOS, InterruptionModeAndroid }
