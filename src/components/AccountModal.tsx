import { useState } from 'react'
import { useAccount, requestLoginLink, logoutAccount } from '../lib/account'
import { t, useLang } from '../lib/i18n'

interface Props {
  onClose: () => void
}

// Connexion sans mot de passe : on saisit son email, on reçoit un lien magique.
// Permet de retrouver son abonnement et ses données sur tous ses appareils.
export function AccountModal({ onClose }: Props) {
  useLang()
  const acc = useAccount()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setErr('')
    try {
      await requestLoginLink(email.trim())
      setStatus('sent')
    } catch (e) {
      setErr((e as Error).message)
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        {acc.email ? (
          <>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">👤</div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-ink-900">{t('acc.title')}</h2>
                <p className="mt-1 truncate text-sm text-ink-500">{acc.email}</p>
                {acc.luminator && <p className="mt-1 text-sm font-medium text-emerald-600">{t('acc.activeSub')}</p>}
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-500">{t('acc.multiDevice')}</p>
            <button onClick={() => logoutAccount()} className="btn-ghost mt-5 w-full justify-center">
              {t('acc.logout')}
            </button>
            <button onClick={onClose} className="mt-3 w-full text-sm font-medium text-ink-400 hover:text-ink-700">
              {t('common.close')}
            </button>
          </>
        ) : status === 'sent' ? (
          <>
            <div className="text-center">
              <div className="text-4xl">📬</div>
              <h2 className="mt-3 font-display text-lg font-bold text-ink-900">{t('acc.checkEmailTitle')}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
                {t('acc.checkEmailPre')}<strong>{email}</strong>{t('acc.checkEmailPost')}
              </p>
            </div>
            <button onClick={onClose} className="btn-ghost mt-6 w-full justify-center">{t('common.close')}</button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">🔑</div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">{t('acc.createTitle')}</h2>
                <p className="mt-1 text-sm text-ink-500">{t('acc.createDesc')}</p>
              </div>
            </div>
            <form onSubmit={submit} className="mt-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('acc.emailPlaceholder')}
                autoFocus
                className="field text-sm"
              />
              {err && <p className="mt-2 text-xs text-rose-500">{err}</p>}
              <button type="submit" disabled={!email.trim() || status === 'sending'} className="btn-primary mt-4 w-full justify-center disabled:opacity-50">
                {status === 'sending' ? t('acc.sending') : t('acc.getLink')}
              </button>
            </form>
            <button onClick={onClose} className="mt-3 w-full text-sm font-medium text-ink-400 hover:text-ink-700">
              {t('acc.later')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
