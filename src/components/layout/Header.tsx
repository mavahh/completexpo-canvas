import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { usePermissions, GlobalModuleVisibility } from '@/hooks/usePermissions';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Button } from '@/components/ui/button';
import { LogOut, HelpCircle, Globe } from 'lucide-react';
import logo from '@/assets/logo.png';

interface TabConfig {
  label: string;
  path: string;
  module?: keyof GlobalModuleVisibility;
  permission?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const mainTabs: TabConfig[] = [
  { label: 'Dashboard', path: '/dashboard', module: 'DASHBOARD' },
  { label: 'Evenementen', path: '/events', module: 'EVENTS' },
  { label: 'Gebruikers', path: '/users', module: 'USERS', permission: 'USERS_VIEW' },
  { label: 'Rollen', path: '/roles', adminOnly: true },
  { label: 'Accounts', path: '/admin/accounts', superAdminOnly: true },
  { label: 'CRM', path: '/crm', module: 'CRM' },
];

export function Header() {
  const { user, signOut } = useAuth();
  const { hasPermission, isModuleVisible, isSystemAdmin } = usePermissions();
  const { isSuperAdmin } = useMultiTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Goedemorgen';
    if (hour < 18) return 'Goedemiddag';
    return 'Goedenavond';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActiveTab = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="CompleteXpo" className="h-9 w-auto" />
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {getGreeting()}, <span className="text-foreground font-medium">{user?.user_metadata?.name || user?.email?.split('@')[0]}</span>
          </span>
          
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-4 h-4 mr-1" />
              Help
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Globe className="w-4 h-4 mr-1" />
              NL
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Uitloggen
            </Button>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex items-center gap-1 px-6">
        {mainTabs.map((tab) => {
          // Check super admin only first
          if (tab.superAdminOnly && !isSuperAdmin) return null;
          // Check admin-only
          if (tab.adminOnly && !isSystemAdmin) return null;
          // Check module visibility
          if (tab.module && !isModuleVisible(tab.module)) return null;
          // Check specific permission
          if (tab.permission && !hasPermission(tab.permission)) return null;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`nav-tab ${isActiveTab(tab.path) ? 'nav-tab-active' : ''}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
