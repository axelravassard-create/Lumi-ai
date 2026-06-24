import { useLang, setLang, SUPPORTED, LANG_LABELS, type Lang } from '../lib/i18n'

// Sélecteur de langue. Détection auto au 1er passage ; ici l'utilisateur peut
// forcer sa langue (mémorisée).
export function LangSwitcher({ className = '' }: { className?: string }) {
  const lang = useLang()
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      aria-label="Langue"
      className={`cursor-pointer rounded-full border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-600 outline-none transition hover:border-brand-300 ${className}`}
    >
      {SUPPORTED.map((l) => (
        <option key={l} value={l}>
          {LANG_LABELS[l]}
        </option>
      ))}
    </select>
  )
}
