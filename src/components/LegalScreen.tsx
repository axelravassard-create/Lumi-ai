import { ReactNode } from 'react'
import { Logo } from './Logo'
import { LEGAL_INFO } from '../lib/legal'
import { t, useLang } from '../lib/i18n'

export type LegalDoc = 'mentions' | 'confidentialite' | 'cgu'

interface Props {
  doc: LegalDoc
  onBack: () => void
  onOpen: (doc: LegalDoc) => void
}

const CONTACT = LEGAL_INFO.contact
const UPDATED = LEGAL_INFO.updated

export function LegalScreen({ doc, onBack, onOpen }: Props) {
  useLang()
  const title =
    doc === 'mentions' ? t('legal.title.mentions') : doc === 'confidentialite' ? t('legal.title.confid') : t('legal.title.cgu')

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('legal.back')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-ink-400">{t('legal.updated').replace('{date}', UPDATED)}</p>

          <div className="card mt-6 space-y-5 p-6 text-sm leading-relaxed text-ink-700">
            {doc === 'mentions' && <Mentions />}
            {doc === 'confidentialite' && <Confidentialite />}
            {doc === 'cgu' && <Cgu />}
          </div>

          {/* Navigation entre les documents légaux */}
          <nav className="mt-6 flex flex-wrap gap-2 text-sm">
            {([
              ['mentions', t('legal.nav.mentions')],
              ['confidentialite', t('legal.nav.confid')],
              ['cgu', t('legal.nav.cgu')],
            ] as [LegalDoc, string][]).map(([d, label]) => (
              <button
                key={d}
                onClick={() => onOpen(d)}
                className={`rounded-full px-3.5 py-1.5 font-medium transition ${
                  d === doc ? 'bg-brand-600 text-white' : 'border border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </section>
      </main>
    </div>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-base font-bold text-ink-900">{children}</h2>
}

function Section({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  return (
    <div className="space-y-1">
      <H>{t(titleKey)}</H>
      <p>{t(bodyKey)}</p>
    </div>
  )
}

function MailLink() {
  return (
    <a className="text-brand-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
  )
}

function Note() {
  return (
    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
      {t('legal.note')}
    </p>
  )
}

function Mentions() {
  const i = LEGAL_INFO
  return (
    <>
      <Note />
      <div className="space-y-1">
        <H>{t('legal.m.editorTitle')}</H>
        <p>
          {i.brand} — {t('legal.m.editedBy')}{' '}
          <strong>{i.editorName}</strong>
          {i.status === 'societe' && i.legalForm ? <>, {i.legalForm}</> : null}
          {i.status === 'societe' && i.capital ? <>{t('legal.m.capital').replace('{capital}', i.capital)}</> : null}.
          {i.address ? (
            <>
              <br />
              {t('legal.m.addressLine').replace('{address}', i.address)}
            </>
          ) : null}
          {i.status === 'micro' && i.siret ? (
            <>
              <br />
              {t('legal.m.siretMicro').replace('{siret}', i.siret)}
            </>
          ) : null}
          {i.status === 'societe' ? (
            <>
              <br />
              {t('legal.m.siretSociete').replace('{siret}', i.siret ?? '[à compléter]').replace('{rcs}', i.rcs ?? '[à compléter]')}
            </>
          ) : null}
          <br />
          {t('legal.m.contactLabel')}<MailLink />
        </p>
      </div>
      <div className="space-y-1">
        <H>{t('legal.m.directorTitle')}</H>
        <p>{i.publicationDirector ?? i.editorName}.</p>
      </div>
      <div className="space-y-1">
        <H>{t('legal.m.hostTitle')}</H>
        <p>
          {t('legal.m.hostBody')
            .replace('{name}', i.host.name)
            .replace('{address}', i.host.address)
            .replace('{url}', i.host.url)}
        </p>
      </div>
      <Section titleKey="legal.m.ipTitle" bodyKey="legal.m.ipBody" />
    </>
  )
}

function Confidentialite() {
  return (
    <>
      <Note />
      <p>{t('legal.c.intro')}</p>
      <Section titleKey="legal.c.s1Title" bodyKey="legal.c.s1Body" />
      <Section titleKey="legal.c.s2Title" bodyKey="legal.c.s2Body" />
      <Section titleKey="legal.c.s3Title" bodyKey="legal.c.s3Body" />
      <Section titleKey="legal.c.s4Title" bodyKey="legal.c.s4Body" />
      <div className="space-y-1">
        <H>{t('legal.c.s5Title')}</H>
        <p>
          {t('legal.c.s5Body')}
          <MailLink />.
        </p>
      </div>
      <Section titleKey="legal.c.s6Title" bodyKey="legal.c.s6Body" />
    </>
  )
}

function Cgu() {
  return (
    <>
      <Note />
      <Section titleKey="legal.g.s1Title" bodyKey="legal.g.s1Body" />
      <Section titleKey="legal.g.s2Title" bodyKey="legal.g.s2Body" />
      <Section titleKey="legal.g.s3Title" bodyKey="legal.g.s3Body" />
      <Section titleKey="legal.g.s4Title" bodyKey="legal.g.s4Body" />
      <Section titleKey="legal.g.s5Title" bodyKey="legal.g.s5Body" />
      <Section titleKey="legal.g.s6Title" bodyKey="legal.g.s6Body" />
      <div className="space-y-1">
        <H>{t('legal.g.s7Title')}</H>
        <p>
          {t('legal.g.s7Body')}
          <MailLink />.
        </p>
      </div>
    </>
  )
}
