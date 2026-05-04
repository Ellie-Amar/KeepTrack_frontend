import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { setRememberedVerifiedEmail } from '../auth/verifiedEmailStore'
import { ThemeToggle } from '../components/ThemeToggle'
import { verifyEmail } from '../services/backendApi'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const verificationQuery = useQuery({
    queryKey: ['verify-email', token],
    queryFn: async () => verifyEmail(token),
    enabled: token.length > 0,
    retry: false,
  })

  const tokenMissing = token.length === 0
  const isSuccess = verificationQuery.isSuccess
  const isError = verificationQuery.isError || tokenMissing
  const verifiedEmail = verificationQuery.data?.email ?? ''

  useEffect(() => {
    if (isSuccess && verifiedEmail) {
      setRememberedVerifiedEmail(verifiedEmail)
    }
  }, [isSuccess, verifiedEmail])

  const authLink = verifiedEmail ? `/auth?email=${encodeURIComponent(verifiedEmail)}` : '/auth'

  return (
    <div className="public-auth-shell">
      <ThemeToggle className="pill public-theme-toggle" />
      <div className="auth-card card reveal">
        <div className="auth-head stack gap-8">
          <h1 className="auth-title">Vérification email</h1>
        </div>

        <div className="stack gap-12">
          {verificationQuery.isPending && <p>Validation du lien en cours...</p>}

          {isSuccess && (
            <p className="success">Email vérifié pour {verifiedEmail}. Tu peux maintenant te connecter.</p>
          )}

          {isError && (
            <p className="error">
              {tokenMissing
                ? 'Lien de vérification invalide : token manquant.'
                : verificationQuery.error instanceof Error
                  ? verificationQuery.error.message
                  : 'Lien de vérification invalide ou expiré.'}
            </p>
          )}

          <div className="auth-secondary-actions row">
            <Link className="ghost compact link-like" to={authLink}>
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
