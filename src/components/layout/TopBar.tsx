import { Search, Bell, HelpCircle, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function TopBar() {
  const { user } = useAuth();
  const { eventName, eventLocation } = useCurrentEvent();

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        
        {/* Event context */}
        <div>
          {eventName ? (
            <div>
              <h1 className="text-lg font-semibold text-foreground">{eventName}</h1>
              {eventLocation && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{eventLocation}</span>
                </div>
              )}
            </div>
          ) : (
            <h1 className="text-lg font-semibold text-muted-foreground">Select an event</h1>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search exhibitors, stands..." 
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <HelpCircle className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
