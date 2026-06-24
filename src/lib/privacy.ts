import { wipeServerData } from './sync'

// Droit à l'effacement (RGPD) : supprime TOUTES les données locales de Blumi
// (profil, historique, chat, clé API, statut, tendances en cache) ET, si un
// compte est connecté, la copie serveur (`data:<email>`).
export async function clearAllLocalData() {
  // D'abord le serveur (tant qu'on a encore le cookie de session), sinon les
  // données reviendraient à la prochaine synchro.
  await wipeServerData()
  if (typeof localStorage === 'undefined') return
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && (k.startsWith('lumi.') || k.startsWith('yourcareer.'))) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
}
