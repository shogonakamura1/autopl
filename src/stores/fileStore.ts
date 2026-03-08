import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AudioFile } from '../types'
import { STORAGE_KEYS } from '../constants/defaults'

interface FileState {
  files: AudioFile[]
  selectedFileId: string | null
}

interface FileActions {
  addFile: (file: AudioFile) => void
  removeFile: (id: string) => void
  selectFile: (id: string) => void
  clearSelection: () => void
}

type FileStore = FileState & FileActions

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      files: [],
      selectedFileId: null,

      addFile: (file: AudioFile) => {
        set((state) => ({
          files: [...state.files, file],
        }))
      },

      removeFile: (id: string) => {
        const { selectedFileId } = get()
        set((state) => ({
          files: state.files.filter((file) => file.id !== id),
          selectedFileId: selectedFileId === id ? null : selectedFileId,
        }))
      },

      selectFile: (id: string) => {
        const { files } = get()
        const fileExists = files.some((file) => file.id === id)
        if (fileExists) {
          set({ selectedFileId: id })
        }
      },

      clearSelection: () => {
        set({ selectedFileId: null })
      },
    }),
    {
      name: STORAGE_KEYS.FILES,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        files: state.files,
        selectedFileId: state.selectedFileId,
      }),
    }
  )
)
