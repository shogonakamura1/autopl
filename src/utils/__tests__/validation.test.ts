import {
  validateWakeWord,
  validateCommandWord,
  validateTimeout,
  validateImportFile,
  sanitizeFileName,
} from '../validation'
import { AudioFile } from '../../types'

describe('validateWakeWord', () => {
  it('空文字のときエラーメッセージを返す', () => {
    expect(validateWakeWord('')).toBe('ウェイクワードを入力してください')
  })

  it('空白のみのときエラーメッセージを返す', () => {
    expect(validateWakeWord('   ')).toBe('ウェイクワードを入力してください')
  })

  it('1文字のとき文字数エラーを返す', () => {
    expect(validateWakeWord('あ')).toBe(
      'ウェイクワードは2〜20文字で入力してください'
    )
  })

  it('21文字のとき文字数エラーを返す', () => {
    expect(validateWakeWord('あ'.repeat(21))).toBe(
      'ウェイクワードは2〜20文字で入力してください'
    )
  })

  it('2文字のとき正常', () => {
    expect(validateWakeWord('はい')).toBeNull()
  })

  it('20文字のとき正常', () => {
    expect(validateWakeWord('あ'.repeat(20))).toBeNull()
  })

  it('記号を含むときエラーを返す', () => {
    expect(validateWakeWord('はい!')).toBe('記号は使用できません')
  })

  it('日本語・英数字・スペースは正常', () => {
    expect(validateWakeWord('はい 行きます GO')).toBeNull()
  })
})

describe('validateCommandWord', () => {
  it('空文字のときエラーを返す', () => {
    expect(validateCommandWord('', [], 'ウェイク')).toBe(
      'コマンド語を入力してください'
    )
  })

  it('21文字のとき文字数エラーを返す', () => {
    expect(validateCommandWord('あ'.repeat(21), [], 'ウェイク')).toBe(
      'コマンド語は1〜20文字で入力してください'
    )
  })

  it('記号を含むときエラーを返す', () => {
    expect(validateCommandWord('再生!', [], 'ウェイク')).toBe(
      '記号は使用できません'
    )
  })

  it('他のコマンドと重複するときエラーを返す', () => {
    expect(validateCommandWord('再生', ['再生', '停止'], 'ウェイク')).toBe(
      'このコマンド語はすでに使われています'
    )
  })

  it('ウェイクワードと重複するときエラーを返す', () => {
    expect(validateCommandWord('ウェイク', [], 'ウェイク')).toBe(
      'このコマンド語はすでに使われています'
    )
  })

  it('1文字のコマンド語は正常', () => {
    expect(validateCommandWord('次', [], 'ウェイク')).toBeNull()
  })

  it('重複なしのときは正常', () => {
    expect(validateCommandWord('再生', ['停止', '次'], 'ウェイク')).toBeNull()
  })
})

describe('validateTimeout', () => {
  it('整数でないときエラーを返す', () => {
    expect(validateTimeout('abc')).toBe(
      'タイムアウトは3〜30秒の整数で入力してください'
    )
  })

  it('小数のときエラーを返す', () => {
    expect(validateTimeout('5.5')).toBe(
      'タイムアウトは3〜30秒の整数で入力してください'
    )
  })

  it('2秒のとき範囲エラーを返す', () => {
    expect(validateTimeout('2')).toBe(
      'タイムアウトは3〜30秒の整数で入力してください'
    )
  })

  it('31秒のとき範囲エラーを返す', () => {
    expect(validateTimeout('31')).toBe(
      'タイムアウトは3〜30秒の整数で入力してください'
    )
  })

  it('3秒のとき正常', () => {
    expect(validateTimeout('3')).toBeNull()
  })

  it('30秒のとき正常', () => {
    expect(validateTimeout('30')).toBeNull()
  })

  it('10秒のとき正常', () => {
    expect(validateTimeout('10')).toBeNull()
  })
})

describe('validateImportFile', () => {
  const existingFiles: AudioFile[] = [
    {
      id: 'uuid-1',
      name: 'existing.mp3',
      path: '/audio/uuid-1.mp3',
      duration: 240,
      createdAt: Date.now(),
    },
  ]

  it('mp3ファイルは正常', () => {
    expect(
      validateImportFile({ name: 'song.mp3', size: 1024 }, [])
    ).toBeNull()
  })

  it('wavファイルは正常', () => {
    expect(
      validateImportFile({ name: 'song.wav', size: 1024 }, [])
    ).toBeNull()
  })

  it('m4aファイルは正常', () => {
    expect(
      validateImportFile({ name: 'song.m4a', size: 1024 }, [])
    ).toBeNull()
  })

  it('非対応形式のときエラーを返す', () => {
    expect(validateImportFile({ name: 'song.ogg', size: 1024 }, [])).toBe(
      'mp3・wav・m4a 形式のファイルのみインポートできます'
    )
  })

  it('拡張子がないときエラーを返す', () => {
    expect(validateImportFile({ name: 'song', size: 1024 }, [])).toBe(
      'mp3・wav・m4a 形式のファイルのみインポートできます'
    )
  })

  it('500MBを超えるときエラーを返す', () => {
    const overSize = 500 * 1024 * 1024 + 1
    expect(validateImportFile({ name: 'big.mp3', size: overSize }, [])).toBe(
      'ファイルサイズが大きすぎます（上限500MB）'
    )
  })

  it('500MBちょうどは正常', () => {
    const exactSize = 500 * 1024 * 1024
    expect(
      validateImportFile({ name: 'exact.mp3', size: exactSize }, [])
    ).toBeNull()
  })

  it('同名ファイルが存在するときエラーを返す', () => {
    expect(
      validateImportFile(
        { name: 'existing.mp3', size: 1024 },
        existingFiles
      )
    ).toBe('同名のファイルが既にインポートされています')
  })

  it('同名ファイルが存在しないときは正常', () => {
    expect(
      validateImportFile({ name: 'new-song.mp3', size: 1024 }, existingFiles)
    ).toBeNull()
  })
})

describe('sanitizeFileName', () => {
  it('空文字のとき空文字を返す', () => {
    expect(sanitizeFileName('')).toBe('')
  })

  it('100文字以内のときそのまま返す', () => {
    const name = 'short-name.mp3'
    expect(sanitizeFileName(name)).toBe(name)
  })

  it('100文字を超えるとき先頭100文字に切り詰める', () => {
    const longName = 'a'.repeat(110) + '.mp3'
    expect(sanitizeFileName(longName)).toHaveLength(100)
    expect(sanitizeFileName(longName)).toBe('a'.repeat(100))
  })
})
