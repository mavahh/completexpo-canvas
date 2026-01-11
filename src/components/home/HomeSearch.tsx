import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface HomeSearchProps {
  eventId: string | null;
}

export function HomeSearch({ eventId }: HomeSearchProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Navigate to exhibitors page with search query
    if (eventId) {
      navigate(`/events/${eventId}/exhibitors?q=${encodeURIComponent(query)}`);
    } else {
      navigate(`/exhibitor-library?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Zoek exposanten, stands..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 bg-background"
      />
    </form>
  );
}
