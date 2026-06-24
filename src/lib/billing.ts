// Paiement (Stripe) côté front.
//
// Le paiement réel est « prêt à brancher » : tant que Stripe n'est pas configuré
// côté serveur (variables Vercel), `checkBilling()` renvoie false et l'app retombe
// sur l'achat simulé du prototype. Dès que les clés sont posées, le bouton
// « Devenir Luminator » ouvre la page Stripe Checkout.

import { setTier, type Tier } from './entitlement'

let billingAvailable = false

export function isBillingAvailable(): boolean {
  return billingAvailable
}

// Le paiement réel est-il configuré côté serveur ?
export async function checkBilling(): Promise<boolean> {
  try {
    const r = await fetch('/api/stripe/status')
    if (!r.ok) return false
    const j = (await r.json()) as { enabled?: boolean }
    billingAvailable = !!j.enabled
  } catch {
    billingAvailable = false
  }
  return billingAvailable
}

// Lance le paiement d'un palier : redirige vers la page Stripe Checkout.
export async function startCheckout(tier: 'blumiman' | 'bluminator', plan: 'monthly' | 'yearly' = 'monthly'): Promise<void> {
  const r = await fetch(`/api/stripe/create-checkout-session?tier=${tier}&plan=${plan}`, { method: 'POST' })
  const j = (await r.json()) as { url?: string; error?: string }
  if (!r.ok || !j.url) throw new Error(j.error || 'Paiement indisponible pour le moment.')
  window.location.href = j.url
}

// Ouvre le portail client Stripe (gérer / résilier l'abonnement, factures…).
export async function openBillingPortal(): Promise<void> {
  const r = await fetch('/api/stripe/portal', { method: 'POST' })
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!r.ok || !j.url) throw new Error(j.error || 'Gestion de l\'abonnement indisponible.')
  window.location.href = j.url
}

function cleanUrl(url: URL) {
  url.searchParams.delete('checkout')
  url.searchParams.delete('session_id')
  const qs = url.searchParams.toString()
  window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : '') + url.hash)
}

// Au retour de Stripe : vérifie le paiement côté serveur et débloque Luminator.
// Renvoie true si l'accès vient d'être accordé.
export async function handleCheckoutReturn(): Promise<boolean> {
  const url = new URL(window.location.href)
  const status = url.searchParams.get('checkout')
  if (status !== 'success') {
    if (status === 'cancel') cleanUrl(url)
    return false
  }
  const sid = url.searchParams.get('session_id')
  if (!sid) {
    cleanUrl(url)
    return false
  }
  try {
    const r = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sid)}`)
    const j = (await r.json()) as { paid?: boolean; tier?: string }
    if (j.paid) {
      setTier((j.tier as Tier) || 'blumiman')
      cleanUrl(url)
      return true
    }
  } catch {
    /* ignore */
  }
  cleanUrl(url)
  return false
}
