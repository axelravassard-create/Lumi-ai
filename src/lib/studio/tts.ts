// Voix off via l'API SpeechSynthesis du navigateur (FR, énergique). Emplacement
// prévu pour brancher une voix API (ElevenLabs, etc.) plus tard.
export function frenchVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  const fr = voices.filter((v) => v.lang.toLowerCase().startsWith('fr'))
  // Préférence pour une voix « naturelle » si dispo.
  return (
    fr.find((v) => /google|natural|premium|amélie|thomas/i.test(v.name)) ||
    fr[0] ||
    voices[0] ||
    null
  )
}

let warmed = false
export function warmTTS() {
  if (warmed || typeof speechSynthesis === 'undefined') return
  warmed = true
  // Certains navigateurs chargent les voix de façon asynchrone.
  speechSynthesis.getVoices()
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices()
}

// Liste des voix disponibles (dépend du navigateur/OS), FR d'abord.
export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  const voices = speechSynthesis.getVoices()
  return [...voices].sort((a, b) => {
    const af = a.lang.toLowerCase().startsWith('fr') ? 0 : 1
    const bf = b.lang.toLowerCase().startsWith('fr') ? 0 : 1
    return af - bf || a.name.localeCompare(b.name)
  })
}

function voiceByName(name?: string): SpeechSynthesisVoice | null {
  if (!name) return frenchVoice()
  return listVoices().find((v) => v.name === name) || frenchVoice()
}

export function speak(text: string, rate = 1.08, volume = 1, voiceName?: string) {
  if (typeof speechSynthesis === 'undefined' || !text) return
  const u = new SpeechSynthesisUtterance(text)
  const v = voiceByName(voiceName)
  if (v) u.voice = v
  u.lang = v?.lang || 'fr-FR'
  u.rate = rate
  u.pitch = 1.05
  u.volume = volume
  speechSynthesis.speak(u)
}

export function stopTTS() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

// Estimation de la durée de parole d'un texte (s), pour caler les beats sur la
// voix off. ~2,6 mots/s en français à débit 1, + une petite marge de fin.
export function estimateSpeechSec(text: string, rate = 1): number {
  const words = (text || '')
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length // ignore les emojis/ponctuation seuls
  if (!words) return 0
  const wps = 2.6 * Math.max(0.5, rate)
  return words / wps + 0.4
}
