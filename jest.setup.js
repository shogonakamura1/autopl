// AsyncStorage mock for tests
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {}
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key, value) => {
        store[key] = value
        return Promise.resolve()
      }),
      removeItem: jest.fn((key) => {
        delete store[key]
        return Promise.resolve()
      }),
      multiGet: jest.fn((keys) =>
        Promise.resolve(keys.map((key) => [key, store[key] || null]))
      ),
      multiSet: jest.fn((entries) => {
        entries.forEach(([key, value]) => {
          store[key] = value
        })
        return Promise.resolve()
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach((key) => delete store[key])
        return Promise.resolve()
      }),
      clear: jest.fn(() => {
        store = {}
        return Promise.resolve()
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    },
  }
})
