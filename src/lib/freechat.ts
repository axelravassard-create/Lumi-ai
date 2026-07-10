// Dégustation gratuite du chat Blumi : un utilisateur GRATUIT mais IDENTIFIÉ
// (compte connecté) a droit à un petit nombre d'échanges à vie avec le copilote,
// sans payer — pour goûter avant de passer à Blumiman / Bluminator.
//
// 1 échange = 1 message envoyé (question + réponse). Compteur à VIE (pas par jour),
// stocké localement (proto). Le quota serveur (KV) reste le garde-fou global.

const KEY = 'lumi.luminator.freeUsed'

export const FREE_CHAT_MAX = 2

export function freeChatUsed(): number {
  try {
    const n = parseInt(localStorage.getItem(KEY) || '0', 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function freeChatLeft(): number {
  return Math.max(0, FREE_CHAT_MAX - freeChatUsed())
}

// Décompte un échange gratuit (à l'envoi d'un message par un gratuit identifié).
export function consumeFreeChat(): number {
  const next = freeChatUsed() + 1
  try {
    localStorage.setItem(KEY, String(next))
  } catch {
    /* ignore */
  }
  return next
}
