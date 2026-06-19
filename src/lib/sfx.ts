// Petits bruitages synthétisés à la volée via la Web Audio API : aucun fichier
// son à télécharger, et donc rien qui ralentisse le chargement de la page.

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  // Les navigateurs suspendent le contexte tant qu'il n'y a pas eu d'interaction.
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Bruitage joué quand on tapote la tête de Lumi : un contact mat très court
// suivi d'un petit « couic » de jouet, pour quelque chose de bref et réaliste.
export function playPat() {
  const ac = audioCtx()
  if (!ac) return
  const now = ac.currentTime
  const out = ac.destination

  // 1) Contact : une brève bouffée de bruit filtrée en bas, façon « toc » mou.
  const tapDur = 0.05
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * tapDur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  }
  const noise = ac.createBufferSource()
  noise.buffer = buffer
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 380
  const tapGain = ac.createGain()
  tapGain.gain.setValueAtTime(0.16, now)
  tapGain.gain.exponentialRampToValueAtTime(0.0001, now + tapDur)
  noise.connect(lp).connect(tapGain).connect(out)
  noise.start(now)
  noise.stop(now + tapDur)

  // 2) « Couic » de jouet : la hauteur monte vite puis redescend, filtrée en
  //    bande étroite pour le côté caoutchouc.
  const dur = 0.16
  const osc = ac.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(540, now + 0.01)
  osc.frequency.exponentialRampToValueAtTime(1180, now + 0.07)
  osc.frequency.exponentialRampToValueAtTime(860, now + dur)
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 1000
  band.Q.value = 6
  const squeak = ac.createGain()
  squeak.gain.setValueAtTime(0.0001, now + 0.01)
  squeak.gain.exponentialRampToValueAtTime(0.2, now + 0.03)
  squeak.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  osc.connect(band).connect(squeak).connect(out)
  osc.start(now + 0.01)
  osc.stop(now + dur + 0.02)
}
