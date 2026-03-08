import { useEffect, useCallback } from 'react'
import { Linking } from 'react-native'
import { useFileImport } from './useFileImport'

/**
 * Share Extensionからのファイル受信ハンドラ
 *
 * Share Extensionは共有されたファイルを App Group の共有コンテナに保存し、
 * カスタムURLスキーム `autopl://import?url=<encoded-file-uri>&name=<encoded-name>&size=<size>`
 * でメインアプリを起動する。
 * このフックはそのURLを受信してfileImportフローに流す。
 *
 * ## iOS Share Extension セットアップ（ネイティブ設定）
 * 1. Xcodeで Share Extension ターゲットを追加
 * 2. App Groups 設定（group.com.shogonakamura.autopl）
 * 3. Share ExtensionのInfo.plistにNSExtensionActivationRuleでmp3/wav/m4aを指定
 * 4. ShareViewController.swiftで共有ファイルをApp Groupsコンテナにコピーし
 *    openURL("autopl://import?url=...&name=...&size=...")を呼び出す
 */
export const useShareHandler = (): void => {
  const { importFromUri } = useFileImport()

  const handleUrl = useCallback(
    async (url: string) => {
      if (!url.startsWith('autopl://import')) return

      try {
        const parsed = new URL(url)
        const fileUrl = parsed.searchParams.get('url')
        const fileName = parsed.searchParams.get('name')
        const fileSize = Number(parsed.searchParams.get('size') ?? '0')

        if (!fileUrl || !fileName) {
          console.warn('[useShareHandler] Missing url or name in share URL')
          return
        }

        const decodedUrl = decodeURIComponent(fileUrl)
        const decodedName = decodeURIComponent(fileName)

        await importFromUri(decodedUrl, decodedName, fileSize)
      } catch (error) {
        console.error('[useShareHandler] Failed to handle share URL:', error)
      }
    },
    [importFromUri]
  )

  useEffect(() => {
    // アプリがバックグラウンドから起動されたときのURL処理
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url)
    })

    // コールドスタート（アプリが閉じている状態から起動）のURL処理
    let cancelled = false
    Linking.getInitialURL().then((url) => {
      if (!cancelled && url) {
        handleUrl(url)
      }
    })

    return () => {
      subscription.remove()
      cancelled = true
    }
  }, [handleUrl])
}
