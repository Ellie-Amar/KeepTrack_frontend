import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { db } from '../services/db'

async function readSyncCounters(scope: string) {
  const pending = await db.syncJobs.where('[scope+status]').equals([scope, 'pending']).count()
  const failed = await db.syncJobs.where('[scope+status]').equals([scope, 'failed']).count()
  return { pending, failed }
}

export function AppLayout() {
  const online = useOnlineStatus()
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const { canPromptInstall, showIosInstallHint, showGenericInstallHint, promptInstall } = usePwaInstall()

  const syncStats = useLiveQuery(
    async () => (session ? readSyncCounters(session.scope) : { pending: 0, failed: 0 }),
    [session?.scope],
    { pending: 0, failed: 0 },
  )

  const handleLogout = () => {
    logout()
    void navigate('/auth')
  }

  const handleInstallClick = () => {
    void promptInstall()
  }

  const hasPendingSync = syncStats.pending > 0

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/tasks" className="brand">
          KeepTrack
        </Link>
        <div className="header-meta">
          <span className={`pill ${online ? 'pill-online' : 'pill-offline'}`}>
            {online ? 'En ligne' : 'Hors ligne'}
          </span>
          <ThemeToggle className="pill" />
          {canPromptInstall && (
            <button className="ghost compact install-button" type="button" onClick={handleInstallClick}>
              Installer l'app
            </button>
          )}
          {showIosInstallHint && (
            <span className="pill install-hint">iOS: Partager puis Sur l'ecran d'accueil</span>
          )}
          {showGenericInstallHint && (
            <span className="pill install-hint">Menu navigateur: Installer l'app / Ajouter a l'ecran d'accueil</span>
          )}
          {session && (
            <span className="email-chip">{session.mode === 'guest' ? 'Invité' : `👤 ${session.email}`}</span>
          )}
          <span className="pill sync-pill">
            <span
              className={`sync-indicator ${hasPendingSync ? 'sync-indicator-pending' : 'sync-indicator-ok'}`}
              aria-hidden="true"
            />
            <span>Synchronisation: {hasPendingSync ? `${syncStats.pending} en attente` : 'à jour'}</span>
          </span>
          {syncStats.failed > 0 && <span className="pill warning">{syncStats.failed} échec(s)</span>}
          {session && (
            <button className="ghost compact" type="button" onClick={handleLogout}>
              <span className="logout-icon" aria-hidden="true">
                👋
              </span>{' '}
              Déconnexion
            </button>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
