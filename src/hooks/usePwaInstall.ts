import { useCallback, useEffect, useMemo, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type IosNavigator = Navigator & {
  standalone?: boolean
}

const hasWindow = typeof window !== 'undefined'

const isIosDevice = () => {
  if (!hasWindow) {
    return false
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

const isStandaloneMode = () => {
  if (!hasWindow) {
    return false
  }

  const standalone = (window.navigator as IosNavigator).standalone
  return window.matchMedia('(display-mode: standalone)').matches || standalone === true
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode)

  const isIos = useMemo(() => isIosDevice(), [])

  useEffect(() => {
    if (!hasWindow) {
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = (matchEvent: MediaQueryListEvent) => {
      if (matchEvent.matches) {
        setIsInstalled(true)
        setDeferredPrompt(null)
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    mediaQuery.addEventListener('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      mediaQuery.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt || isInstalled) {
      return false
    }

    await deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice

    if (result.outcome === 'accepted') {
      setDeferredPrompt(null)
      return true
    }

    return false
  }, [deferredPrompt, isInstalled])

  return useMemo(
    () => ({
      canPromptInstall: Boolean(deferredPrompt) && !isInstalled,
      showIosInstallHint: isIos && !isInstalled && !deferredPrompt,
      showGenericInstallHint: !isIos && !isInstalled && !deferredPrompt,
      isInstalled,
      promptInstall,
    }),
    [deferredPrompt, isInstalled, isIos, promptInstall],
  )
}
