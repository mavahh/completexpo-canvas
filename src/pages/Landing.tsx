import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Layout, 
  ArrowRight, 
  ShoppingCart, 
  Search, 
  CreditCard,
  UserPlus,
  FileText,
  DollarSign,
  BarChart3,
  Clock
} from 'lucide-react';

const features = [
  { icon: Layout, label: 'Floor Plan Design', description: 'Ontwerp en beheer plattegronden' },
  { icon: BarChart3, label: 'Floor Plan Management', description: 'Visueel standbeheer' },
  { icon: ShoppingCart, label: 'Online stand reservation', description: 'Self-service boekingen' },
  { icon: Search, label: 'Interactive Floor Plan', description: 'Zoek en filter stands' },
  { icon: CreditCard, label: 'Order Management', description: 'Bestellingen beheren' },
  { icon: DollarSign, label: 'Online payment', description: 'Geïntegreerde betalingen' },
  { icon: Users, label: 'CRM', description: 'Klantrelatiebeheer' },
  { icon: FileText, label: 'Information & Document Management', description: 'Documentenbeheer' },
  { icon: UserPlus, label: 'Exhibitor Management', description: 'Exposantenbeheer' },
  { icon: Users, label: 'Multi Attendee Types', description: 'Verschillende gebruikersrollen' },
  { icon: Clock, label: 'Pricing & Deadlines', description: 'Tarieven en termijnen' },
  { icon: FileText, label: 'Invoicing', description: 'Automatische facturatie' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-lg text-foreground">Completexpo</span>
        </div>
        <Link to="/login">
          <Button>Inloggen</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
          Beheer je beurzen en exposities
          <span className="text-primary"> moeiteloos</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Van plattegronden tot exposanten, van orders tot berichten. 
          Completexpo brengt alles samen in één overzichtelijk platform.
        </p>
        <Link to="/login">
          <Button size="lg" className="h-12 px-8">
            Start nu gratis
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </section>

      {/* Features Section - Hexagon Style */}
      <section className="px-6 py-16 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-foreground mb-4">
            Effective solutions
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            <span className="font-medium text-foreground">Mix & Match</span> and create your customized solution
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex flex-col items-center text-center group">
                  <div className="relative mb-4">
                    {/* Hexagon shape */}
                    <div className="w-20 h-20 bg-primary rounded-2xl rotate-45 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Icon className="w-8 h-8 text-primary-foreground -rotate-45" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-foreground leading-tight">
                    {feature.label}
                  </h3>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link to="/login">
              <Button className="px-8">
                DISCOVER ALL FEATURES
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Simple Features */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Evenementenbeheer</h3>
              <p className="text-muted-foreground text-sm">
                Beheer al je evenementen op één plek met uitgebreide instellingen en rapportages.
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Exposantenbeheer</h3>
              <p className="text-muted-foreground text-sm">
                Houd alle exposanten en hun contactgegevens bij met geavanceerde zoek- en filteropties.
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Layout className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Plattegrond Editor</h3>
              <p className="text-muted-foreground text-sm">
                Ontwerp en beheer je beursplattegronden met een intuïtieve drag-and-drop editor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Klaar om te starten?
          </h2>
          <p className="text-muted-foreground mb-8">
            Begin vandaag nog met het beheren van je beurzen en exposities.
          </p>
          <Link to="/login">
            <Button size="lg" className="h-12 px-8">
              Probeer Completexpo gratis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © 2024 Completexpo. Alle rechten voorbehouden.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Voorwaarden
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
