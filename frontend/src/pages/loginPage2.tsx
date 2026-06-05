import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  PlayCircle,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const quickPoints = [
  'Gestion complete de vos activites',
  'Assistant IA intelligent',
  'Concu pour le BTP',
];

const modules = [
  {
    title: 'Gestion des clients',
    description: 'Centralisez les contacts, historiques et interactions en un seul endroit.',
    icon: <Building2 size={18} />,
  },
  {
    title: 'Suivi des chantiers',
    description: 'Pilotez avancement, equipes et jalons sans perdre de temps.',
    icon: <Wrench size={18} />,
  },
  {
    title: 'Assistant IA',
    description: 'Qualifiez les prospects et accelerez vos devis automatiquement.',
    icon: <Bot size={18} />,
  },
  {
    title: 'Rapports & analyses',
    description: 'Suivez les KPI cles pour prendre de meilleures decisions.',
    icon: <LayoutDashboard size={18} />,
  },
];

const demoScenes = [
  {
    title: 'Vue globale de votre activite',
    description: 'Pilotez clients, chantiers, devis et factures depuis un tableau unique.',
  },
  {
    title: 'Suivi chantier en temps reel',
    description: 'Visualisez avancement, equipe et priorites sans perdre de temps.',
  },
  {
    title: 'Assistant IA pour vos devis',
    description: 'Qualifiez les prospects et preparez vos demandes de devis rapidement.',
  },
];

