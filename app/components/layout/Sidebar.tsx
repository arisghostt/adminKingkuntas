'use client';

import { useState, useEffect, useMemo } from 'react';
import { Home, ShoppingCart, Users, Package, BarChart3, Settings, MessageCircle, Mail, CalendarDays, ChevronDown, ChevronRight, Grid, Plus, Eye, FileText, CreditCard, UserCog, Shield, Boxes, AlertTriangle, Tag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../LanguageProvider';
import Logo from '../../../public/kingkunta-logo.svg';
import { usePermissions } from '@/app/hooks/usePermissions';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  href?: string;
  children?: MenuItem[];
  isExpanded?: boolean;
  permissionModule?: string;
  permissionAction?: 'is_view' | 'is_add' | 'is_edit' | 'is_delete';
}

interface SidebarProps {
  onCloseMobile?: () => void;
  isSidebarCollapsed?: boolean;
  canCollapse?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: Home, labelKey: 'nav.dashboard', href: '/dashboard', permissionModule: '/dashboard' },
  {
    icon: Package,
    labelKey: 'nav.products',
    permissionModule: '/products',
    children: [
      { icon: Grid, labelKey: 'nav.productList', href: '/products', permissionModule: '/products', permissionAction: 'is_view' },
      { icon: Grid, labelKey: 'nav.productGrid', href: '/products/grid', permissionModule: '/products', permissionAction: 'is_view' },
      {
        icon: Plus,
        labelKey: 'nav.addProduct',
        href: '/products/add',
        permissionModule: '/products',
        permissionAction: 'is_add',
      },
    ],
  },
  {
    icon: ShoppingCart,
    labelKey: 'nav.orders',
    permissionModule: '/orders',
    children: [
      { icon: Grid, labelKey: 'nav.orderList', href: '/orders', permissionModule: '/orders', permissionAction: 'is_view' },
    ],
  },
  {
    icon: Boxes,
    labelKey: 'nav.inventory',
    children: [
      { icon: BarChart3, labelKey: 'nav.inventoryOverview', href: '/inventory' },
      { icon: Package, labelKey: 'nav.stockMovements', href: '/inventory/movements' },
      { icon: AlertTriangle, labelKey: 'nav.lowStockAlerts', href: '/inventory/alerts' },
    ],
  },
  {
    icon: Users,
    labelKey: 'nav.customers',
    permissionModule: '/customers',
    children: [
      { icon: Eye, labelKey: 'nav.customerDetails', href: '/customers/details', permissionModule: '/customers', permissionAction: 'is_view' },
    ],
  },
  {
    icon: UserCog,
    labelKey: 'nav.users',
    permissionModule: '/settings/users',
    children: [
      { icon: Users, labelKey: 'nav.userList', href: '/settings/users', permissionModule: '/settings/users', permissionAction: 'is_view' },
      { icon: Shield, labelKey: 'nav.roleManagement', href: '/settings/users?tab=roles', permissionModule: '/settings/users', permissionAction: 'is_add' },
    ],
  },
  { icon: Tag, labelKey: 'nav.promotionsLabel', href: '/promotions', permissionModule: '/promotions', permissionAction: 'is_add' },
  { icon: CreditCard, labelKey: 'nav.checkoutLabel', href: '/checkout', permissionModule: '/billing', permissionAction: 'is_view' },
  { icon: FileText, labelKey: 'nav.billingLabel', href: '/billing', permissionModule: '/billing', permissionAction: 'is_view' },
  { icon: FileText, labelKey: 'nav.invoiceLabel', href: '/invoice', permissionModule: '/billing', permissionAction: 'is_view' },
  { icon: BarChart3, labelKey: 'nav.analyticsLabel', href: '/analytics', permissionModule: '/analytics', permissionAction: 'is_view' },
  { icon: MessageCircle, labelKey: 'nav.chatLabel', href: '/chat' },
  { icon: Mail, labelKey: 'nav.emailLabel', href: '/email' },
  { icon: CalendarDays, labelKey: 'nav.eventsLabel', href: '/events' },
  { icon: Settings, labelKey: 'nav.settingsLabel', href: '/settings' },
];

