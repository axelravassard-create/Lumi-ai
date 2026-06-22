import { useState } from 'react'
import { useAccount, requestLoginLink, logoutAccount } from '../lib/account'

interface Props {
  onClose: () => void
}

// Connexion sans mot de passe : on saisit son email, on reçoit un lien magique.
// Permet de retrouver son abonnement et ses données sur tous ses appareils.
export function AccountModal({ onClose }: Props) {
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
                <h2 className="font-display text-lg font-bold text-ink-900">Mon compte</h2>
                <p className="mt-1 truncate text-sm text-ink-500">{acc.email}</p>
                {acc.luminator && <p className="mt-1 text-sm font-medium text-emerald-600">✨ Abonné Luminator</p>}
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-500">
              Ton compte te permet de retrouver ton abonnement et tes données sur tous tes appareils.
            </p>
            <button onClick={() => logoutAccount()} className="btn-ghost mt-5 w-full justify-center">
              Se déconnecter
            </button>
            <button onClick={onClose} className="mt-3 w-full text-sm font-medium text-ink-400 hover:text-ink-700">
              Fermer
            </button>
          </>
        ) : status === 'sent' ? (
          <>
            <div className="text-center">
              <div className="text-4xl">📬</div>
              <h2 className="mt-3 font-display text-lg font-bold text-ink-900">Vérifie tes emails</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
                On t'a envoyé un lien de connexion à <strong>{email}</strong>. Clique dessus pour te connecter (valable 15 min).
              </p>
            </div>
            <button onClick={onClose} className="btn-ghost mt-6 w-full justify-center">Fermer</button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">🔑</div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">Se connecter</h2>
                <p className="mt-1 text-sm text-ink-500">Sans mot de passe — on t'envoie un lien par email.</p>
              </div>
            </div>
            <form onSubmit={submit} className="mt-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                autoFocus
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              {err && <p className="mt-2 text-xs text-rose-500">{err}</p>}
              <button type="submit" disabled={!email.trim() || status === 'sending'} className="btn-primary mt-4 w-full justify-center disabled:opacity-50">
                {status === 'sending' ? 'Envoi…' : 'Recevoir mon lien'}
              </button>
            </form>
            <button onClick={onClose} className="mt-3 w-full text-sm font-medium text-ink-400 hover:text-ink-700">
              Plus tard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
