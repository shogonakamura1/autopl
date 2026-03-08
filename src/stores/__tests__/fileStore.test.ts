import { useFileStore } from '../fileStore'
import { AudioFile } from '../../types'

const createMockFile = (overrides?: Partial<AudioFile>): AudioFile => ({
  id: 'test-uuid-1',
  name: 'test-song.mp3',
  path: '/documents/audio/test-uuid-1.mp3',
  duration: 240,
  createdAt: Date.now(),
  ...overrides,
})

describe('fileStore', () => {
  beforeEach(() => {
    useFileStore.setState({
      files: [],
      selectedFileId: null,
    })
  })

  describe('addFile', () => {
    it('ファイルを追加するとfiles配列に含まれる', () => {
      const file = createMockFile()
      useFileStore.getState().addFile(file)

      expect(useFileStore.getState().files).toHaveLength(1)
      expect(useFileStore.getState().files[0]).toEqual(file)
    })

    it('複数ファイルを追加できる', () => {
      const file1 = createMockFile({ id: 'uuid-1', name: 'song1.mp3' })
      const file2 = createMockFile({ id: 'uuid-2', name: 'song2.mp3' })

      useFileStore.getState().addFile(file1)
      useFileStore.getState().addFile(file2)

      expect(useFileStore.getState().files).toHaveLength(2)
    })
  })

  describe('removeFile', () => {
    it('指定IDのファイルが削除される', () => {
      const file1 = createMockFile({ id: 'uuid-1' })
      const file2 = createMockFile({ id: 'uuid-2' })

      useFileStore.setState({ files: [file1, file2] })
      useFileStore.getState().removeFile('uuid-1')

      expect(useFileStore.getState().files).toHaveLength(1)
      expect(useFileStore.getState().files[0].id).toBe('uuid-2')
    })

    it('選択中のファイルを削除すると選択がクリアされる', () => {
      const file = createMockFile({ id: 'uuid-1' })

      useFileStore.setState({ files: [file], selectedFileId: 'uuid-1' })
      useFileStore.getState().removeFile('uuid-1')

      expect(useFileStore.getState().selectedFileId).toBeNull()
    })

    it('選択中でないファイルを削除しても選択は維持される', () => {
      const file1 = createMockFile({ id: 'uuid-1' })
      const file2 = createMockFile({ id: 'uuid-2' })

      useFileStore.setState({
        files: [file1, file2],
        selectedFileId: 'uuid-1',
      })
      useFileStore.getState().removeFile('uuid-2')

      expect(useFileStore.getState().selectedFileId).toBe('uuid-1')
    })
  })

  describe('selectFile', () => {
    it('存在するファイルIDを指定すると選択される', () => {
      const file = createMockFile({ id: 'uuid-1' })

      useFileStore.setState({ files: [file] })
      useFileStore.getState().selectFile('uuid-1')

      expect(useFileStore.getState().selectedFileId).toBe('uuid-1')
    })

    it('存在しないファイルIDを指定しても選択されない', () => {
      const file = createMockFile({ id: 'uuid-1' })

      useFileStore.setState({ files: [file], selectedFileId: null })
      useFileStore.getState().selectFile('non-existent')

      expect(useFileStore.getState().selectedFileId).toBeNull()
    })
  })

  describe('clearSelection', () => {
    it('選択をクリアするとselectedFileIdがnullになる', () => {
      useFileStore.setState({ selectedFileId: 'uuid-1' })
      useFileStore.getState().clearSelection()

      expect(useFileStore.getState().selectedFileId).toBeNull()
    })
  })
})
