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

export function speak(text: string, rate = 1.08, volume = 1) {
  if (typeof speechSynthesis === 'undefined' || !text) return
  const u = new SpeechSynthesisUtterance(text)
  const v = frenchVoice()
  if (v) u.voice = v
  u.lang = 'fr-FR'
  u.rate = rate
  u.pitch = 1.05
  u.volume = volume
  speechSynthesis.speak(u)
}

export function stopTTS() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}
