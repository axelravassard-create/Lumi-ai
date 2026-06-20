import { ReactNode } from 'react'
import { Logo } from './Logo'

export type LegalDoc = 'mentions' | 'confidentialite' | 'cgu'

interface Props {
  doc: LegalDoc
  onBack: () => void
  onOpen: (doc: LegalDoc) => void
}

const CONTACT = 'axel.ravassard@gmail.com'
const UPDATED = 'juin 2026'

export function LegalScreen({ doc, onBack, onOpen }: Props) {
  const title =
    doc === 'mentions' ? 'Mentions légales' : doc === 'confidentialite' ? 'Politique de confidentialité' : "Conditions d'utilisation"

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-ink-400">Dernière mise à jour : {UPDATED}</p>

          <div className="card mt-6 space-y-5 p-6 text-sm leading-relaxed text-ink-700">
            {doc === 'mentions' && <Mentions />}
            {doc === 'confidentialite' && <Confidentialite />}
            {doc === 'cgu' && <Cgu />}
          </div>

          {/* Navigation entre les documents légaux */}
          <nav className="mt-6 flex flex-wrap gap-2 text-sm">
            {([
              ['mentions', 'Mentions légales'],
              ['confidentialite', 'Confidentialité'],
              ['cgu', "Conditions d'utilisation"],
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

function Note() {
  return (
    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
      ⚠️ Lumi est un prototype à visée pédagogique. Ces documents sont fournis à titre informatif et doivent être
      complétés/validés (identité de l'éditeur, hébergeur…) avant toute exploitation commerciale.
    </p>
  )
}

function Mentions() {
  return (
    <>
      <Note />
      <div className="space-y-1">
        <H>Éditeur du site</H>
        <p>
          Lumi — projet édité par <strong>[Nom / raison sociale à compléter]</strong>.<br />
          Statut & immatriculation (SIRET / RCS) : <strong>[à compléter]</strong>.<br />
          Contact : <a className="text-brand-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </div>
      <div className="space-y-1">
        <H>Directeur de la publication</H>
        <p>[Nom du responsable de publication à compléter].</p>
      </div>
      <div className="space-y-1">
        <H>Hébergement</H>
        <p>
          Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis —
          vercel.com. (À adapter si vous changez d'hébergeur.)
        </p>
      </div>
      <div className="space-y-1">
        <H>Propriété intellectuelle</H>
        <p>
          La marque « Lumi », le personnage, les textes, l'interface et le code de l'application sont protégés. Toute
          reproduction non autorisée est interdite. Les analyses sont générées à l'aide du modèle Claude d'Anthropic ;
          les bibliothèques tierces utilisées restent soumises à leurs licences respectives (MIT, Apache-2.0, OFL…).
        </p>
      </div>
    </>
  )
}

function Confidentialite() {
  return (
    <>
      <Note />
      <p>
        Cette politique explique quelles données Lumi traite, où elles vont, et comment exercer vos droits. Notre
        principe : <strong>le minimum de données, et de la transparence sur ce qui sort de votre appareil.</strong>
      </p>

      <div className="space-y-1">
        <H>1. Données stockées sur votre appareil</H>
        <p>
          Votre profil carrière, l'historique de vos bilans, vos conversations avec Luminator, votre clé API et votre
          statut d'offre sont enregistrés <strong>localement</strong> dans votre navigateur (localStorage). Ils ne sont
          pas envoyés à un serveur Lumi — nous n'avons pas de base de données qui les centralise.
        </p>
      </div>

      <div className="space-y-1">
        <H>2. Données transmises à Anthropic (uniquement si vous activez l'IA)</H>
        <p>
          Lorsque vous lancez une analyse par l'IA, importez un CV ou discutez avec Luminator, les informations
          nécessaires (profession, éléments de profil, contenu du CV, messages) sont envoyées au modèle
          <strong> Claude d'Anthropic, PBC</strong> (États-Unis) pour produire la réponse. Ce transfert hors UE implique
          un sous-traitant établi aux États-Unis. En mode démo (sans clé API), <strong>aucune</strong> donnée n'est
          transmise : tout est calculé localement. Évitez de saisir des données sensibles que vous ne souhaitez pas
          transmettre.
        </p>
      </div>

      <div className="space-y-1">
        <H>3. Mesure d'audience</H>
        <p>
          Nous utilisons <strong>Vercel Analytics</strong> pour mesurer la fréquentation de façon agrégée. Cette mesure
          est sans cookie publicitaire. Nous ne vendons ni ne louons vos données à des tiers.
        </p>
      </div>

      <div className="space-y-1">
        <H>4. Cookies</H>
        <p>
          Lumi n'utilise pas de cookie de suivi publicitaire. Le stockage technique (localStorage) sert uniquement à
          faire fonctionner l'application sur votre appareil.
        </p>
      </div>

      <div className="space-y-1">
        <H>5. Vos droits</H>
        <p>
          Comme vos données vivent sur votre appareil, vous gardez le contrôle : vous pouvez à tout moment les
          <strong> supprimer depuis l'écran « Mon profil »</strong> (bouton « Supprimer toutes mes données ») ou en
          vidant le stockage de votre navigateur. Pour toute question relative à vos données (accès, rectification,
          effacement, opposition), écrivez à{' '}
          <a className="text-brand-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </div>

      <div className="space-y-1">
        <H>6. Sécurité</H>
        <p>
          La clé API que vous saisissez reste dans votre navigateur et appelle directement l'API d'Anthropic. Dans ce
          prototype, elle n'est pas protégée par un serveur intermédiaire : ne l'utilisez que sur un appareil de
          confiance, et révoquez-la depuis la console Anthropic en cas de doute.
        </p>
      </div>
    </>
  )
}

function Cgu() {
  return (
    <>
      <Note />
      <div className="space-y-1">
        <H>1. Objet</H>
        <p>
          Lumi est un outil d'information qui estime l'exposition d'un métier à l'automatisation par l'IA et propose des
          pistes d'évolution. En utilisant Lumi, vous acceptez les présentes conditions.
        </p>
      </div>
      <div className="space-y-1">
        <H>2. Nature des résultats — pas un conseil professionnel</H>
        <p>
          Les scores, projections et recommandations sont <strong>indicatifs</strong> et peuvent comporter des erreurs,
          y compris lorsqu'ils sont générés par l'IA. Ils ne constituent pas un conseil professionnel, juridique,
          financier ou d'orientation, et n'engagent aucune garantie de résultat. Vos décisions restent les vôtres.
        </p>
      </div>
      <div className="space-y-1">
        <H>3. Utilisation de l'IA</H>
        <p>
          Les fonctionnalités d'IA nécessitent votre propre clé API Anthropic et sont soumises aux conditions et à la
          facturation d'Anthropic. Vous êtes responsable de l'usage de votre clé et des coûts associés.
        </p>
      </div>
      <div className="space-y-1">
        <H>4. Offre Luminator</H>
        <p>
          Dans cette version prototype, l'activation de l'offre « Luminator » est <strong>simulée</strong> et gratuite ;
          aucun paiement réel n'est prélevé. Des conditions de vente distinctes s'appliqueront si un paiement réel est
          mis en place.
        </p>
      </div>
      <div className="space-y-1">
        <H>5. Propriété intellectuelle</H>
        <p>
          L'application, sa marque, son personnage et son contenu sont protégés. Vous ne pouvez pas les copier ou les
          réutiliser sans autorisation. Vous conservez la propriété des contenus que vous saisissez.
        </p>
      </div>
      <div className="space-y-1">
        <H>6. Responsabilité</H>
        <p>
          Lumi est fourni « en l'état », sans garantie. Dans les limites permises par la loi, l'éditeur ne saurait être
          tenu responsable des décisions prises sur la base des informations fournies.
        </p>
      </div>
      <div className="space-y-1">
        <H>7. Contact</H>
        <p>
          Pour toute question :{' '}
          <a className="text-brand-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </div>
    </>
  )
}
