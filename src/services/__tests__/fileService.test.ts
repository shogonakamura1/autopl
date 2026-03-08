import { fileService } from '../fileService'

// expo-file-system をモック
const mockFileExists = jest.fn()
const mockFileDelete = jest.fn()
const mockFileCopy = jest.fn()
const mockFileSize = 0
const mockDirExists = jest.fn()
const mockDirCreate = jest.fn()

jest.mock('expo-file-system', () => {
  const mockDocumentDir = { uri: '/mock/documents/' }
  return {
    Paths: {
      document: mockDocumentDir,
    },
    File: jest.fn().mockImplementation((...args: unknown[]) => {
      // URI を構築
      const parts = args.map((arg) => {
        if (typeof arg === 'string') return arg
        if (arg && typeof arg === 'object' && 'uri' in arg)
          return (arg as { uri: string }).uri
        return ''
      })
      const uri = parts.join('/').replace(/\/+/g, '/')
      return {
        uri,
        get exists() {
          return mockFileExists()
        },
        delete: mockFileDelete,
        copy: mockFileCopy,
        get size() {
          return mockFileSize
        },
      }
    }),
    Directory: jest.fn().mockImplementation((...args: unknown[]) => {
      const parts = args.map((arg) => {
        if (typeof arg === 'string') return arg
        if (arg && typeof arg === 'object' && 'uri' in arg)
          return (arg as { uri: string }).uri
        return ''
      })
      const uri = parts.join('/').replace(/\/+/g, '/')
      return {
        uri,
        get exists() {
          return mockDirExists()
        },
        create: mockDirCreate,
      }
    }),
  }
})

describe('fileService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAudioDirPath', () => {
    it('audio ディレクトリのURIを返す', () => {
      const path = fileService.getAudioDirPath()
      expect(path).toContain('audio')
    })
  })

  describe('ensureAudioDir', () => {
    it('ディレクトリが存在しない場合は作成する', async () => {
      mockDirExists.mockReturnValue(false)

      await fileService.ensureAudioDir()

      expect(mockDirCreate).toHaveBeenCalled()
    })

    it('ディレクトリが存在する場合は作成しない', async () => {
      mockDirExists.mockReturnValue(true)

      await fileService.ensureAudioDir()

      expect(mockDirCreate).not.toHaveBeenCalled()
    })
  })

  describe('copyToAudioDir', () => {
    it('ファイルをaudioディレクトリにコピーしてURIを返す', async () => {
      mockDirExists.mockReturnValue(true)

      const result = await fileService.copyToAudioDir(
        '/source/song.mp3',
        'uuid-1',
        'mp3'
      )

      expect(result).toContain('uuid-1.mp3')
      expect(mockFileCopy).toHaveBeenCalled()
    })
  })

  describe('deleteFile', () => {
    it('ファイルが存在する場合は削除する', async () => {
      mockFileExists.mockReturnValue(true)

      await fileService.deleteFile('/mock/documents/audio/uuid-1.mp3')

      expect(mockFileDelete).toHaveBeenCalled()
    })

    it('ファイルが存在しない場合は削除しない', async () => {
      mockFileExists.mockReturnValue(false)

      await fileService.deleteFile('/mock/documents/audio/uuid-1.mp3')

      expect(mockFileDelete).not.toHaveBeenCalled()
    })
  })

  describe('fileExists', () => {
    it('ファイルが存在する場合はtrueを返す', () => {
      mockFileExists.mockReturnValue(true)

      const result = fileService.fileExists('/mock/documents/audio/uuid-1.mp3')
      expect(result).toBe(true)
    })

    it('ファイルが存在しない場合はfalseを返す', () => {
      mockFileExists.mockReturnValue(false)

      const result = fileService.fileExists('/mock/documents/audio/uuid-1.mp3')
      expect(result).toBe(false)
    })
  })

  describe('getFileSize', () => {
    it('ファイルが存在する場合はサイズを返す', () => {
      mockFileExists.mockReturnValue(true)

      const size = fileService.getFileSize('/mock/documents/audio/uuid-1.mp3')
      expect(size).toBe(0)
    })

    it('ファイルが存在しない場合はnullを返す', () => {
      mockFileExists.mockReturnValue(false)

      const size = fileService.getFileSize('/mock/documents/audio/uuid-1.mp3')
      expect(size).toBeNull()
    })
  })
})
