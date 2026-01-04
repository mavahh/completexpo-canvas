import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
