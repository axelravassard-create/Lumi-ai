// Petits bruitages synthétisés à la volée via la Web Audio API : aucun fichier
// son à télécharger, et donc rien qui ralentisse le chargement de la page.

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

// Débloque l'audio dès la première interaction de l'utilisateur (clic, touche,
// toucher) : sans ce « réveil », le tout premier bruitage peut être avalé par la
// politique d'autoplay des navigateurs.
export function installAudioUnlock() {
  if (typeof window === 'undefined') return
  const unlock = () => {
    const ac = audioCtx()
    ac?.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchstart', unlock)
}

// Construit et joue le bruitage sur un contexte GARANTI actif. On lit
// `ac.currentTime` ici (pas avant le resume) pour ne jamais planifier un son
// dans le passé — c'était la cause des bruitages muets.
function schedulePat(ac: AudioContext) {
  const now = ac.currentTime + 0.02
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
  lp.frequency.value = 420
  const tapGain = ac.createGain()
  tapGain.gain.setValueAtTime(0.35, now)
  tapGain.gain.exponentialRampToValueAtTime(0.0001, now + tapDur)
  noise.connect(lp).connect(tapGain).connect(out)
  noise.start(now)
  noise.stop(now + tapDur)

  // 2) « Couic » de jouet : la hauteur monte vite puis redescend, filtrée en
  //    bande étroite pour le côté caoutchouc.
  const dur = 0.18
  const osc = ac.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(540, now)
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.07)
  osc.frequency.exponentialRampToValueAtTime(860, now + dur)
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 1000
  band.Q.value = 5
  const squeak = ac.createGain()
  squeak.gain.setValueAtTime(0.0001, now)
  squeak.gain.exponentialRampToValueAtTime(0.5, now + 0.03)
  squeak.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  osc.connect(band).connect(squeak).connect(out)
  osc.start(now)
  osc.stop(now + dur + 0.02)
}

// Bruitage joué quand on tapote la tête de Lumi : contact mat + petit « couic ».
// On s'assure que le contexte est bien « running » AVANT de planifier le son.
export function playPat() {
  const ac = audioCtx()
  if (!ac) return
  if (ac.state === 'suspended') {
    ac.resume().then(() => schedulePat(ac)).catch(() => schedulePat(ac))
  } else {
    schedulePat(ac)
  }
}
