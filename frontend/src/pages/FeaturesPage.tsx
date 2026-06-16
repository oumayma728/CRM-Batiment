import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  HardHat,
  Truck,
  Bot,
  BarChart3,
  Smartphone,
  Shield,
  Clock,
  MessageSquare,
  Calendar,
  MapPin,
  Wrench,
  ClipboardList,
  TrendingUp,
  Headphones,
  Sparkles,
  ChevronRight,
  Star,
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

const features: Feature[] = [
  {
    id: 'dashboard',
    title: 'Tableau de bord personnalisé',
    description: 'Visualisez en un coup d\'œil vos indicateurs clés : chiffre d\'affaires, projets en cours, devis en attente et factures.',
    icon: <LayoutDashboard size={24} />,
    color: 'blue',
    category: 'Gestion',
  },
  {
    id: 'clients',
    title: 'Gestion des clients',
    description: 'Centralisez toutes vos informations clients, historique des échanges et documents associés.',
    icon: <Users size={24} />,
    color: 'green',
    category: 'CRM',
  },
  {
    id: 'devis',
    title: 'Devis intelligents',
    description: 'Créez des devis professionnels en quelques minutes avec notre catalogue de prestations et matériaux.',
    icon: <FileText size={24} />,
    color: 'indigo',
    category: 'Commercial',
  },
  {
    id: 'factures',
    title: 'Facturation automatisée',
    description: 'Générez automatiquement les factures depuis les devis validés et suivez les paiements.',
    icon: <Receipt size={24} />,
    color: 'purple',
    category: 'Finance',
  },
  {
    id: 'chantiers',
    title: 'Suivi des chantiers',
    description: 'Pilotez vos projets en temps réel avec planning, tâches et avancement.',
    icon: <HardHat size={24} />,
    color: 'orange',
    category: 'Chantier',
  },
  {
    id: 'commandes',
    title: 'Commandes fournisseurs',
    description: 'Gérez vos achats de matériaux et suivez les livraisons en temps réel.',
    icon: <Truck size={24} />,
    color: 'cyan',
    category: 'Achats',
  },
  {
    id: 'ia',
    title: 'Assistant IA',
    description: 'Qualifiez automatiquement les prospects et générez des devis avec notre intelligence artificielle.',
    icon: <Bot size={24} />,
    color: 'violet',
    category: 'Innovation',
  },
  {
    id: 'analyses',
    title: 'Rapports & analyses',
    description: 'Analysez vos performances avec des rapports détaillés sur mesure.',
    icon: <BarChart3 size={24} />,
    color: 'pink',
    category: 'Reporting',
  },
  {
    id: 'mobile',
    title: 'Application mobile',
    description: 'Accédez à vos données depuis le terrain avec notre app mobile dédiée.',
    icon: <Smartphone size={24} />,
    color: 'emerald',
    category: 'Mobilité',
  },
  {
    id: 'securite',
    title: 'Sécurité des données',
    description: 'Données hébergées en France, conformes RGPD et sauvegardes quotidiennes.',
    icon: <Shield size={24} />,
    color: 'slate',
    category: 'Sécurité',
  },
  {
    id: 'planning',
    title: 'Planning collaboratif',
    description: 'Organisez les interventions de vos équipes et sous-traitants.',
    icon: <Calendar size={24} />,
    color: 'teal',
    category: 'Planning',
  },
  {
    id: 'chatbot',
    title: 'Chatbot prospect',
    description: 'Captez et qualifiez automatiquement les leads depuis votre site web.',
    icon: <MessageSquare size={24} />,
    color: 'rose',
    category: 'Marketing',
  },
];

const stats = [
  { value: '500+', label: 'Entreprises clientes', icon: Building2 },
  { value: '50k+', label: 'Devis générés', icon: FileText },
  { value: '98%', label: 'Satisfaction client', icon: Star },
  { value: '24/7', label: 'Support disponible', icon: Headphones },
];