export default function Sidebar({
  onCloseMobile,
  isSidebarCollapsed = false,
  canCollapse = true,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { hasPermission } = usePermissions();
  const showCollapsedMode = isSidebarCollapsed && canCollapse;

  const hasItemAccess = (item: MenuItem): boolean => {
    if (!item.permissionModule) return true;
    return hasPermission(item.permissionModule, item.permissionAction ?? 'is_view');
  };

  const visibleMenuItems = useMemo(() => {
    const filterItems = (items: MenuItem[]): MenuItem[] => {
      const filtered: MenuItem[] = [];

      items.forEach((item) => {
        const filteredChildren = item.children ? filterItems(item.children) : undefined;
        const hasDirectAccess = hasItemAccess(item);

        if (filteredChildren && filteredChildren.length > 0) {
          if (hasDirectAccess || !item.href) {
            filtered.push({ ...item, children: filteredChildren });
          }
          return;
        }

        if (!hasDirectAccess) return;
        filtered.push({ ...item, children: undefined });
      });

      return filtered;
    };

    return filterItems(menuItems);
  }, [hasPermission]);

  // Load expanded items from localStorage on initial render
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-expanded-items');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Save expanded items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sidebar-expanded-items', JSON.stringify(expandedItems));
  }, [expandedItems]);

  // Auto-expand parent menus when a child page is active
  useEffect(() => {
    // In collapsed (icon-only) mode, keep flyout closed until user explicitly clicks parent.
    if (showCollapsedMode) {
      return;
    }

    const findParentAndExpand = (items: MenuItem[], currentPath: string): string | null => {
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          // Check if any child is the active page
          const activeChild = item.children.find(child => child.href === currentPath);
          if (activeChild) {
            return item.labelKey;
          }
          // Recursively check deeper levels
          const found = findParentAndExpand(item.children, currentPath);
          if (found) {
            return item.labelKey;
          }
        }
      }
      return null;
    };

    const parentToExpand = findParentAndExpand(visibleMenuItems, pathname);
    if (parentToExpand && !expandedItems.includes(parentToExpand)) {
      setExpandedItems(prev => [...prev, parentToExpand]);
    }
  }, [pathname, showCollapsedMode, visibleMenuItems, expandedItems]);

  // Reset open flyouts when entering collapsed mode to avoid sticky submenu panels.
  useEffect(() => {
    if (showCollapsedMode) {
      setExpandedItems([]);
    }
  }, [showCollapsedMode]);

  const toggleExpand = (labelKey: string) => {
    setExpandedItems(prev =>
      prev.includes(labelKey)
        ? prev.filter(item => item !== labelKey)
        : [labelKey] // Accordion behavior: only one dropdown open at a time
    );
  };

  const toPathOnly = (href: string): string => href.split('?')[0];
  const isActive = (href: string) => pathname === toPathOnly(href);
  const isParentActive = (children: MenuItem[]) =>
    children.some(child => child.href && pathname === toPathOnly(child.href));
  const handleItemClick = () => {
    if (showCollapsedMode) {
      setExpandedItems([]);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.labelKey);
    const parentIsActive = hasChildren && isParentActive(item.children!);
    const Icon = item.icon;
    const label = t(item.labelKey);

    // When sidebar is collapsed, show only icon with tooltip
    if (showCollapsedMode) {
      if (hasChildren) {
        return (
          <div key={item.labelKey} className="relative group">
            <button
              type="button"
              onClick={() => toggleExpand(item.labelKey)}
              className={`w-full flex items-center justify-center px-4 py-2.5 sm:py-3 transition-colors ${parentIsActive ? 'text-blue-400 border-r-2 border-blue-400' : ''
                }`}
              style={{
                color: parentIsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: parentIsActive ? 'var(--hover-bg)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!parentIsActive) {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!parentIsActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            {/* Tooltip */}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {label}
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 inline-block ml-1" />
              ) : (
                <ChevronRight className="w-3 h-3 inline-block ml-1" />
              )}
            </div>

            {/* Expanded children dropdown */}
            {isExpanded && (
              <div className="absolute left-full top-0 ml-0 w-48 shadow-lg rounded-r-lg z-50" style={{ background: 'var(--sidebar-bg)' }}>
                <div className="py-2">
                  {item.children!.map((child) => renderMenuItem(child, 0))}
                </div>
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={item.labelKey} className="relative group">
          <Link
            href={item.href || '#'}
            className={`flex items-center justify-center px-4 py-2.5 sm:py-3 transition-colors ${isActive(item.href!) ? 'text-blue-400 border-r-2 border-blue-400' : ''
              }`}
            style={{
              color: isActive(item.href!) ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive(item.href!) ? 'var(--hover-bg)' : 'transparent',
            }}
            onClick={handleItemClick}
            onMouseEnter={(e) => {
              if (!isActive(item.href!)) {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.href!)) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
          </Link>

          {/* Tooltip */}
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            {label}
          </div>
        </div>
      );
    }

    // Normal expanded mode
    if (hasChildren) {
      return (
        <div key={item.labelKey}>
          <button
            type="button"
            onClick={() => toggleExpand(item.labelKey)}
            className={`w-full flex items-center px-4 sm:px-6 py-2.5 sm:py-3 transition-colors ${parentIsActive ? 'text-blue-400 border-r-2 border-blue-400' : ''
              }`}
            style={{
              color: parentIsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: parentIsActive ? 'var(--hover-bg)' : 'transparent',
              paddingLeft: `${0.75 + level * 1.5}rem`
            }}
            onMouseEnter={(e) => {
              if (!parentIsActive) {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!parentIsActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Icon className="w-4 sm:w-5 h-4 sm:h-5 mr-2 sm:mr-3" />
            <span className="truncate">{label}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 ml-auto flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
            )}
          </button>
          {isExpanded && (
            <div className="bg-opacity-50" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.labelKey}
        href={item.href || '#'}
        className={`flex items-center px-4 sm:px-6 py-2.5 sm:py-3 transition-colors ${isActive(item.href!) ? 'text-blue-400 border-r-2 border-blue-400' : ''
          }`}
        style={{
          color: isActive(item.href!) ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: isActive(item.href!) ? 'var(--hover-bg)' : 'transparent',
          paddingLeft: `${0.75 + level * 1.5}rem`
        }}
        onClick={handleItemClick}
        onMouseEnter={(e) => {
          if (!isActive(item.href!)) {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive(item.href!)) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <Icon className="w-4 sm:w-5 h-4 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <div className={`${showCollapsedMode ? 'w-16' : 'w-64'} shadow-lg h-full flex flex-col transition-all duration-300`} style={{ background: 'var(--sidebar-bg)' }}>
      <div className={`${showCollapsedMode ? 'p-2' : 'p-6'}`}>
        <div className={`flex items-center gap-3 ${showCollapsedMode ? 'justify-center' : ''}`}>
          <img src={Logo.src} className={`${showCollapsedMode ? 'w-8 h-8' : 'w-8 h-8'}`} alt="Logo" />
          {!showCollapsedMode && (
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('common.appName')}</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('common.adminDashboard')}</p>
            </div>
          )}
        </div>

      </div>

      <nav className={`mt-2 flex-1 ${showCollapsedMode ? 'overflow-visible' : 'overflow-y-auto'}`}>
        {visibleMenuItems.map((item) => renderMenuItem(item))}
      </nav>
    </div>
  );
}
