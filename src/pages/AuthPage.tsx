import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getRememberedVerifiedEmail } from '../auth/verifiedEmailStore'
import { useAuth } from '../auth/useAuth'
import { ThemeToggle } from '../components/ThemeToggle'
import { ApiError } from '../services/apiClient'
import { importGuestDataToScope } from '../services/guestImportService'
import type { ApiUser } from '../types'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, continueAsGuest, loginWithPassword, signupWithPassword } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState(() => {
    const queryEmail = (searchParams.get('email') || '').trim().toLowerCase()
    if (queryEmail) {
      return queryEmail
    }
    return getRememberedVerifiedEmail() || ''
  })
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signupNotice, setSignupNotice] = useState<string | null>(null)
  const [showGuestImportModal, setShowGuestImportModal] = useState(false)
  const [importScope, setImportScope] = useState<string | null>(null)
  const [authFlowActive, setAuthFlowActive] = useState(false)

  const loginMutation = useMutation({
    mutationFn: async () => loginWithPassword(email.trim(), password),
    onSuccess: (result) => {
      setError(null)
      setSignupNotice(null)
      if (result.needsGuestImport) {
        setImportScope(result.session.scope)
        setShowGuestImportModal(true)
        return
      }
      setAuthFlowActive(false)
      void navigate('/tasks')
    },
    onError: (mutationError: unknown) => {
      setAuthFlowActive(false)
      if (mutationError instanceof ApiError && mutationError.status === 403) {
        setError('Email non vérifié. Ouvre le lien reçu par email puis reconnecte-toi.')
        return
      }
      const message = mutationError instanceof Error ? mutationError.message : 'Erreur inconnue'
      setError(message)
    },
  })

  const signupMutation = useMutation({
    mutationFn: async () => signupWithPassword(email.trim(), password, displayName),
    onSuccess: (user: ApiUser) => {
      setAuthFlowActive(false)
      setError(null)
      setSignupNotice(
        `Compte créé pour ${user.email}. Vérifie ta boîte mail puis connecte-toi.`,
      )
      setMode('login')
      setPassword('')
    },
    onError: (mutationError: unknown) => {
      setAuthFlowActive(false)
      const message = mutationError instanceof Error ? mutationError.message : 'Erreur inconnue'
      setError(message)
    },
  })

  useEffect(() => {
    if (session && !showGuestImportModal && !authFlowActive && !loginMutation.isPending) {
      void navigate('/tasks')
    }
  }, [authFlowActive, loginMutation.isPending, navigate, session, showGuestImportModal])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email et mot de passe requis.')
      return
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Mot de passe trop court (8 caractères minimum).')
      return
    }
    setAuthFlowActive(true)
    setSignupNotice(null)
    if (mode === 'signup') {
      signupMutation.mutate()
      return
    }
    loginMutation.mutate()
  }

  const handleGuest = () => {
    continueAsGuest()
    setAuthFlowActive(false)
    void navigate('/tasks')
  }

  const handleImportConfirm = async () => {
    if (importScope) {
      await importGuestDataToScope(importScope)
    }
    setShowGuestImportModal(false)
    setAuthFlowActive(false)
    void navigate('/tasks')
  }

  const handleImportSkip = () => {
    setShowGuestImportModal(false)
    setAuthFlowActive(false)
    void navigate('/tasks')
  }

  return (
    <div className="public-auth-shell">
      <ThemeToggle className="pill public-theme-toggle" />
      <div className="auth-card card reveal">
        <div className="auth-head stack gap-8">
          <h1 className="auth-title">KeepTrack</h1>
          <p className="auth-subtitle">{mode === 'login' ? 'Connexion' : 'Inscription'}</p>
        </div>

        <form className="stack gap-12" onSubmit={handleSubmit}>
          <label className="stack gap-6">
            <span>Email</span>
            <input
              value={email}
              type="email"
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value)
                setSignupNotice(null)
              }}
            />
          </label>

          {mode === 'signup' && (
            <label className="stack gap-6">
              <span>Nom affiché</span>
              <input
                value={displayName}
                type="text"
                autoComplete="name"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          )}

          <label className="stack gap-6">
            <span>Mot de passe</span>
            <input
              value={password}
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="error">{error}</p>}
          {signupNotice && <p className="success">{signupNotice}</p>}

          <div className="auth-actions row gap-8">
            <button className="primary" type="submit" disabled={loginMutation.isPending || signupMutation.isPending}>
              {mode === 'login'
                ? loginMutation.isPending
                  ? 'Connexion...'
                  : 'Se connecter'
                : signupMutation.isPending
                  ? 'Inscription...'
                  : "S'inscrire"}
            </button>
            <button
              className="ghost"
              type="button"
              disabled={loginMutation.isPending || signupMutation.isPending}
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setSignupNotice(null)
              }}
            >
              {mode === 'login' ? 'Créer un compte' : 'Déjà un compte'}
            </button>
          </div>
          {session && (
            <button className="ghost compact auth-inline-action" type="button" onClick={() => navigate('/tasks')}>
              Continuer vers les tâches
            </button>
          )}
        </form>

        <div className="auth-secondary-actions row">
          <button className="ghost" type="button" onClick={handleGuest}>
            Continuer en invité
          </button>
        </div>
      </div>

      {showGuestImportModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Importer vos données invitées ?</h2>
            <p>Des données locales invitées ont été détectées. Voulez-vous les importer dans votre compte ?</p>
            <div className="row gap-8 end">
              <button type="button" className="ghost" onClick={handleImportSkip}>
                Ignorer
              </button>
              <button type="button" className="primary" onClick={handleImportConfirm}>
                Importer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
