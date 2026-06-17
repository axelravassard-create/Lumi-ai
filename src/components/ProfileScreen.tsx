import { ReactNode, useEffect, useState } from 'react'
import { CareerProfile, completeness, loadProfile, saveProfile } from '../lib/profile'
import { Logo } from './Logo'
import { useCountUp } from '../lib/ui'

interface Props {
  onBack: () => void
  onAnalyze: (role: string) => void
}

export function ProfileScreen({ onBack, onAnalyze }: Props) {
  const [profile, setProfile] = useState<CareerProfile>(() => loadProfile())

  // Sauvegarde automatique à chaque modification.
  useEffect(() => {
    saveProfile(profile)
  }, [profile])

  const pct = completeness(profile)
  const animated = useCountUp(pct, 800)
  const set = <K extends keyof CareerProfile>(key: K, value: CareerProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }))

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">Mon profil carrière</h1>
          <p className="mt-1 text-ink-500">
            Plus votre profil est complet, plus le suivi et les conseils de l'IA sont précis.
            Tout est enregistré localement, rien que pour vous.
          </p>

          {/* Jauge de complétude */}
          <div className="card mt-6 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-700">Profil complété</span>
              <span className="font-display text-lg font-extrabold text-brand-700">{Math.round(animated)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-400">
              {pct < 40
                ? 'Continuez : ajoutez vos tâches et compétences pour un bilan vraiment personnalisé.'
                : pct < 80
                  ? 'Beau profil ! Encore quelques champs pour un suivi optimal.'
                  : 'Profil au top — l\'IA dispose de tout pour vous accompagner finement. 🎯'}
            </p>
          </div>
        </section>

        {/* Couche 1 — base */}
        <Section title="L'essentiel" emoji="🪪" delay={80}>
          <Field label="Métier actuel" hint="indispensable">
            <input className="inp" value={profile.role} onChange={(e) => set('role', e.target.value)} placeholder="Ex : développeur web" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Secteur d'activité">
              <input className="inp" value={profile.sector} onChange={(e) => set('sector', e.target.value)} placeholder="Ex : banque, santé…" />
            </Field>
            <Field label="Localisation">
              <input className="inp" value={profile.location} onChange={(e) => set('location', e.target.value)} placeholder="Ex : Lyon, France" />
            </Field>
            <Select label="Expérience" value={profile.experience} onChange={(v) => set('experience', v)}
              options={['Moins d\'1 an', '1–3 ans', '3–7 ans', '7–15 ans', 'Plus de 15 ans']} />
            <Select label="Niveau" value={profile.level} onChange={(v) => set('level', v)}
              options={['Débutant·e', 'Confirmé·e', 'Senior', 'Manager / Direction']} />
            <Select label="Statut" value={profile.status} onChange={(v) => set('status', v)}
              options={['Salarié·e', 'Indépendant·e', 'En recherche', 'Étudiant·e', 'En reconversion']} />
          </div>
        </Section>

        {/* Couche 2 — carburant de l'IA */}
        <Section title="Ce que vous faites vraiment" emoji="⚙️" delay={140}>
          <TagField label="Tâches du quotidien" hint="le plus important" value={profile.tasks} onChange={(v) => set('tasks', v)}
            placeholder="Ex : revue de code, support client… (Entrée pour ajouter)" />
          <TagField label="Compétences techniques" value={profile.hardSkills} onChange={(v) => set('hardSkills', v)}
            placeholder="Ex : Python, Excel, Photoshop…" />
          <TagField label="Compétences humaines" value={profile.softSkills} onChange={(v) => set('softSkills', v)}
            placeholder="Ex : pédagogie, négociation…" />
          <Field label="Formation & diplômes">
            <textarea className="inp min-h-[64px]" value={profile.education} onChange={(e) => set('education', e.target.value)}
              placeholder="Diplômes, certifications, formations suivies…" />
          </Field>
          <TagField label="Postes précédents" value={profile.pastRoles} onChange={(v) => set('pastRoles', v)}
            placeholder="Ex : technicien support, chef de projet junior…" />
        </Section>

        {/* Couche 3 — aspirations & contraintes */}
        <Section title="Vos aspirations" emoji="🧭" delay={200}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Objectif de carrière" value={profile.goal} onChange={(v) => set('goal', v)}
              options={['Évoluer dans mon métier', 'Me reconvertir', 'Sécuriser mon poste', 'Entreprendre']} />
            <Select label="Rapport à l'IA et au changement" value={profile.aiAppetite} onChange={(v) => set('aiAppetite', v)}
              options={['Curieux·se / enthousiaste', 'Neutre', 'Plutôt réticent·e']} />
          </div>
          <Field label="Contraintes">
            <textarea className="inp min-h-[64px]" value={profile.constraints} onChange={(e) => set('constraints', e.target.value)}
              placeholder="Ex : peu mobile géographiquement, peu de temps pour me former, salaire à préserver…" />
          </Field>
        </Section>

        {/* Action */}
        <section className="animate-fade-up mt-8 flex flex-col items-center gap-3" style={{ animationDelay: '260ms' }}>
          <button
            onClick={() => profile.role.trim() && onAnalyze(profile.role.trim())}
            disabled={!profile.role.trim()}
            className="btn-primary"
          >
            Lancer mon bilan personnalisé
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {!profile.role.trim() && <span className="text-xs text-ink-400">Renseignez au moins votre métier pour lancer le bilan.</span>}
        </section>
      </main>

      <style>{`.inp{width:100%;border:1px solid #d6dae9;border-radius:0.75rem;background:#fff;padding:0.6rem 0.85rem;font-size:0.9rem;color:#1c2033;outline:none;transition:all .15s}.inp:focus{border-color:#818cf8;box-shadow:0 0 0 3px #e0e7ff}.inp::placeholder{color:#8893b8}`}</style>
    </div>
  )
}

function Section({ title, emoji, delay, children }: { title: string; emoji: string; delay: number; children: ReactNode }) {
  return (
    <section className="animate-fade-up mt-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
          <span>{emoji}</span> {title}
        </h2>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-700">
        {label}
        {hint && <span className="pill bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Field label={label}>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Choisir —</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </Field>
  )
}

function TagField({ label, hint, value, onChange, placeholder }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span key={tag} className="pill bg-brand-100 text-brand-700">
            {tag}
            <button onClick={() => onChange(value.filter((t) => t !== tag))} className="ml-0.5 text-brand-500 hover:text-brand-800">✕</button>
          </span>
        ))}
      </div>
      <input
        className="inp mt-2"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        placeholder={placeholder}
      />
    </Field>
  )
}
