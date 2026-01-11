import { Search, Bell, HelpCircle, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './ThemeToggle';
import { EventSelector } from '@/components/dashboard/EventSelector';

export function TopBar() {
  const { user } = useAuth();
  const { eventId, eventName, eventLocation, setCurrentEvent } = useCurrentEvent();

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <SidebarTrigger className="flex-shrink-0" />
        
        {/* Event selector */}
        <div className="hidden sm:block">
          <EventSelector
            selectedEventId={eventId}
            onEventChange={(id) => setCurrentEvent(id)}
          />
        </div>
        
        {/* Event context display */}
        {eventName && (
          <div className="hidden lg:block border-l border-border pl-4">
            <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{eventName}</h1>
            {eventLocation && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{eventLocation}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search - hidden on mobile */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search exhibitors, stands..." 
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9 sm:h-10 sm:w-10">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex">
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border">
          <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs sm:text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
