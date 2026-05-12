import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { key: '/dashboard', label: 'لوحة التحكم', icon: 'dashboard' },
  { key: '/properties', label: 'العقارات', icon: 'apartment' },
  { key: '/units', label: 'الوحدات', icon: 'home_work' },
  { key: '/tenants', label: 'المستأجرون', icon: 'group' },
  { key: '/contracts', label: 'العقود', icon: 'description' },
  { key: '/payments', label: 'المالية', icon: 'payments' },
  { key: '/maintenance', label: 'الصيانة', icon: 'build' },
  { key: '/reports', label: 'التقارير', icon: 'bar_chart' },
  { key: '/settings', label: 'الإعدادات', icon: 'settings' },
];

const LayoutComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 border-l border-outline-variant bg-surface-container sticky right-0 top-0 z-40">
        <div className="p-container-margin">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-lg font-bold">
              ع
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm flex justify-between items-center w-full px-container-margin py-base h-16 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
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
            <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors relative text-on-surface-variant">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors text-on-surface-variant">
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
        <div className="p-container-margin space-y-container-margin flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default LayoutComponent;