export default function HomeLandingPage() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    if (!isDemoOpen) return;

    const timer = window.setInterval(() => {
      setDemoIndex((prev) => (prev + 1) % demoScenes.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [isDemoOpen]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eaf1fb] text-[#102a53]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(75,123,236,0.2),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.18),transparent_45%),linear-gradient(180deg,#f3f7ff_0%,#e8f0ff_65%,#f5f8ff_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-white/60 bg-[#0f2e63] px-4 py-3 text-white shadow-[0_12px_40px_rgba(14,42,96,0.22)] sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-semibold tracking-wide">
              <div className="rounded-lg bg-white/12 p-2">
                <Building2 size={16} />
              </div>
              BatiCRM
            </div>

            <nav className="hidden items-center gap-7 text-sm text-white/85 md:flex">
              <a className="transition hover:text-white" href="#fonctionnalites">Accueil</a>
              <a className="transition hover:text-white" href="#fonctionnalites">Fonctionnalites</a>
              <a className="transition hover:text-white" href="#">Tarifs</a>
              <a className="transition hover:text-white" href="#">A propos</a>
              <a className="transition hover:text-white" href="#">Contact</a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDemoOpen(true)}
                className="hidden rounded-lg bg-[#2f66d8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2a5bc4] sm:inline-flex"
              >
                Demander une demo
              </button>
              <Link
                to="/login"
                className="inline-flex rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#0f2e63] transition hover:bg-[#e6edfb]"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-8 grid items-center gap-10 lg:grid-cols-[1.05fr_1.2fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#9ab6ef] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2458bb]">
              <Sparkles size={14} /> Nouveau
            </span>

            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-[#102a53] sm:text-5xl">
              Gerez vos projets,
              <br />
              <span className="text-[#2f66d8]">developpez votre</span>
              <br />
              entreprise.
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#425d88]">
              BatiCRM centralise vos clients, chantiers, devis et factures dans une seule
              plateforme. Gagnez du temps, suivez vos projets en temps reel et developpez votre activite.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2f66d8] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(47,102,216,0.35)] transition hover:translate-y-[-1px] hover:bg-[#2a5bc4]"
              >
                Decouvrir la plateforme
                <ArrowRight size={16} />
              </Link>

              <button
                type="button"
                onClick={() => setIsDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#a8bee9] bg-white/75 px-5 py-3 text-sm font-semibold text-[#1c427f] transition hover:bg-white"
              >
                Voir une demo
                <PlayCircle size={16} />
              </button>
            </div>

            <div className="mt-8 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-3">
              {quickPoints.map((point) => (
                <div key={point} className="flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-[#2f4f83] shadow-sm">
                  <CheckCircle2 size={14} className="mt-[1px] shrink-0 text-[#2f66d8]" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="rounded-3xl border border-[#d2def4] bg-white p-3 shadow-[0_24px_70px_rgba(15,46,99,0.18)] sm:p-4">
              <div className="grid min-h-[390px] grid-cols-[84px_1fr] overflow-hidden rounded-2xl border border-[#e0e8f7] bg-[#f8fbff]">
                <aside className="bg-[#162f61] p-3 text-white/80">
                  <div className="rounded-lg bg-white/15 p-2">
                    <Building2 size={16} />
                  </div>
                  <div className="mt-4 space-y-2 text-[10px]">
                    <div className="rounded-md bg-white/10 px-2 py-1">Dashboard</div>
                    <div className="rounded-md px-2 py-1">Clients</div>
                    <div className="rounded-md px-2 py-1">Chantiers</div>
                    <div className="rounded-md px-2 py-1">Devis</div>
                    <div className="rounded-md px-2 py-1">Factures</div>
                  </div>
                </aside>

                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#102a53]">Tableau de bord</h3>
                    <div className="h-6 w-24 rounded-md bg-[#edf3ff]" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-[#2f66d8] p-2 text-white">
                      <p className="text-[10px] opacity-85">CA</p>
                      <p className="text-sm font-bold">142 580 EUR</p>
                    </div>
                    <div className="rounded-lg bg-[#2fc997] p-2 text-white">
                      <p className="text-[10px] opacity-85">Chantiers</p>
                      <p className="text-sm font-bold">8</p>
                    </div>
                    <div className="rounded-lg bg-[#ffb846] p-2 text-white">
                      <p className="text-[10px] opacity-85">Devis</p>
                      <p className="text-sm font-bold">13</p>
                    </div>
                    <div className="rounded-lg bg-[#7357e7] p-2 text-white">
                      <p className="text-[10px] opacity-85">Clients</p>
                      <p className="text-sm font-bold">247</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_.8fr]">
                    <div className="rounded-xl border border-[#dce6f8] bg-white p-3">
                      <p className="text-xs font-semibold text-[#1f4684]">Evolution du chiffre d affaires</p>
                      <div className="mt-2 h-24 rounded-lg bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_100%)] p-2">
                        <svg viewBox="0 0 240 80" className="h-full w-full">
                          <polyline
                            fill="none"
                            stroke="#2f66d8"
                            strokeWidth="3"
                            points="6,64 38,58 60,62 86,43 118,49 142,34 167,37 192,20 232,26"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#dce6f8] bg-white p-3">
                      <p className="text-xs font-semibold text-[#1f4684]">Repartition</p>
                      <div className="mt-3 flex items-center justify-center">
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-[#e4ecfb]">
                          <div className="absolute inset-0 rounded-full border-[10px] border-[#2fc997] border-r-[#f4c26f] border-b-[#7357e7] border-l-transparent" />
                          <span className="z-10 text-xs font-bold text-[#1f4684]">68%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            
          </div>
        </section>

        <section id="fonctionnalites" className="mt-14 rounded-3xl border border-[#dbe5f7] bg-white/80 p-6 backdrop-blur-sm sm:p-8">
          <h2 className="text-center text-2xl font-bold text-[#102a53]">
            Tout ce dont vous avez besoin pour reussir
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#5e779f]">
            Des fonctionnalites puissantes, pensees pour les entreprises du batiment.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => (
              <article
                key={module.title}
                className="group rounded-2xl border border-[#dbe5f7] bg-white p-4 transition hover:-translate-y-1 hover:border-[#9eb8e8] hover:shadow-[0_16px_28px_rgba(18,49,108,0.14)]"
              >
                <div className="inline-flex rounded-lg bg-[#edf3ff] p-2 text-[#2f66d8]">
                  {module.icon}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#173a72]">{module.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#607da6]">{module.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ===== Demo Modal ===== */}
      {isDemoOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a1834]/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[#bfcef0] bg-white shadow-[0_30px_90px_rgba(8,24,52,0.45)]">
            <div className="flex items-center justify-between border-b border-[#dbe6fa] bg-[#f6f9ff] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#204780]">Presentation dynamique BatiCRM</p>
                <p className="text-xs text-[#6b84ad]">Apercu automatique de l application</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ccdaf5] text-[#325a95] transition hover:bg-[#e9f1ff]"
                title="Fermer la demo"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#d6e2f9] bg-[radial-gradient(circle_at_20%_15%,#3e78ed_0%,#1d4289_45%,#0f274f_100%)] px-6 py-5 text-white">
                <div className="pointer-events-none absolute -right-8 top-4 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
                <div className="pointer-events-none absolute -left-10 bottom-2 h-36 w-36 rounded-full bg-blue-200/20 blur-2xl" />

                <div className="relative flex h-full flex-col justify-between">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                    <PlayCircle size={14} /> Lecture auto
                  </div>

                  <div className="max-w-xl rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm transition-all duration-500">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Scene {demoIndex + 1}</p>
                    <h3 className="mt-2 text-2xl font-bold leading-tight">{demoScenes[demoIndex]?.title}</h3>
                    <p className="mt-3 text-sm text-blue-100">{demoScenes[demoIndex]?.description}</p>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-white/85">
                      <div className="rounded-lg border border-white/15 bg-white/10 px-2 py-1.5">Clients</div>
                      <div className="rounded-lg border border-white/15 bg-white/10 px-2 py-1.5">Chantiers</div>
                      <div className="rounded-lg border border-white/15 bg-white/10 px-2 py-1.5">Devis IA</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {demoScenes.map((scene, index) => (
                      <button
                        key={scene.title}
                        type="button"
                        onClick={() => setDemoIndex(index)}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-white/25"
                        aria-label={`Aller a la scene ${index + 1}`}
                      >
                        <span
                          className={`block h-full transition-all duration-500 ${index === demoIndex ? 'w-full bg-white' : 'w-0 bg-white/50'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#4a6896]">
                  Cette demo presente les ecrans principaux de l application sans quitter la page d accueil.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDemoOpen(false)}
                  className="rounded-xl bg-[#2f66d8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a5bc4]"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
