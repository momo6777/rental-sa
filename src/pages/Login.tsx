import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Left decorative panel - visible on desktop */}
      <div className="hidden lg:flex w-[480px] bg-primary relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-20 -right-20 w-80 h-80 rounded-full bg-white"></div>
          <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white"></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
            <span className="material-symbols-outlined text-white text-4xl">apartment</span>
          </div>
          <h1 className="text-white text-3xl font-bold mb-3">نظام إدارة العقارات</h1>
          <p className="text-white/70 text-lg leading-relaxed">
            حل متكامل لإدارة المحفظة العقارية، العقود،<br />المدفوعات، والصيانة
          </p>
          <div className="mt-12 space-y-4">
            {[
              { icon: 'home_work', text: 'إدارة العقارات والوحدات' },
              { icon: 'description', text: 'العقود الإلكترونية' },
              { icon: 'payments', text: 'التحصيل والمدفوعات' },
              { icon: 'build', text: 'طلبات الصيانة' },
            ].map((item) => (
              <div key={item.icon} className="flex items-center gap-3 text-white/80">
                <span className="material-symbols-outlined text-white/50">{item.icon}</span>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 z-10">
          <p className="text-white/30 text-xs">السعودية - الرياض</p>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-[fadeInUp_0.6s_ease-out]">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-white text-2xl">apartment</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary font-bold">نظام إدارة العقارات</h1>
            <p className="text-on-surface-variant mt-1">تسجيل الدخول إلى النظام</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-8">
            <div className="hidden lg:block text-center mb-8">
              <h2 className="font-headline-lg text-headline-lg text-primary font-bold">تسجيل الدخول</h2>
              <p className="text-on-surface-variant mt-1">أدخل بياناتك للوصول إلى النظام</p>
            </div>

            {error && (
              <div className="bg-error-container text-error px-4 py-3 rounded-xl text-body-sm mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-label-md text-on-surface-variant mb-1.5 font-bold">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-lg">mail</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    dir="ltr"
                    className="w-full pr-10 pl-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-right lg:text-left"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-label-md text-on-surface-variant mb-1.5 font-bold">
                  كلمة المرور
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full pr-10 pl-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-right lg:text-left"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl font-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    تسجيل الدخول
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-label-sm text-on-surface-variant mt-6">
            ليس لديك حساب؟ يرجى التواصل مع المسؤول
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
