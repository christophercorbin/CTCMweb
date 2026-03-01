import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, Settings, User, FileText } from 'lucide-react';
import { getCurrentUser, logout } from '../auth';
import type { CognitoUser } from '../auth';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<CognitoUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const isAdmin = user?.role === 'admin';

  const navigationItems = isAdmin
    ? [
        { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
        { label: 'All Shipments', path: '/admin/shipments', icon: Settings },
      ]
    : [
        { label: 'My Shipments', path: '/dashboard', icon: Home },
        { label: 'Customer Info', path: '/customer-info', icon: User },
        { label: 'Invoices', path: '/invoices', icon: FileText },
      ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 text-white transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#1B2D78' }}
      >
        <div className="flex items-center justify-between h-20 px-4 border-b border-white/10">
          <div className="bg-white rounded-lg px-3 py-1.5">
            <img
              src="/logos/logo-color-horizontal.png"
              alt="CargoLink Barbados"
              className="h-9 w-auto"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-white font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                style={isActive(item.path) ? { backgroundColor: '#F5C518', color: '#1B2D78' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-6 border-t border-white/10">
          <p className="text-xs text-white/60 mb-1">{user?.email}</p>
          <p className="text-xs text-white/40 mb-4 capitalize">{user?.role}</p>
          <button
            onClick={async () => {
              await logout();
              setSidebarOpen(false);
              navigate('/login');
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};
