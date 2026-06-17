import { useState } from 'react'
import { RiskLevel } from '../lib/engine'
import { createShareCard, shareOrDownloadCard } from '../lib/shareCard'

interface Props {
  role: string
  score: number
  level: RiskLevel
  onClose: () => void
}

// Panneau de partage : l'utilisateur choisit de diffuser SON résultat et
// d'inviter d'autres personnes à tester. Aucune donnée n'est exposée sans son
// action explicite — cohérent avec le positionnement « vos données chez vous ».
export function SharePanel({ role, score, level, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [card, setCard] = useState<'idle' | 'busy'>('idle')
  const url = typeof window !== 'undefined' ? window.location.origin : 'https://yourcareer.app'
  const text = `J'ai évalué l'exposition de mon métier (${role}) à l'intelligence artificielle sur YourCareer : ${score}%. Et le tien, où en est-il ? Teste gratuitement 👇`
  const full = `${text} ${url}`
  const enc = encodeURIComponent

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'YourCareer', text, url })
      } catch {
        /* partage annulé */
      }
    } else {
      copy()
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponible */
    }
  }

  const downloadVisual = async () => {
    setCard('busy')
    try {
      const blob = await createShareCard(role, score, level)
      await shareOrDownloadCard(blob, full)
    } catch {
      /* génération impossible */
    } finally {
      setCard('idle')
    }
  }

  const links = [
    { label: 'WhatsApp', emoji: '💬', href: `https://wa.me/?text=${enc(full)}` },
    { label: 'X', emoji: '𝕏', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { label: 'LinkedIn', emoji: '💼', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'E-mail', emoji: '✉️', href: `mailto:?subject=${enc('Et ton métier face à l\'IA ?')}&body=${enc(full)}` },
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">📤</div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Partager & inviter</h2>
            <p className="mt-1 text-sm text-ink-500">Diffusez votre résultat et invitez vos proches à tester leur métier.</p>
          </div>
        </div>

        {/* Aperçu du message partagé */}
        <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-base shadow-sm">🧭</span>
            {role}
            <span className="ml-auto font-display text-lg font-extrabold text-brand-700">{score}%</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{text}</p>
        </div>

        {/* Visuel à poster */}
        <button onClick={downloadVisual} disabled={card === 'busy'} className="btn-primary mt-4 w-full justify-center py-2.5 text-sm">
          {card === 'busy' ? 'Génération…' : '🖼️ Télécharger le visuel à poster'}
        </button>

        {/* Partage natif + copie */}
        <div className="mt-2 flex gap-2">
          <button onClick={nativeShare} className="btn-ghost flex-1 justify-center py-2.5 text-sm">
            Partager le lien
          </button>
          <button onClick={copy} className="btn-ghost justify-center py-2.5 text-sm">
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
        </div>

        {/* Réseaux */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 rounded-xl border border-ink-100 py-3 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
            >
              <span className="text-lg">{l.emoji}</span>
              {l.label}
            </a>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-ink-400">
          Vous seul choisissez ce que vous partagez. Aucune donnée n'est publiée automatiquement.
        </p>
        <button onClick={onClose} className="mt-3 w-full text-sm font-medium text-ink-400 hover:text-ink-700">
          Fermer
        </button>
      </div>
    </div>
  )
}
