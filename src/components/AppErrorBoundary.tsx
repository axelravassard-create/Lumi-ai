import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../lib/i18n'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

// Filet de sécurité global : si un écran plante (ex. un fichier de l'ancienne
// version introuvable après un redéploiement), on affiche un message clair avec
// un bouton « Recharger » au lieu d'un écran blanc.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Blumi — erreur d’affichage :', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 text-center">
        <div className="max-w-sm">
          <p className="font-display text-xl font-bold text-ink-900">{t('err.title')}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{t('err.body')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {t('err.reload')}
          </button>
        </div>
      </div>
    )
  }
}
