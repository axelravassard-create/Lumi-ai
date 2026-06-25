// Envoi d'email transactionnel via Resend, sans dépendance.
// Inerte tant que RESEND_API_KEY / EMAIL_FROM ne sont pas définis.

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM
}

export async function sendMagicLink(to: string, link: string): Promise<void> {
  const key = process.env.RESEND_API_KEY as string
  const from = process.env.EMAIL_FROM as string
  const html = `
  <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#1c2033">Ta connexion à Blumi</h2>
    <p style="color:#434a6a">Clique sur le bouton ci-dessous pour te connecter. Ce lien expire dans 15 minutes.</p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">Se connecter à Blumi</a>
    </p>
    <p style="color:#8893b8;font-size:13px">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
  </div>`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, subject: 'Ton lien de connexion Blumi', html }),
  })
  if (!r.ok) throw new Error(`Email error ${r.status}`)
}
