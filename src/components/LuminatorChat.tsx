import { useEffect, useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { streamLuminatorChat, describeError, type ChatMsg } from '../lib/llm'
import { applyProfilePatch } from '../lib/profile'

interface Props {
  onClose: () => void
  aiEnabled: boolean
  onOpenSettings: () => void
  /** Contexte profil/dernier bilan, injecté dans le system prompt. */
  extraContext?: string
}

const GREETING =
  "Hey 👋 Je suis Luminator, ton coach de carrière. Dis-moi ton métier (ou ce qui t'occupe en ce moment) et on construit ta trajectoire face à l'IA, étape par étape."

const STARTERS = [
  'Mon métier est-il menacé ?',
  'Quelles compétences développer ?',
  'Comment me reconvertir ?',
]

// Mémoire de la conversation : conservée d'une session à l'autre.
const STORAGE_KEY = 'lumi.luminator.chat'

function loadChat(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ChatMsg[]
  } catch {
    /* ignore */
  }
  return []
}

function saveChat(messages: ChatMsg[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

export function LuminatorChat({ onClose, aiEnabled, onOpenSettings, extraContext }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(() => loadChat())
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [noted, setNoted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Persiste la conversation (mémoire) à chaque évolution.
  useEffect(() => {
    saveChat(messages)
  }, [messages])

  // Auto-défilement vers le bas à chaque nouveau contenu.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  // Indicateur « noté sur ton profil » qui s'efface tout seul.
  useEffect(() => {
    if (!noted) return
    const t = setTimeout(() => setNoted(false), 4000)
    return () => clearTimeout(t)
  }, [noted])

  const newChat = () => {
    setMessages([])
    setInput('')
  }

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    if (!aiEnabled) {
      onOpenSettings()
      return
    }
    const history: ChatMsg[] = [...messages, { role: 'user', content: trimmed }]
    // On ajoute une bulle assistant vide qui se remplira pendant le streaming.
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)
    try {
      await streamLuminatorChat(history, {
        onDelta: (delta) => {
          setMessages((m) => {
            const copy = m.slice()
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + delta }
            return copy
          })
        },
        onProfileUpdate: (patch) => {
          // Luminator note le parcours sur le profil → mémoire durable, sans
          // refaire travailler l'API plus tard.
          const changed = applyProfilePatch(patch)
          if (changed.length) setNoted(true)
          return changed.length
            ? `Profil mis à jour : ${changed.join(', ')}.`
            : 'Déjà connu, rien à ajouter.'
        },
        extraContext,
      })
    } catch (e) {
      setMessages((m) => {
        const copy = m.slice()
        copy[copy.length - 1] = { role: 'assistant', content: '⚠️ ' + describeError(e) }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink-900/30 backdrop-blur-sm sm:items-end sm:justify-end sm:p-5">
      <div className="flex w-full flex-col bg-white shadow-glow sm:h-[78vh] sm:max-h-[680px] sm:w-[400px] sm:rounded-3xl sm:border sm:border-ink-100">
        {/* En-tête : le personnage, bien visible, qui bouge la bouche pendant
            qu'il répond — pour qu'on voie clairement qu'on discute avec lui. */}
        <header className="relative border-b border-ink-100 px-4 pb-3 pt-4">
          <div className="absolute right-3 top-3 flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={newChat}
                title="Nouvelle conversation"
                aria-label="Nouvelle conversation"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 10a8 8 0 0 0-14.3-3.7L4 8m0 8a8 8 0 0 0 14.3 3.7L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fermer le chat"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-24 w-24">
              <Avatar glasses speaking={streaming} className="h-full w-full" />
            </div>
            <div className="mt-1.5 font-display text-base font-bold text-ink-900">Luminator</div>
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <span className={`h-1.5 w-1.5 rounded-full ${streaming ? 'animate-pulse bg-brand-500' : 'bg-emerald-500'}`} />
              {streaming ? 'parle…' : 'ton coach de carrière'}
            </div>
          </div>
          {noted && (
            <div className="absolute left-1/2 top-2 -translate-x-1/2 animate-fade-in rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              🧠 noté sur ton profil
            </div>
          )}
        </header>

        {/* Fil de discussion */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <Bubble role="assistant" text={GREETING} />
          {messages.map((m, i) => (
            <Bubble
              key={i}
              role={m.role}
              text={m.content}
              typing={streaming && i === messages.length - 1 && m.role === 'assistant' && !m.content}
            />
          ))}

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {!aiEnabled && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Le chat utilise Claude. Ajoute ta clé API pour discuter avec Luminator —{' '}
              <button onClick={onOpenSettings} className="font-semibold underline">
                configurer
              </button>
              .
            </div>
          )}
        </div>

        {/* Saisie */}
        <form
          className="flex items-center gap-2 border-t border-ink-100 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris à Luminator…"
            className="flex-1 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            aria-label="Envoyer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

function Bubble({ role, text, typing }: { role: 'user' | 'assistant'; text: string; typing?: boolean }) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          mine ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-800'
        }`}
      >
        {text}
        {typing && <span className="inline-flex gap-0.5 align-middle">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: '120ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: '240ms' }} />
        </span>}
      </div>
    </div>
  )
}
