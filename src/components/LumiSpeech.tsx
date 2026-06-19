import { useEffect, useState } from 'react'

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function frenchVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang?.toLowerCase().startsWith('fr')) ?? null
}

interface Props {
  text: string
  /** Texte réellement lu à voix haute (par défaut : le texte affiché). */
  speakText?: string
  className?: string
  /** Vitesse de la machine à écrire en ms/caractère. */
  speed?: number
}

// Lumi « parle » : le texte s'écrit caractère par caractère, et un bouton 🔊
// permet de l'entendre lire à voix haute (voix française, ton jeune).
export function LumiSpeech({ text, speakText, className = '', speed = 26 }: Props) {
  const [shown, setShown] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const done = shown.length >= text.length

  useEffect(() => {
    setShown('')
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])

  // On coupe la voix si le composant disparaît.
  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel() }, [])

  const toggleSpeak = () => {
    if (!canSpeak) return
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(speakText ?? text)
    u.lang = 'fr-FR'
    u.rate = 1.03
    u.pitch = 1.2 // un peu plus aigu : Lumi est un jeune robot
    const v = frenchVoice()
    if (v) u.voice = v
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    synth.speak(u)
  }

  return (
    <span className={className}>
      {shown}
      {!done && <span className="ml-px animate-pulse text-brand-400">▍</span>}
      {canSpeak && done && (
        <button
          onClick={toggleSpeak}
          title={speaking ? 'Arrêter' : 'Écouter Lumi'}
          aria-label={speaking ? 'Arrêter la lecture' : 'Écouter Lumi'}
          className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs align-middle shadow-sm ring-1 ring-ink-100 transition hover:bg-white"
        >
          {speaking ? '⏸' : '🔊'}
        </button>
      )}
    </span>
  )
}
