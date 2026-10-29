import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
// Polices auto-hébergées (aucune requête vers Google → pas de transfert d'IP).
// Texte : Manrope (humaniste, lisible, pro). Titres : Sora (géométrique, premium).
import '@fontsource-variable/manrope'
import '@fontsource-variable/sora'
import './index.css'

// Après un redéploiement, un onglet resté ouvert sur l'ancienne version peut
// réclamer un fichier qui n'existe plus (écran blanc). Vite signale ce cas par
// `vite:preloadError` : on recharge alors UNE fois pour passer à la nouvelle
// version. Le drapeau évite une boucle si le problème persiste (l'erreur remonte
// alors au filet de sécurité `AppErrorBoundary`).
const RELOAD_FLAG = 'lumi.reloaded_after_update'
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})
// Chargement réussi : on réarme le rechargement automatique pour la prochaine mise à jour.
window.setTimeout(() => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    /* stockage indisponible : sans conséquence */
  }
}, 10_000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
