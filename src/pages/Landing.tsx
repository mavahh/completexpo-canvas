import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Check, 
  X, 
  ArrowRight, 
  Layers,
  Shield,
  FileOutput,
  ChevronDown,
  ChevronRight,
  Layout,
  Users,
  FileText,
  Settings,
  BarChart3,
  ShoppingCart,
  Building2,
  Loader2,
  Plus,
  CheckCircle
} from 'lucide-react';

// Import screenshot images
import dashboardMockup from '@/assets/landing/dashboard-mockup.png';
import floorplanMockup from '@/assets/landing/floorplan-mockup.png';

// Smooth scroll helper
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Sticky Header Component
function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Product', href: 'product' },
    { label: 'Floorplan', href: 'floorplan' },
    { label: 'Modules', href: 'modules' },
    { label: 'Prijzen', href: 'pricing' },
    { label: 'FAQ', href: 'faq' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-border' : 'bg-white'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Completexpo</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Button onClick={() => scrollToSection('demo')} size="sm" className="rounded-full px-5">
              Vraag demo aan
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`h-0.5 bg-foreground transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`h-0.5 bg-foreground transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 bg-foreground transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => { scrollToSection(link.href); setMobileMenuOpen(false); }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {link.label}
                </button>
              ))}
              <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                Login
              </Link>
              <Button onClick={() => { scrollToSection('demo'); setMobileMenuOpen(false); }} className="mt-2 rounded-full">
                Vraag demo aan
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section id="product" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Beheer je beurs<br />
              <span className="text-primary">van A tot Z.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Teken hallen op schaal, beheer exposanten en stroom/water/opties, en werk samen met je team—alles in één platform.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Button 
                size="lg" 
                className="rounded-full px-6 h-12"
                onClick={() => scrollToSection('demo')}
              >
                Vraag een demo aan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="rounded-full px-6 h-12"
                onClick={() => scrollToSection('floorplan')}
              >
                Bekijk Floorplan Builder
              </Button>
            </div>

            <div className="space-y-3">
              {[
                'Floorplan builder op schaal',
                'Exposanten & opties (stroom/water/lichtpunten)',
                'Teamrollen & rechten per event'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Screenshots */}
          <div className="order-1 lg:order-2 relative">
            {/* Main screenshot */}
            <div className="bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
              <img 
                src={dashboardMockup} 
                alt="Completexpo Dashboard" 
                className="w-full h-auto"
              />
            </div>
            
            {/* Overlapping floorplan screenshot */}
            <div className="absolute -bottom-8 -right-4 lg:right-8 w-48 sm:w-64 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
              <img 
                src={floorplanMockup} 
                alt="Floorplan Editor" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Trust/Social Proof Section
function TrustSection() {
  const cards = [
    {
      icon: Layers,
      title: 'Schaalbaar voor grote hallen',
      description: 'Of het nu 10 of 1.000 stands zijn, Completexpo blijft razend snel.',
    },
    {
      icon: Shield,
      title: 'Duidelijke rechten & audit log',
      description: 'Houd controle over wie wat mag aanpassen en zie de historie.',
    },
    {
      icon: FileOutput,
      title: 'Exports voor print & partners',
      description: 'Genereer in een handomdraai PDF-plattegronden op schaal.',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Gekozen door professionals
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Gebouwd voor organisatoren die snel en foutloos willen plannen.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Problem/Solution Section
function ProblemSolutionSection() {
  const problems = [
    'Excel-sheets die nooit up-to-date zijn',
    'Dubbele standnummers en overlap-fouten',
    'Onduidelijkheid over bestelde opties (stroom/water)',
    'Handmatige exports die telkens opnieuw moeten',
    'Foutgevoelige communicatie met standbouwers',
  ];

  const solutions = [
    'Real-time statussen voor elke stand',
    'Bulk acties voor prijzen en categorieën',
    'Automatische label generator voor print',
    'Conflict warnings bij overlap of dubbele nrs',
    'Directe exports voor partners en leveranciers',
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* Problem */}
          <div className="flex flex-col">
            <span className="inline-flex w-fit px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-4">
              Het Probleem
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
              Zeg vaarwel tegen chaos in spreadsheets.
            </h3>
            <ul className="space-y-4 flex-1">
              {problems.map((problem, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-destructive" />
                  </div>
                  <span className="text-sm text-muted-foreground">{problem}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="bg-primary rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-20">
              <CheckCircle className="w-24 h-24" />
            </div>
            <span className="inline-flex w-fit px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-4">
              De Oplossing
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 relative z-10">
              Alles onder controle in één vloeiende workflow.
            </h3>
            <ul className="space-y-4 relative z-10">
              {solutions.map((solution, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-white/90">{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// Floorplan Builder Section (Dark)
function FloorplanSection() {
  const features = [
    {
      title: 'Fullscreen builder mode',
      description: 'Soepel pannen en zoomen door de grootste hallen zonder vertraging.',
    },
    {
      title: 'Stand statussen',
      description: 'Beschikbaar, Gereserveerd, Verkocht of Geblokkeerd met één klik.',
    },
    {
      title: 'Multi-select & bulk actions',
      description: 'Pas prijzen, types of statussen aan voor tientallen standen tegelijk.',
    },
  ];

  return (
    <section id="floorplan" className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--landing-dark))]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            De Floorplan Builder waar<br />je team écht in wil werken.
          </h2>
          <p className="text-white/70 max-w-xl">
            Teken complexe hallen in minuten, niet uren. Importeer je achtergrondplan en begin direct met indelen.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Screenshot */}
          <div className="bg-[hsl(var(--landing-dark-card))] border border-white/10 rounded-2xl overflow-hidden">
            <img 
              src={floorplanMockup} 
              alt="Floorplan Editor UI" 
              className="w-full h-auto"
            />
          </div>

          {/* Feature cards */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="bg-[hsl(var(--landing-dark-card))] border border-white/10 rounded-xl p-5 flex items-start justify-between gap-4 hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <div>
                  <h4 className="font-semibold text-primary mb-1">{feature.title}</h4>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Modules Section
function ModulesSection() {
  const modules = [
    { icon: BarChart3, title: 'Dashboard', available: true },
    { icon: Layout, title: 'Floorplan', available: true },
    { icon: Users, title: 'Exposanten', available: true },
    { icon: FileText, title: 'Aanvragen', available: true },
    { icon: Settings, title: 'Instellingen', available: true },
    { icon: BarChart3, title: 'Insights', available: true },
    { icon: ShoppingCart, title: 'POS', available: false },
    { icon: Building2, title: 'CRM', available: false },
  ];

  return (
    <section id="modules" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Alle modules die je nodig hebt
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Kies welke functionaliteiten je wilt activeren voor je team.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((module, i) => {
            const Icon = module.icon;
            return (
              <div 
                key={i} 
                className={`bg-white border border-border rounded-xl p-5 text-center hover:shadow-md transition-shadow ${!module.available ? 'opacity-60' : ''}`}
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium text-foreground text-sm">{module.title}</h4>
                {!module.available && (
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      description: 'Voor kleine beurzen',
      price: 'Gratis',
      features: ['1 event', 'Tot 50 stands', 'Basis floorplan', 'Email support'],
    },
    {
      name: 'Pro',
      description: 'Voor professionele organisatoren',
      price: 'Op aanvraag',
      features: ['Onbeperkte events', 'Onbeperkte stands', 'Alle modules', 'Priority support', 'Team rollen'],
      popular: true,
    },
    {
      name: 'Enterprise',
      description: 'Voor grote organisaties',
      price: 'Op maat',
      features: ['Alles van Pro', 'SSO/SAML', 'Dedicated support', 'Custom integraties', 'SLA garantie'],
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Eenvoudige, transparante prijzen
          </h2>
          <p className="text-muted-foreground">
            Begin gratis, schaal wanneer je groeit.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`bg-white border rounded-2xl p-6 relative ${plan.popular ? 'border-primary shadow-lg' : 'border-border'}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                  Populair
                </span>
              )}
              <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
              <p className="text-2xl font-bold text-foreground mb-6">{plan.price}</p>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className={`w-full rounded-full ${plan.popular ? '' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
                variant={plan.popular ? 'default' : 'secondary'}
                onClick={() => scrollToSection('demo')}
              >
                Vraag demo aan
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Hoe werkt de floorplan builder?',
      answer: 'Je uploadt een achtergrondafbeelding (PDF of afbeelding) en tekent daaroverheen je stands. Alles is op schaal en je kunt eenvoudig standen verplaatsen, groeperen en van labels voorzien.',
    },
    {
      question: 'Kan ik meerdere hallen beheren?',
      answer: 'Ja, elk event kan meerdere hallen of zones bevatten. Je schakelt eenvoudig tussen hallen binnen dezelfde plattegrond editor.',
    },
    {
      question: 'Hoe werken de teamrollen?',
      answer: 'Je kunt teamleden uitnodigen met verschillende rollen: Admin (volledige toegang), Manager (bewerken) of Viewer (alleen bekijken). Per event kun je ook specifieke rechten toekennen.',
    },
    {
      question: 'Welke export formaten worden ondersteund?',
      answer: 'Je kunt plattegronden exporteren als PDF (op schaal voor print), PNG/JPG (voor presentaties) en Excel (standenlijst met alle data).',
    },
    {
      question: 'Is mijn data veilig?',
      answer: 'Alle data wordt versleuteld opgeslagen en verwerkt conform de AVG. We maken dagelijks back-ups en je data blijft altijd van jou.',
    },
    {
      question: 'Kan ik Completexpo integreren met andere systemen?',
      answer: 'In de Enterprise versie bieden we API-toegang en custom integraties. Neem contact op voor meer informatie over de mogelijkheden.',
    },
  ];

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Veelgestelde vragen
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="bg-white border border-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
              >
                <span className="font-medium text-foreground">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Demo Request Section
function DemoSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('demo_requests').insert({
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone || null,
        reason: formData.reason || null,
        user_id: null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Aanvraag verstuurd!',
        description: 'We nemen zo snel mogelijk contact met je op.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Aanvraag ontvangen!</h3>
          <p className="text-muted-foreground">
            Bedankt voor je interesse in Completexpo. We bekijken je aanvraag en nemen binnen 1 werkdag contact met je op.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Vraag een demo aan
          </h2>
          <p className="text-muted-foreground">
            Ontdek hoe Completexpo jouw beurzen kan transformeren.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Bedrijfsnaam *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Jouw bedrijf B.V."
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contactpersoon *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Voornaam Achternaam"
                required
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@bedrijf.nl"
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoonnummer</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+31 6 12345678"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Bericht (optioneel)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Vertel ons over je beurzen of evenementen..."
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          <Button type="submit" className="w-full h-12 rounded-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verstuur aanvraag
          </Button>
        </form>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  const links = [
    { label: 'Product', href: 'product' },
    { label: 'Floorplan', href: 'floorplan' },
    { label: 'Prijzen', href: 'pricing' },
    { label: 'FAQ', href: 'faq' },
  ];

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Completexpo</span>
          </div>

          <nav className="flex items-center gap-6">
            {links.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Completexpo. Alle rechten voorbehouden.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page
export default function Landing() {
  // Set page title
  useEffect(() => {
    document.title = 'Completexpo - Beheer je beurs van A tot Z';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <HeroSection />
      <TrustSection />
      <ProblemSolutionSection />
      <FloorplanSection />
      <ModulesSection />
      <PricingSection />
      <FAQSection />
      <DemoSection />
      <Footer />
    </div>
  );
}
