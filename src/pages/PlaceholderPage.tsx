import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card className="p-12 text-center">
        <Construction className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6">
          Deze pagina is nog in ontwikkeling.
        </p>
        <Link to="/dashboard" className="text-primary hover:underline">
          Terug naar dashboard
        </Link>
      </Card>
    </div>
  );
}
