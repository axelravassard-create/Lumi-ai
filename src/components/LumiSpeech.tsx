import { useEffect, useState } from 'react'

interface Props {
  text: string
  className?: string
  /** Vitesse de la machine à écrire en ms/caractère. */
  speed?: number
}

// Lumi « parle » : le texte s'écrit caractère par caractère, comme s'il était
// tapé en direct.
export function LumiSpeech({ text, className = '', speed = 26 }: Props) {
  const [shown, setShown] = useState('')
  const done = shown.length >= text.length

  useEffect(() => {
    setShown('')
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])

  return (
    <span className={className}>
      {shown}
      {!done && <span className="ml-px animate-pulse text-brand-400">▍</span>}
    </span>
  )
}
