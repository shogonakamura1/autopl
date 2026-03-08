import { Paths, File, Directory } from 'expo-file-system'

const AUDIO_DIR_NAME = 'audio'

/**
 * expo-file-system ラッパーサービス
 * サンドボックス内のファイルコピー・削除を担当
 */
export const fileService = {
  /**
   * audio ディレクトリを取得する（存在しなければ作成）
   */
  getAudioDir(): Directory {
    return new Directory(Paths.document, AUDIO_DIR_NAME)
  },

  /**
   * audio ディレクトリが存在しなければ作成する
   */
  async ensureAudioDir(): Promise<void> {
    try {
      const audioDir = fileService.getAudioDir()
      if (!audioDir.exists) {
        audioDir.create()
      }
    } catch (error) {
      console.error('[FileService] ensureAudioDir failed:', error)
      throw error
    }
  },

  /**
   * ファイルをサンドボックス内の audio ディレクトリにコピーする
   * @returns コピー先のファイルパス（URI）
   */
  async copyToAudioDir(
    sourceUri: string,
    fileId: string,
    extension: string
  ): Promise<string> {
    try {
      await fileService.ensureAudioDir()
      const audioDir = fileService.getAudioDir()
      const sourceFile = new File(sourceUri)
      const destinationFile = new File(audioDir, `${fileId}.${extension}`)
      sourceFile.copy(destinationFile)
      return destinationFile.uri
    } catch (error) {
      console.error('[FileService] copyToAudioDir failed:', error)
      throw error
    }
  },

  /**
   * サンドボックス内のファイルを削除する
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = new File(filePath)
      if (file.exists) {
        file.delete()
      }
    } catch (error) {
      console.error('[FileService] deleteFile failed:', error)
      throw error
    }
  },

  /**
   * ファイルが存在するか確認する
   */
  fileExists(filePath: string): boolean {
    try {
      const file = new File(filePath)
      return file.exists
    } catch (error) {
      console.error('[FileService] fileExists failed:', error)
      return false
    }
  },

  /**
   * ファイルサイズを取得する（バイト単位）
   * ファイルが存在しない場合は null を返す
   */
  getFileSize(filePath: string): number | null {
    try {
      const file = new File(filePath)
      if (file.exists) {
        return file.size ?? null
      }
      return null
    } catch (error) {
      console.error('[FileService] getFileSize failed:', error)
      return null
    }
  },

  /**
   * audio ディレクトリのパスを返す
   */
  getAudioDirPath(): string {
    return fileService.getAudioDir().uri
  },
}
