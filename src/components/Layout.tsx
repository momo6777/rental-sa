import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { getCompanySettings } from '../lib/companySettings';
import { NotificationBell } from './NotificationBell';

const navItems = [
  { key: '/dashboard', label: 'لوحة التحكم', icon: 'dashboard' },
  { key: '/properties', label: 'العقارات', icon: 'apartment' },
  { key: '/units', label: 'الوحدات', icon: 'home_work' },
  { key: '/tenants', label: 'المستأجرون', icon: 'group' },
  { key: '/contracts', label: 'العقود', icon: 'description' },
  { key: '/payments', label: 'المالية', icon: 'payments' },
  { key: '/accounting', label: 'المحاسبة', icon: 'account_balance' },
  { key: '/expenses', label: 'المصروفات', icon: 'receipt_long' },
  { key: '/maintenance', label: 'الصيانة', icon: 'build' },
  { key: '/reports', label: 'التقارير', icon: 'bar_chart' },
  { key: '/settings', label: 'الإعدادات', icon: 'settings' },
];

const LayoutComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    getCompanySettings().then((s) => setLogoUrl(s.logo_url || null));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    if (window.location.pathname.includes('/tenants')) {
      navigate(`/tenants?q=${encodeURIComponent(q)}`);
    } else if (window.location.pathname.includes('/contracts')) {
      navigate(`/contracts?q=${encodeURIComponent(q)}`);
    } else if (window.location.pathname.includes('/properties')) {
      navigate(`/properties?q=${encodeURIComponent(q)}`);
    } else if (window.location.pathname.includes('/payments')) {
      navigate(`/payments?q=${encodeURIComponent(q)}`);
    } else {
      navigate(`/properties?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col h-screen w-64 border-l border-outline-variant bg-surface-container sticky right-0 top-0 z-40">
        <div className="p-container-margin">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="شعار" className="w-full h-full object-contain" /> : <span className="text-primary">ع</span>}
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary">إدارة العقارات</h1>
              <p className="text-label-sm text-on-surface-variant">نظام إدارة متكامل</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.key);
              return (
                <Link
                  key={item.key}
                  to={item.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all active:scale-95 duration-150 ${
                    isActive
                      ? 'text-primary font-bold bg-primary-container/10 border-r-4 border-primary'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-container-margin">
          <button
            onClick={() => navigate('/properties?add=true')}
            className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl font-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            إضافة عقار جديد
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-72 bg-surface-container border-l border-outline-variant flex flex-col overflow-y-auto">
            <div className="p-container-margin">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold overflow-hidden shrink-0">
                    {logoUrl ? <img src={logoUrl} alt="شعار" className="w-full h-full object-contain" /> : <span className="text-primary">ع</span>}
                  </div>
                  <div>
                    <h1 className="font-headline-md text-headline-md font-bold text-primary">إدارة العقارات</h1>
                    <p className="text-label-sm text-on-surface-variant">نظام إدارة متكامل</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.key);
                  return (
                    <Link
                      key={item.key}
                      to={item.key}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all active:scale-95 duration-150 ${
                        isActive
                          ? 'text-primary font-bold bg-primary-container/10 border-r-4 border-primary'
                          : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'
                      }`}
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <span className="font-body-md text-body-md">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="mt-auto p-container-margin">
              <button
                onClick={() => { navigate('/properties?add=true'); setMobileMenuOpen(false); }}
                className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl font-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">add</span>
                إضافة عقار جديد
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm flex justify-between items-center w-full px-container-margin py-base h-16 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex md:hidden items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:opacity-90 active:scale-95 transition-all font-label-md shadow-lg"
              aria-label="فتح القائمة"
            >
              <span className="text-lg leading-none">☰</span>
              <span className="hidden sm:inline">القائمة</span>
            </button>
            <form onSubmit={handleSearch} className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-surface-container-low border border-outline-variant rounded-full focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-sm"
                placeholder="بحث سريع..."
              />
            </form>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={() => Modal.info({
                title: 'مساعدة',
                content: (
                  <div>
                    <p>مرحباً بك في نظام إدارة العقارات</p>
                    <p style={{ marginTop: 12 }}>للحصول على المساعدة، يرجى التواصل مع فريق الدعم الفني.</p>
                  </div>
                ),
                okText: 'حسناً',
              })}
              className="p-2 rounded-full hover:bg-surface-container-highest transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <div className="h-8 w-px bg-outline-variant mx-1"></div>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogout}>
              <div className="text-left hidden md:block">
                <p className="font-label-md text-label-md text-on-surface font-bold">{user?.full_name || 'مستخدم'}</p>
                <p className="text-[10px] text-on-surface-variant">{user?.role === 'admin' ? 'مدير النظام' : 'محاسب'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold border border-outline-variant overflow-hidden">
                {(user?.full_name || 'م').charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-container-margin space-y-container-margin flex-1 pb-28">
          <Outlet />
        </div>
      </main>

      {/* Mobile floating menu button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed bottom-20 right-6 z-50 w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-2xl flex items-center justify-center text-2xl hover:opacity-90 active:scale-90 transition-all"
        aria-label="فتح القائمة"
      >
        ☰
      </button>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface-container border-t border-outline-variant flex items-center justify-around px-2 py-1 safe-area-bottom">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname.startsWith(item.key);
          return (
            <Link
              key={item.key}
              to={item.key}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">more_horiz</span>
          <span className="text-[10px] leading-tight">المزيد</span>
        </button>
      </nav>
    </div>
  );
};

export default LayoutComponent;
