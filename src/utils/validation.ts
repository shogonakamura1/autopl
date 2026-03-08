import { AudioFile } from '../types'
import { FILE_IMPORT_CONSTRAINTS } from '../constants/defaults'

/**
 * ウェイクワードのバリデーション
 */
export const validateWakeWord = (value: string): string | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'ウェイクワードを入力してください'
  if (trimmed.length < 2 || trimmed.length > 20)
    return 'ウェイクワードは2〜20文字で入力してください'
  if (/[!-/:-@[-`{-~]/.test(trimmed)) return '記号は使用できません'
  return null
}

/**
 * コマンド語のバリデーション
 */
export const validateCommandWord = (
  value: string,
  otherValues: string[],
  wakeWord: string
): string | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'コマンド語を入力してください'
  if (trimmed.length < 1 || trimmed.length > 20)
    return 'コマンド語は1〜20文字で入力してください'
  if (/[!-/:-@[-`{-~]/.test(trimmed)) return '記号は使用できません'
  if (otherValues.some((other) => other.trim() === trimmed))
    return 'このコマンド語はすでに使われています'
  if (wakeWord.trim() === trimmed)
    return 'このコマンド語はすでに使われています'
  return null
}

/**
 * タイムアウト秒数のバリデーション
 */
export const validateTimeout = (value: string): string | null => {
  const num = Number(value)
  if (!Number.isInteger(num) || value.includes('.'))
    return 'タイムアウトは3〜30秒の整数で入力してください'
  if (num < 3 || num > 30)
    return 'タイムアウトは3〜30秒の整数で入力してください'
  return null
}

/**
 * インポートファイルのバリデーション
 */
export const validateImportFile = (
  file: { name: string; size: number },
  existingFiles: AudioFile[]
): string | null => {
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`
  if (!FILE_IMPORT_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension))
    return 'mp3・wav・m4a 形式のファイルのみインポートできます'
  if (file.size > FILE_IMPORT_CONSTRAINTS.MAX_FILE_SIZE_MB * 1024 * 1024)
    return 'ファイルサイズが大きすぎます（上限500MB）'
  if (existingFiles.some((existingFile) => existingFile.name === file.name))
    return '同名のファイルが既にインポートされています'
  return null
}

/**
 * ファイル名をサニタイズする（100文字制限）
 */
export const sanitizeFileName = (name: string): string => {
  if (!name) return ''
  return name.length > 100 ? name.substring(0, 100) : name
}
