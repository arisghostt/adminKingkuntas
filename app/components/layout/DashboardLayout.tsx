'use client';

import { useState, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '../LanguageProvider';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { getAuthSession } from '@/app/lib/auth';
import { useAuthStore } from '@/store/authStore';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Map pathname → label et icon pour l'affichage
const PAGE_META: Record<string, { label: string; icon: string }> = {
  '/dashboard': { label: 'Dashboard', icon: 'Home' },
  '/products': { label: 'Products', icon: 'Package' },
  '/products/add': { label: 'Add Product', icon: 'Package' },
  '/products/grid': { label: 'Product Grid', icon: 'Package' },
  '/orders': { label: 'Orders', icon: 'ShoppingCart' },
  '/inventory': { label: 'Inventory', icon: 'Boxes' },
  '/inventory/movements': { label: 'Stock Movements', icon: 'Boxes' },
  '/inventory/alerts': { label: 'Stock Alerts', icon: 'Boxes' },
  '/inventory/stock': { label: 'Stock Overview', icon: 'Boxes' },
  '/customers': { label: 'Customers', icon: 'Users' },
  '/analytics': { label: 'Analytics', icon: 'BarChart3' },
  '/settings': { label: 'Settings', icon: 'Settings' },
  '/profile': { label: 'Profile', icon: 'User' },
  '/promotions': { label: 'Promotions', icon: 'Tag' },
  '/billing': { label: 'Billing', icon: 'CreditCard' },
  '/invoice': { label: 'Invoice', icon: 'FileText' },
  '/email': { label: 'Email', icon: 'Mail' },
  '/chat': { label: 'Chat', icon: 'MessageCircle' },
  '/events': { label: 'Events', icon: 'Calendar' },
  '/notifications': { label: 'Notifications', icon: 'Bell' },
  '/users': { label: 'Users', icon: 'Users' },
  '/reports': { label: 'Reports', icon: 'BarChart3' },
};

function DashboardContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const hydrateFromSession = useAuthStore((state) => state.hydrateFromSession);
  const refreshAuthData = useAuthStore((state) => state.refreshAuthData);
  // Load sidebar state from localStorage on initial render
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-open');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return false;
        }
      }
    }
    return false;
  });
  
  // Load sidebar collapsed state from localStorage on initial render
  const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return false;
        }
      }
    }
    return false;
  });
  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(max-width: 1023px)').matches;
    }
    return false;
  });
  
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { t } = useLanguage();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const meta = PAGE_META[pathname] || { 
      label: pathname.split('/').filter(Boolean).join(' / ') || 'Page', 
      icon: 'Home' 
    };
    const ACTIVITY_KEY = 'kk_recent_activity';
    const existing = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
    const filtered = existing.filter((a: {path: string}) => a.path !== pathname);
    const updated = [{
      path: pathname, 
      label: meta.label, 
      icon: meta.icon,
      timestamp: new Date().toISOString(),
      type: 'navigation'
    }, ...filtered].slice(0, 8);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
  }, [pathname]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    hydrateFromSession();
    void refreshAuthData();
    setAuthReady(true);
  }, [router, hydrateFromSession, refreshAuthData]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileView(event.matches);
    };

    setIsMobileView(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-open', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // Save sidebar collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
      </div>
    );
  }

  const effectiveSidebarCollapsed = isSidebarCollapsed && !isMobileView;

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--background)' }}>
      <div className="flex flex-1 overflow-y-hidden overflow-x-visible">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-transparent lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar Wrapper */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:z-auto ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${effectiveSidebarCollapsed ? 'w-16' : 'w-64'}`}
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <Sidebar 
            onCloseMobile={() => setSidebarOpen(false)} 
            isSidebarCollapsed={effectiveSidebarCollapsed}
            canCollapse={!isMobileView}
          />
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile Header */}
          <header 
            className="flex items-center justify-between p-3 sm:p-4 border-b lg:hidden"
            style={{ background: 'var(--topbar-bg)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="focus:outline-none p-2 -ml-2"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('common.appName').toLowerCase()}</span>
            </div>
          </header>
          <Topbar
            canToggleSidebarCollapse={!isMobileView}
            isSidebarCollapsed={effectiveSidebarCollapsed}
            onToggleSidebarCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6" style={{ background: 'var(--main-bg)' }}>
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Footer spanning full width */}
      <footer 
        className="py-3 sm:py-4 text-center text-xs sm:text-sm border-t"
        style={{
          color: 'var(--text-secondary)',
          borderColor: 'var(--border)',
          background: 'var(--footer-bg)'
        }}
      >
        &copy; {currentYear ? currentYear : new Date().getFullYear()} {t('common.appName').toLowerCase()} | {t('common.allRightsReserved')}
      </footer>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { language } = useLanguage();
  
  // Force complete re-mount when language changes to ensure translations update properly
  return (
    <DashboardContent key={language}>
      {children}
    </DashboardContent>
  );
}
