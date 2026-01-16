import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar,
  Map, 
  Users, 
  Settings, 
  LogOut,
  Building2,
  FileText,
  Library,
  UsersRound,
  Mail,
  Shield,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePermissions, GlobalModuleVisibility } from '@/hooks/usePermissions';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  module?: keyof GlobalModuleVisibility;
  permission?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  requiresEvent?: boolean;
  requiresAccount?: boolean;
  accountAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', module: 'DASHBOARD' },
  { title: 'Events', icon: Calendar, path: '/events', module: 'EVENTS' },
  { title: 'Floorplan', icon: Map, path: '/floorplan', requiresEvent: true },
  { title: 'Exhibitors', icon: Users, path: '/exhibitors', requiresEvent: true },
  { title: 'POS', icon: Receipt, path: '/pos', requiresEvent: true, permission: 'POS_VIEW' },
  { title: 'Exposanten Bibliotheek', icon: Library, path: '/exhibitor-library', requiresAccount: true },
  { title: 'Templates', icon: FileText, path: '/templates', requiresAccount: true },
  { title: 'Team', icon: UsersRound, path: '/team', requiresAccount: true },
  { title: 'Settings', icon: Settings, path: '/settings', requiresEvent: true },
];

const adminItems: NavItem[] = [
  { title: 'Admin Dashboard', icon: Shield, path: '/admin', superAdminOnly: true },
  { title: 'Accounts', icon: Building2, path: '/admin/accounts', superAdminOnly: true },
  { title: 'Demo Requests', icon: FileText, path: '/admin/demo-requests', superAdminOnly: true },
  { title: 'Email Outbox', icon: Mail, path: '/admin/email-outbox', superAdminOnly: true },
  { title: 'Users', icon: Users, path: '/admin/users', superAdminOnly: true },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { hasPermission, isModuleVisible, isSystemAdmin } = usePermissions();
  const { isSuperAdmin, isAccountAdmin, account } = useMultiTenant();
  const { eventId } = useCurrentEvent();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Improved isActive with proper route matching
  const isActive = (path: string) => {
    const pathname = location.pathname;
    
    // Dashboard: exact match
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    
    // Floorplan: matches /events/:id/floorplan AND /events/:id/floorplan/editor
    if (path === '/floorplan' && eventId) {
      return pathname.startsWith(`/events/${eventId}/floorplan`);
    }
    
    // Exhibitors: exact match for event exhibitors
    if (path === '/exhibitors' && eventId) {
      return pathname === `/events/${eventId}/exhibitors`;
    }
    
    // Settings: exact match for event settings
    if (path === '/settings' && eventId) {
      return pathname === `/events/${eventId}/settings`;
    }
    
    // Events: match /events but not when in event-specific pages like floorplan, exhibitors, settings
    if (path === '/events') {
      // Match /events, /events/new, /events/:id, /events/:id/edit
      // But not /events/:id/floorplan, /events/:id/exhibitors, /events/:id/settings
      if (pathname === '/events' || pathname === '/events/new') return true;
      const eventMatch = pathname.match(/^\/events\/([^/]+)(\/edit)?$/);
      return !!eventMatch;
    }
    
    // For other paths, use startsWith
    return pathname.startsWith(path);
  };

  const getHref = (item: NavItem) => {
    if (item.requiresEvent && eventId) {
      if (item.path === '/floorplan') return `/events/${eventId}/floorplan`;
      if (item.path === '/exhibitors') return `/events/${eventId}/exhibitors`;
      if (item.path === '/pos') return `/events/${eventId}/pos/settings`;
      if (item.path === '/settings') return `/events/${eventId}/settings`;
    }
    return item.path;
  };

  const shouldShowItem = (item: NavItem) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !isSystemAdmin) return false;
    if (item.accountAdminOnly && !isAccountAdmin) return false;
    if (item.module && !isModuleVisible(item.module)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.requiresEvent && !eventId) return false;
    if (item.requiresAccount && !account) return false;
    return true;
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
          <div>
            <span className="font-semibold text-foreground block">ComplexExpo</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Exhibition Suite</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (!shouldShowItem(item)) return null;
                const active = isActive(item.path);
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={getHref(item)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                          active
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section */}
        {(isSuperAdmin || isSystemAdmin) && (
          <SidebarGroup className="mt-6">
            <div className="px-3 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Administration
              </span>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  if (!shouldShowItem(item)) return null;
                  const active = isActive(item.path);
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                            active
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {/* System Status */}
        <div className="mb-4 p-3 rounded-lg bg-sidebar-accent/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-foreground">System Status</span>
          </div>
          <p className="text-xs text-muted-foreground">
            All systems operational
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
