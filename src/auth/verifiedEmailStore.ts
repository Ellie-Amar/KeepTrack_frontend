const VERIFIED_EMAIL_STORAGE_KEY = 'keeptrack.lastVerifiedEmail'

function normalizeEmail(value: string | null): string | null {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized ? normalized : null
}

export function setRememberedVerifiedEmail(email: string) {
  if (typeof window === 'undefined') {
    return
  }
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return
  }
  window.localStorage.setItem(VERIFIED_EMAIL_STORAGE_KEY, normalized)
}

export function getRememberedVerifiedEmail(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return normalizeEmail(window.localStorage.getItem(VERIFIED_EMAIL_STORAGE_KEY))
}
