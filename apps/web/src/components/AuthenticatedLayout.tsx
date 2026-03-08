import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, User, FileText, Warehouse, Bell, ScanLine } from 'lucide-react';
import { getCurrentUser, logout } from '../auth';
import type { CognitoUser } from '../auth';
import { useShipments } from '../hooks/useShipments';

// ─── Notification helpers ─────────────────────────────────────────────────────
const DISMISSED_KEY = 'ctcm_dismissed_notifs';

const getDismissed = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
};

const saveDismissed = (ids: Set<string>) =>
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));

// ─── Bell + notification dropdown (customers only) ────────────────────────────
interface NotifItem {
  id: string;
  trackingNumber: string;
  createdAt: string;
}

function CustomerNotifications({ onCount }: { onCount: (n: number) => void }) {
  const { shipments } = useShipments();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Packages at Miami warehouse still awaiting Ship/Hold decision
  const pending: NotifItem[] = shipments
    .filter((s) => s.status === 'MIAMI_WAREHOUSE' && !s.customerInstruction)
    .map((s) => ({ id: s.id, trackingNumber: s.trackingNumber, createdAt: s.createdAt }));

  const unread = pending.filter((n) => !dismissed.has(n.id));

  // Lift unread count up to the layout for the sidebar badge
  useEffect(() => {
    onCount(unread.length);
  }, [unread.length, onCount]);

  const dismiss = (id: string) =>
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });

  const dismissAll = () => {
    const next = new Set([...dismissed, ...pending.map((n) => n.id)]);
    setDismissed(next);
    saveDismissed(next);
  };

  const goToPending = (id?: string) => {
    if (id) dismiss(id);
    else dismissAll();
    setOpen(false);
    navigate('/dashboard/pending-packages');
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              {unread.length > 0 && (
                <button onClick={dismissAll} className="text-xs text-blue-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            {/* Empty state */}
            {pending.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {pending.map((n) => {
                    const isUnread = !dismissed.has(n.id);
                    return (
                      <li
                        key={n.id}
                        className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                          isUnread ? 'bg-blue-50 hover:bg-blue-50/80' : ''
                        }`}
                        onClick={() => goToPending(n.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              📦 Package at Miami warehouse
                            </p>
                            <p className="text-xs font-mono text-gray-500 mt-0.5 truncate">
                              {n.trackingNumber}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(n.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              · Ship or Hold?
                            </p>
                          </div>
                          {isUnread && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer CTA */}
                <div
                  className="px-4 py-3 border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => goToPending()}
                >
                  <p className="text-sm text-center text-blue-600 font-medium">
                    View all pending packages →
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getCurrentUser()
      .then((u) => { setUser(u); setAuthLoading(false); })
      .catch(() => setAuthLoading(false));
  }, []);

  const isAdmin = user?.role === 'admin';

  // Stable callback so CustomerNotifications' useEffect doesn't loop
  const handlePendingCount = useCallback((n: number) => setPendingCount(n), []);

  const navigationItems = isAdmin
    ? [
        { label: 'Dashboard',       path: '/admin/dashboard',         icon: Home,     badge: 0 },
        { label: 'Process Receipt', path: '/admin/warehouse-receipt', icon: ScanLine, badge: 0 },
      ]
    : [
        { label: 'My Shipments',         path: '/dashboard',                   icon: Home,      badge: 0 },
        { label: 'Ship or Hold',           path: '/dashboard/pending-packages',  icon: Warehouse, badge: pendingCount },
        { label: 'Customer Info',         path: '/customer-info',               icon: User,      badge: 0 },
        { label: 'Invoices',              path: '/invoices',                    icon: FileText,  badge: 0 },
      ];

  // Exact match for /dashboard so sub-routes don't double-highlight
  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Sidebar ── */}
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
            const active = isActive(item.path);
            const hasBadge = item.badge > 0;

            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  active
                    ? 'text-white font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                style={active ? { backgroundColor: '#F5C518', color: '#1B2D78' } : {}}
              >
                {/* Icon with optional bounce + badge */}
                <div className="relative flex-shrink-0">
                  <Icon className={`w-5 h-5 ${hasBadge ? 'animate-bounce' : ''}`} />
                  {hasBadge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-1 ring-white/30">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-6 border-t border-white/10">
          <p className="text-xs text-white/60 mb-1">{user?.email}</p>
          <p className="text-xs text-white/40 mb-4 capitalize">{user?.role}</p>
          <button
            onClick={async () => { await logout(); setSidebarOpen(false); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 sticky top-0 z-40 gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          {/* Notification bell — customers only, shown once auth resolves */}
          {!authLoading && !isAdmin && (
            <CustomerNotifications onCount={handlePendingCount} />
          )}

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