const testimonials = [
  {
    name: 'Thomas Martin',
    role: 'Dirigeant, Artibat',
    content: 'BatiCRM a transformé notre gestion de chantiers. Gain de temps considérable et devis plus professionnels.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  },
  {
    name: 'Sophie Laurent',
    role: 'Assistante, BatiPro',
    content: 'L\'interface est intuitive et l\'assistant IA nous fait gagner un temps précieux sur les devis.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
  {
    name: 'Marc Dubois',
    role: 'Chef de chantier, Construct',
    content: 'Le suivi des tâches et le planning sont parfaits pour coordonner nos équipes sur le terrain.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
];

const categories = ['Toutes', 'CRM', 'Commercial', 'Chantier', 'Finance', 'Innovation'];

export default function FeaturesPage() {
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const filteredFeatures = selectedCategory === 'Toutes'
    ? features
    : features.filter(f => f.category === selectedCategory);

  const getColorClasses = (color: string, isHover: boolean = false) => {
    const colors: Record<string, { bg: string; light: string; dark: string; text: string }> = {
      blue: { bg: 'bg-blue-500', light: 'bg-blue-50', dark: 'bg-blue-600', text: 'text-blue-600' },
      green: { bg: 'bg-green-500', light: 'bg-green-50', dark: 'bg-green-600', text: 'text-green-600' },
      indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50', dark: 'bg-indigo-600', text: 'text-indigo-600' },
      purple: { bg: 'bg-purple-500', light: 'bg-purple-50', dark: 'bg-purple-600', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-500', light: 'bg-orange-50', dark: 'bg-orange-600', text: 'text-orange-600' },
      cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50', dark: 'bg-cyan-600', text: 'text-cyan-600' },
      violet: { bg: 'bg-violet-500', light: 'bg-violet-50', dark: 'bg-violet-600', text: 'text-violet-600' },
      pink: { bg: 'bg-pink-500', light: 'bg-pink-50', dark: 'bg-pink-600', text: 'text-pink-600' },
      emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', dark: 'bg-emerald-600', text: 'text-emerald-600' },
      slate: { bg: 'bg-slate-500', light: 'bg-slate-50', dark: 'bg-slate-600', text: 'text-slate-600' },
      teal: { bg: 'bg-teal-500', light: 'bg-teal-50', dark: 'bg-teal-600', text: 'text-teal-600' },
      rose: { bg: 'bg-rose-500', light: 'bg-rose-50', dark: 'bg-rose-600', text: 'text-rose-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.12),transparent_30%)]" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[280px] w-[280px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <Link
            to="/"
            className="group inline-flex h-11 items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-md"
          >
            <Building2 size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Retour à l'accueil
          </Link>

          <div className="flex gap-3">
            <Link
              to="/login"
              className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="inline-flex h-11 items-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Essai gratuit
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Sparkles size={14} className="mr-2" />
            Découvrez toutes nos fonctionnalités
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Tout ce dont vous avez besoin
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              pour gérer votre activité
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Une solution complète et intégrée pour piloter vos chantiers, vos devis
            et vos équipes depuis une seule plateforme.
          </p>
        </div>

        {/* Stats Section */}
        <div className="mb-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/70 bg-white/80 p-6 text-center backdrop-blur-xl shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <stat.icon size={28} className="mx-auto mb-3 text-blue-600" />
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFeatures.map((feature, index) => {
            const colors = getColorClasses(feature.color);
            return (
              <div
                key={feature.id}
                className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                onMouseEnter={() => setIsHovered(feature.id)}
                onMouseLeave={() => setIsHovered(null)}
              >
                {/* Decorative gradient */}
                <div
                  className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${
                    isHovered === feature.id ? 'opacity-100' : ''
                  }`}
                  style={{
                    background: `radial-gradient(circle at top right, ${colors.light}, transparent 70%)`,
                  }}
                />

                <div className="relative">
                  <div className={`mb-4 inline-flex rounded-xl ${colors.light} p-3 transition-all duration-300 group-hover:scale-110`}>
                    <div className={colors.text}>{feature.icon}</div>
                  </div>

                  <h3 className="mb-2 text-xl font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">{feature.description}</p>

                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    En savoir plus
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlighted Features */}
        <div className="mb-20 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                <Bot size={16} className="mr-2" />
                Innovation
              </div>
              <h2 className="mb-4 text-3xl font-bold">
                Assistant IA intégré
              </h2>
              <p className="mb-6 text-blue-100">
                Notre intelligence artificielle qualifie automatiquement vos prospects,
                génère des devis personnalisés et vous assiste au quotidien.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-blue-200" />
                  <span>Qualification automatique des leads</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-blue-200" />
                  <span>Génération de devis intelligente</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-blue-200" />
                  <span>Assistant disponible 24/7</span>
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <Bot size={120} className="text-white/80" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile App Section */}
        <div className="mb-20 rounded-3xl border border-white/70 bg-white/80 p-8 backdrop-blur-xl sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 flex items-center justify-center lg:order-1">
              <div className="relative">
                <div className="rounded-3xl bg-slate-800 p-3 shadow-xl">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white">
                    <Smartphone size={48} className="mx-auto mb-4" />
                    <p className="text-center text-sm">Application mobile</p>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 rounded-full bg-green-500 p-2 shadow-lg">
                  <CheckCircle2 size={20} className="text-white" />
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                <Smartphone size={16} className="mr-2" />
                Mobilité
              </div>
              <h2 className="mb-4 text-3xl font-bold text-slate-900">
                Gérez votre activité depuis le terrain
              </h2>
              <p className="mb-6 text-slate-600">
                Accédez à toutes les fonctionnalités essentielles depuis notre
                application mobile, disponible sur iOS et Android.
              </p>
              <div className="flex gap-4">
                <div className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                  <div className="text-xs">Télécharger sur</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
                <div className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                  <div className="text-xs">Disponible sur</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Ils nous font confiance
            </h2>
            <p className="mt-2 text-slate-600">
              Découvrez ce que nos clients pensent de BatiCRM
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/70 bg-white/80 p-6 backdrop-blur-xl shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-slate-600">"{testimonial.content}"</p>
                <div className="mt-4 flex text-yellow-400">
                  {'★★★★★'.split('').map((star, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-12 text-center text-white">
          <h2 className="mb-4 text-3xl font-bold">
            Prêt à simplifier votre gestion ?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-blue-100">
            Rejoignez plus de 500 entreprises qui utilisent déjà BatiCRM au quotidien.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Commencer l'essai gratuit
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20"
            >
              Contacter le support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}