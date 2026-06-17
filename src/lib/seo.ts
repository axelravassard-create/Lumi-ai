import { useEffect } from 'react'

// Met à jour le <title> et la meta description selon la page consultée.
// Prototype : appliqué côté client. En production, ces pages métier devraient
// être pré-rendues (SSR / prerender) pour une indexation optimale.
export function useSeo(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    const prevDesc = meta.getAttribute('content')
    meta.setAttribute('content', description)

    return () => {
      document.title = prevTitle
      if (created) meta?.remove()
      else if (prevDesc != null) meta?.setAttribute('content', prevDesc)
    }
  }, [title, description])
}
