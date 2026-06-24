// Synchronisation des données utilisateur avec le compte (serveur).
//
// Quand un compte est connecté, ses données (profil, historique, plan, boîte à
// outils, conversation) vivent sur le serveur et suivent l'utilisateur d'un
// appareil à l'autre. Hors connexion, tout reste en local comme avant.
//
// Approche découplée (pas de couplage avec chaque store) : on lit/écrit
// directement les clés localStorage concernées. Au login on tire les données du
// serveur ; en arrière-plan et à la fermeture on pousse les changements.
//
// NON synchronisé volontairement : la clé API perso (sensible, reste locale), le
// palier d'abonnement (le serveur fait foi via `luminator:<email>`), les caches
// de veille et le quota (propres à l'appareil).

const SYNC_KEYS = [
  'yourcareer.profile',
  'yourcareer.history',
  'lumi.luminator.plan',
  'lumi.luminator.tools',
  'lumi.luminator.chat',
  'lumi.profile.luminator_fields',
]

// Drapeau (par onglet) : empêche une boucle de rechargement si une donnée est
// re-sérialisée légèrement différemment au montage.
const RELOADED_FLAG = 'lumi.synced'

function snapshot(): Record<string, string> {
  const o: Record<string, string> = {}
  for (const k of SYNC_KEYS) {
    try {
      const v = localStorage.getItem(k)
      if (v != null) o[k] = v
    } catch {
      /* ignore */
    }
  }
  return o
}

let lastPushed = ''

// Récupère les données du serveur et les écrit en local.
// Renvoie true si des données locales ont changé (→ l'appelant peut recharger).
export async function pullData(): Promise<boolean> {
  try {
    const r = await fetch('/api/data')
    if (!r.ok) return false
    const j = (await r.json()) as { data?: Record<string, string> }
    const data = j.data || {}
    let changed = false
    for (const k of SYNC_KEYS) {
      const incoming = data[k]
      if (incoming == null) continue
      if (incoming !== localStorage.getItem(k)) {
        try {
          localStorage.setItem(k, incoming)
          changed = true
        } catch {
          /* ignore */
        }
      }
    }
    return changed
  } catch {
    return false
  }
}

// Envoie les données locales au serveur (si elles ont changé depuis le dernier envoi).
export async function pushData(): Promise<void> {
  const s = JSON.stringify(snapshot())
  if (s === lastPushed) return
  try {
    const r = await fetch('/api/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: JSON.parse(s) }),
    })
    if (r.ok) lastPushed = s
  } catch {
    /* on réessaiera au prochain tick */
  }
}

let timer: ReturnType<typeof setInterval> | undefined
function onVisibility() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') void pushData()
}
function onPageHide() {
  void pushData()
}

export function startSync() {
  if (timer) return
  timer = setInterval(() => void pushData(), 15000)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
}

export function stopSync() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', onPageHide)
}

// Au login : tire les données du serveur, puis pousse l'état local (pour amorcer
// un compte tout neuf avec les données déjà saisies avant la création du compte).
export async function syncOnLogin() {
  startSync()
  const changed = await pullData()
  let reloaded = false
  try {
    reloaded = sessionStorage.getItem(RELOADED_FLAG) === '1'
  } catch {
    /* ignore */
  }
  if (changed && !reloaded) {
    // Le serveur avait des données plus récentes : on recharge pour que les
    // écrans (qui lisent localStorage au montage) les affichent.
    try {
      sessionStorage.setItem(RELOADED_FLAG, '1')
    } catch {
      /* ignore */
    }
    window.location.reload()
    return
  }
  // Pas de rechargement : on pousse l'état local (amorçage / convergence).
  await pushData()
}

// Droit à l'effacement : supprime aussi la copie serveur (no-op hors connexion).
export async function wipeServerData(): Promise<void> {
  lastPushed = ''
  try {
    await fetch('/api/data', { method: 'DELETE' })
  } catch {
    /* ignore */
  }
}

// À la déconnexion : on efface les données synchronisées de cet appareil. Le
// compte (serveur) reste la source de vérité ; rien ne traîne sur l'appareil
// (utile sur un poste partagé).
export function clearSyncedData() {
  lastPushed = ''
  try {
    sessionStorage.removeItem(RELOADED_FLAG)
  } catch {
    /* ignore */
  }
  for (const k of SYNC_KEYS) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
