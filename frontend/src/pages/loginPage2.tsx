import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Building2, Menu, Sparkles, Heart, Target, Lightbulb,
  Award, Shield, TrendingUp, Mail, MapPin,
  Phone, Quote, Star, Eye, Sun, Moon, Zap, Users, BarChart3, FileText, Bot,
  PlayCircle, ChevronRight, CheckCircle, Globe, Clock, ThumbsUp,
  MessageSquare, Calendar, UserPlus, Briefcase, Layers, Cpu, Home
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Value {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

interface Milestone {
  year: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  badge?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const values: Value[] = [
  {
    title: 'Innovation',
    description: "Nous intégrons les dernières technologies pour offrir des solutions toujours plus performantes.",
    icon: Lightbulb,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Proximité',
    description: "À l'écoute de nos clients, nous construisons des relations de confiance durables.",
    icon: Heart,
    color: 'from-rose-500 to-pink-500',
  },
  {
    title: 'Excellence',
    description: "Nous visons l'excellence dans tout ce que nous entreprenons, pour vous garantir le meilleur.",
    icon: Award,
    color: 'from-amber-500 to-orange-500',
  },
  {
    title: 'Transparence',
    description: "Une communication claire et honnête est au cœur de nos relations clients.",
    icon: Shield,
    color: 'from-emerald-500 to-teal-500',
  },
];

const milestones: Milestone[] = [
  { year: '2021', title: 'Création de BatiCRM', description: 'Lancement de la première version', icon: RocketIcon },
  { year: '2022', title: '100 clients', description: 'Franchissement du cap des 100 entreprises', icon: Users },
  { year: '2023', title: 'Assistant IA', description: "Lancement de l'intelligence artificielle", icon: Cpu },
  { year: '2024', title: '500+ clients', description: 'Plus de 500 entreprises nous font confiance', icon: Award },
];

const features: Feature[] = [
  { icon: FileText, title: 'Devis intelligents', description: "Générez des devis professionnels en quelques clics avec notre bibliothèque de prestations préconfigurée.", color: 'from-blue-500 to-cyan-500', badge: 'Populaire' },
  { icon: Bot, title: 'Assistant IA', description: "Un chatbot intégré qualifie vos prospects 24h/24 et structure automatiquement leurs besoins.", color: 'from-purple-500 to-indigo-500', badge: 'Nouveau' },
  { icon: BarChart3, title: 'Tableau de bord', description: "Visualisez vos KPIs en temps réel : chiffre d'affaires, taux de transformation, marges.", color: 'from-emerald-500 to-teal-500' },
  { icon: Users, title: 'Gestion des équipes', description: "Planifiez vos chantiers, assignez des tâches et suivez l'avancement de chaque équipe.", color: 'from-amber-500 to-orange-500' },
  { icon: TrendingUp, title: 'Suivi commercial', description: "Pipeline CRM complet du premier contact jusqu'à la signature et la facturation.", color: 'from-rose-500 to-pink-500' },
  { icon: Shield, title: 'Sécurité des données', description: 'Hébergement en France, chiffrement de bout en bout, conformité RGPD garantie.', color: 'from-slate-500 to-slate-600' },
];

// ─── Composant Rocket ──────────────────────────────────────────────────────
function RocketIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('baticrm-theme');
    if (saved === 'dark') setDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('baticrm-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  const navLinks = [
    { label: 'Accueil', action: () => scrollTo(heroRef), icon: Home },
    { label: 'Fonctionnalités', action: () => scrollTo(featuresRef), icon: Layers },
    { label: 'Contact', action: () => scrollTo(contactRef), icon: MessageSquare },
  ];

  const d = dark;

  return (
    <div className={d ? 'dark' : ''}>
      <div className={`relative min-h-screen font-sans transition-colors duration-300 ${d ? 'bg-[#0f1117] text-slate-100' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900'}`}>

        {/* Ambient blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className={`absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl ${d ? 'bg-blue-900/30' : 'bg-blue-400/20'}`} />
          <div className={`absolute -bottom-40 -left-40 h-96 w-96 rounded-full blur-3xl ${d ? 'bg-indigo-900/30' : 'bg-indigo-400/20'}`} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 pt-4">

          {/* ── HEADER ── */}
          <header className={`sticky top-4 z-50 rounded-2xl border transition-all duration-300 ${scrolled ? 'shadow-xl' : 'shadow-sm'} ${d ? 'bg-[#1a1d2e]/90 border-white/10 backdrop-blur-xl' : 'bg-white/85 border-white/40 backdrop-blur-xl'}`}>
            <div className="px-6 py-4 flex items-center justify-between gap-4">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 group-hover:scale-110">
                  <Building2 size={18} />
                </div>
                <span className={`text-xl font-extrabold tracking-tight ${d ? 'text-white' : 'text-slate-900'}`}>
                  Bati<span className="text-blue-600">CRM</span>
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((n) => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.label}
                      onClick={n.action}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 cursor-pointer ${d ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'}`}
                    >
                      <Icon size={16} />
                      {n.label}
                    </button>
                  );
                })}
                
                {/* Bouton Demo */}
                <button
                  onClick={() => scrollTo(contactRef)}
                  className="ml-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-xl group"
                >
                  <PlayCircle size={16} />
                  Demo
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </button>
              </nav>

              <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
                <button
                  onClick={() => setDark(!d)}
                  className={`rounded-xl p-2.5 transition-all hover:scale-110 ${d ? 'bg-white/10 text-yellow-300 hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {d ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <Link
                  to="/login"
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:scale-105 ${d ? 'border-white/20 text-slate-200 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Connexion
                </Link>

                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`md:hidden rounded-lg p-2 ${d ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Menu size={22} />
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
              <div className={`md:hidden px-6 pb-5 pt-3 border-t flex flex-col gap-2 ${d ? 'border-white/10' : 'border-slate-100'}`}>
                {navLinks.map((n) => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.label}
                      onClick={n.action}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] ${d ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-blue-50'}`}
                    >
                      <Icon size={18} />
                      {n.label}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => scrollTo(contactRef)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:shadow-xl mt-2"
                >
                  <PlayCircle size={18} />
                  Demander une démo
                  <ChevronRight size={16} />
                </button>

                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl border text-center px-4 py-3 text-sm font-semibold ${d ? 'border-white/20 text-slate-200 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Connexion
                </Link>
              </div>
            )}
          </header>

          {/* ── HERO ── */}
          <section ref={heroRef} className="mt-16 text-center scroll-mt-24">
            <div className="mx-auto max-w-3xl">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold backdrop-blur-sm ${d ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-blue-200 bg-white/80 text-blue-700'}`}>
                <Sparkles size={13} className="text-blue-500" />
                Notre histoire
              </span>
              <h1 className={`mt-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight ${d ? 'text-white' : 'text-slate-900'}`}>
                Une vision claire pour<br />
                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  révolutionner le BTP
                </span>
              </h1>
              <p className={`mt-6 text-lg leading-relaxed ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                Nous avons créé BatiCRM avec une conviction forte&nbsp;: digitaliser le BTP ne doit pas être complexe.
                Notre mission est de mettre la technologie au service des professionnels du bâtiment.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => scrollTo(featuresRef)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  Voir les fonctionnalités <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => scrollTo(contactRef)}
                  className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-all hover:scale-105 ${d ? 'border-white/20 text-slate-200 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-white'}`}
                >
                  Nous contacter
                </button>
              </div>
              <div className={`mt-10 flex flex-wrap justify-center gap-8 text-sm ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                {([['500+', 'entreprises clientes'], ['98%', 'satisfaction client'], ['40h', 'gagnées/mois']] as [string, string][]).map(([n, l]) => (
                  <div key={l} className="text-center">
                    <div className={`text-3xl font-extrabold ${d ? 'text-white' : 'text-slate-900'}`}>{n}</div>
                    <div className="mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── MISSION / VISION ── */}
          <section className="mt-20 grid gap-6 lg:grid-cols-2">
            {[
              { icon: Target, color: 'blue', title: 'Notre mission', text: "Simplifier la gestion des entreprises du bâtiment en offrant une plateforme unique, intuitive et puissante. Nous croyons que la technologie doit être un levier de croissance, pas une contrainte." },
              { icon: Eye, color: 'purple', title: 'Notre vision', text: "Devenir le partenaire digital incontournable des professionnels du BTP, en France puis en Europe, en innovant constamment pour anticiper vos besoins." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-2xl p-8 ring-1 transition-all hover:-translate-y-1 hover:shadow-lg ${d ? 'bg-white/5 ring-white/10' : 'bg-white/80 ring-slate-200/60 backdrop-blur-sm'}`}>
                  <div className={`mb-4 inline-flex rounded-xl p-3 ${item.color === 'blue' ? (d ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') : (d ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600')}`}>
                    <Icon size={22} />
                  </div>
                  <h2 className={`mb-3 text-xl font-bold ${d ? 'text-white' : 'text-slate-900'}`}>{item.title}</h2>
                  <p className={`leading-relaxed ${d ? 'text-slate-400' : 'text-slate-600'}`}>{item.text}</p>
                </div>
              );
            })}
          </section>

          {/* ── VALUES ── */}
          <section className="mt-20">
            <div className="text-center mb-10">
              <h2 className={`text-3xl sm:text-4xl font-extrabold ${d ? 'text-white' : 'text-slate-900'}`}>
                Nos valeurs
              </h2>
              <p className={`mt-2 text-lg ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                Ce qui nous guide au quotidien
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div
                    key={value.title}
                    className={`group rounded-2xl p-6 text-center ring-1 transition-all hover:-translate-y-2 hover:shadow-xl ${d ? 'bg-white/5 ring-white/10' : 'bg-white ring-slate-200/60 shadow-sm'}`}
                  >
                    <div className={`mx-auto mb-4 inline-flex rounded-xl bg-gradient-to-br ${value.color} p-3.5 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon size={22} />
                    </div>
                    <h3 className={`text-base font-bold ${d ? 'text-white' : 'text-slate-900'}`}>
                      {value.title}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section ref={featuresRef} className="mt-24 scroll-mt-24">
            <div className="text-center mb-10">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${d ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-purple-200 bg-white/80 text-purple-700'}`}>
                <Zap size={13} />
                Plateforme complète
              </span>
              <h2 className={`mt-4 text-3xl sm:text-4xl font-extrabold ${d ? 'text-white' : 'text-slate-900'}`}>
                Tout ce dont vous avez besoin
              </h2>
              <p className={`mt-2 mx-auto max-w-xl text-lg ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                Une suite d'outils pensée pour les professionnels du bâtiment
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className={`group rounded-2xl p-6 ring-1 transition-all hover:-translate-y-1 hover:shadow-xl ${d ? 'bg-white/5 ring-white/10' : 'bg-white ring-slate-200/60 shadow-sm'}`}
                    onMouseEnter={() => setActiveFeature(index)}
                    onMouseLeave={() => setActiveFeature(null)}
                  >
                    <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon size={20} />
                    </div>
                    {feature.badge && (
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${d ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        {feature.badge}
                      </span>
                    )}
                    <h3 className={`font-bold text-base ${d ? 'text-white' : 'text-slate-900'}`}>{feature.title}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${d ? 'text-slate-400' : 'text-slate-600'}`}>{feature.description}</p>
                    <div className={`mt-4 text-sm font-medium transition-all duration-300 ${activeFeature === index ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'} ${d ? 'text-blue-400' : 'text-blue-600'}`}>
                      En savoir plus →
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── MILESTONES ── */}
          <section className="mt-24">
            <div className="text-center mb-12">
              <h2 className={`text-3xl sm:text-4xl font-extrabold ${d ? 'text-white' : 'text-slate-900'}`}>Notre parcours</h2>
              <p className={`mt-2 text-lg ${d ? 'text-slate-400' : 'text-slate-600'}`}>Les étapes clés de notre aventure</p>
            </div>
            <div className="relative">
              <div className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 hidden lg:block ${d ? 'bg-gradient-to-b from-blue-500 to-indigo-600' : 'bg-gradient-to-b from-blue-400 to-indigo-500'}`} />
              <div className="flex flex-col gap-6 lg:gap-10">
                {milestones.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.year} className="lg:grid lg:grid-cols-[1fr_3rem_1fr] lg:items-center">
                      {i % 2 === 0 ? (
                        <>
                          <div className={`rounded-2xl p-5 ring-1 transition-all hover:-translate-y-1 lg:text-right lg:mr-4 ${d ? 'bg-white/5 ring-white/10' : 'bg-white/80 ring-slate-200/60 shadow-sm'}`}>
                            <div className={`text-2xl font-extrabold ${d ? 'text-blue-400' : 'text-blue-600'}`}>{m.year}</div>
                            <h3 className={`mt-1 font-bold ${d ? 'text-white' : 'text-slate-900'}`}>{m.title}</h3>
                            <p className={`text-sm mt-0.5 ${d ? 'text-slate-400' : 'text-slate-600'}`}>{m.description}</p>
                          </div>
                          <div className="hidden lg:flex items-center justify-center">
                            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-blue-500/20" />
                          </div>
                          <div className="hidden lg:block" />
                        </>
                      ) : (
                        <>
                          <div className="hidden lg:block" />
                          <div className="hidden lg:flex items-center justify-center">
                            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-blue-500/20" />
                          </div>
                          <div className={`rounded-2xl p-5 ring-1 transition-all hover:-translate-y-1 lg:ml-4 ${d ? 'bg-white/5 ring-white/10' : 'bg-white/80 ring-slate-200/60 shadow-sm'}`}>
                            <div className={`text-2xl font-extrabold ${d ? 'text-indigo-400' : 'text-indigo-600'}`}>{m.year}</div>
                            <h3 className={`mt-1 font-bold ${d ? 'text-white' : 'text-slate-900'}`}>{m.title}</h3>
                            <p className={`text-sm mt-0.5 ${d ? 'text-slate-400' : 'text-slate-600'}`}>{m.description}</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── TESTIMONIALS ── */}
          <section className="mt-24">
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 text-white shadow-2xl shadow-blue-500/20">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <Quote size={44} className="mb-4 text-blue-200/60" />
                  <h2 className="text-2xl lg:text-3xl font-extrabold">Ce qu'ils disent de nous</h2>
                  <p className="mt-2 text-blue-100/80">Des professionnels du BTP témoignent</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex text-yellow-300">
                      {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                    </div>
                    <span className="text-sm font-medium text-blue-100">4.9/5 sur 200+ avis</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { text: "BatiCRM a complètement transformé notre façon de travailler. Gain de temps considérable et une meilleure organisation au quotidien.", author: 'Jean Dupont', company: 'Artibat' },
                    { text: "L'assistant IA nous fait gagner un temps précieux sur les devis. Une vraie révolution pour notre activité !", author: 'Sophie Laurent', company: 'BatiPro' },
                  ].map(({ text, author, company }) => (
                    <div key={author} className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/10">
                      <p className="text-sm leading-relaxed text-white/90">"{text}"</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex text-yellow-300">
                          {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                        </div>
                        <span className="text-sm font-semibold">{author},</span>
                        <span className="text-sm text-blue-200">{company}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── CONTACT ── */}
          <section ref={contactRef} className="mt-24 scroll-mt-24">
            <div className={`rounded-3xl p-8 sm:p-12 ring-1 ${d ? 'bg-white/5 ring-white/10' : 'bg-white/80 ring-slate-200/60 backdrop-blur-sm shadow-sm'}`}>
              <div className="text-center mb-10">
                <h2 className={`text-3xl sm:text-4xl font-extrabold ${d ? 'text-white' : 'text-slate-900'}`}>Contactez-nous</h2>
                <p className={`mt-2 text-lg ${d ? 'text-slate-400' : 'text-slate-600'}`}>Notre équipe vous répond sous 24h</p>
              </div>
              <div className="grid gap-10 lg:grid-cols-2">
                {/* Info */}
                <div className="space-y-5">
                  {[
                    { icon: MapPin, text: '15 Rue des Entrepreneurs, 75001 Paris' },
                    { icon: Phone, text: '+33 1 23 45 67 89' },
                    { icon: Mail, text: 'contact@baticrm.fr' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.text} className="flex items-center gap-4">
                        <div className={`rounded-xl p-3 ${d ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <Icon size={18} />
                        </div>
                        <span className={d ? 'text-slate-300' : 'text-slate-700'}>{item.text}</span>
                      </div>
                    );
                  })}
                  <div className={`mt-6 rounded-2xl p-5 ${d ? 'bg-white/5 border border-white/10' : 'bg-blue-50 border border-blue-100'}`}>
                    <p className={`text-sm font-medium ${d ? 'text-slate-300' : 'text-slate-700'}`}>📅 Demandez une démo gratuite</p>
                    <p className={`mt-1 text-sm ${d ? 'text-slate-400' : 'text-slate-600'}`}>30 minutes pour voir BatiCRM en action avec un expert.</p>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Votre nom"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 ${d ? 'bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400'}`}
                  />
                  <input
                    type="email"
                    placeholder="Votre email"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 ${d ? 'bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400'}`}
                  />
                  <input
                    type="text"
                    placeholder="Votre société"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 ${d ? 'bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400'}`}
                  />
                  <textarea
                    placeholder="Votre message"
                    rows={4}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 resize-none ${d ? 'bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400'}`}
                  />
                  <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:scale-[1.02]">
                    Envoyer le message →
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="mt-12 text-center">
            <div className={`rounded-3xl p-10 sm:p-14 ring-1 ${d ? 'bg-gradient-to-br from-blue-900/50 to-indigo-900/50 ring-blue-500/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
              <h2 className="text-3xl font-extrabold text-white">Prêt à rejoindre l'aventure ?</h2>
              <p className="mx-auto mt-3 max-w-md text-blue-100/80">Découvrez comment BatiCRM peut transformer votre entreprise dès aujourd'hui.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => scrollTo(contactRef)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-blue-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  Demander une démo <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => scrollTo(featuresRef)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20"
                >
                  Voir les fonctionnalités
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}