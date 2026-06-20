// Droit à l'effacement (RGPD) : supprime TOUTES les données locales de Lumi
// (profil, historique, chat, clé API, statut Luminator, tendances en cache).
export function clearAllLocalData() {
  if (typeof localStorage === 'undefined') return
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && (k.startsWith('lumi.') || k.startsWith('yourcareer.'))) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
}
