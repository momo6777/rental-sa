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
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated gradient background */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'linear-gradient(45deg, transparent, rgba(255,215,0,0.05), transparent)',
          animation: 'loginRotate 15s linear infinite',
          zIndex: 0,
        }}
      />
      <style>{`
        @keyframes loginRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes loginFadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: '#1a1a1a',
          borderRadius: '20px',
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid #ffd700',
          animation: 'loginFadeInUp 0.8s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2
            style={{
              color: '#ffd700',
              fontSize: '28px',
              fontWeight: 700,
              margin: '0 0 10px 0',
              letterSpacing: '1px',
              position: 'relative',
              display: 'inline-block',
            }}
          >
            تسجيل الدخول
            <span
              style={{
                content: '',
                position: 'absolute',
                bottom: '-5px',
                right: 0,
                width: '50px',
                height: '3px',
                background: '#ffd700',
                borderRadius: '2px',
              }}
            />
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', margin: 0 }}>
            أدخل بياناتك للوصول إلى النظام
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(255,77,77,0.15)',
              border: '1px solid rgba(255,77,77,0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#ff4d4f',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                marginBottom: '6px',
              }}
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #333',
                background: '#242424',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffd700';
                e.target.style.boxShadow = '0 0 0 2px rgba(255,215,0,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#333';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                marginBottom: '6px',
              }}
            >
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #333',
                background: '#242424',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffd700';
                e.target.style.boxShadow = '0 0 0 2px rgba(255,215,0,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#333';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              background: loading
                ? '#666'
                : 'linear-gradient(45deg, #ffd700, #ffc107)',
              color: '#000',
              fontWeight: 600,
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(255,215,0,0.4)',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background =
                  'linear-gradient(45deg, #ffc107, #ffd700)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 20px rgba(255,215,0,0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background =
                  'linear-gradient(45deg, #ffd700, #ffc107)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 15px rgba(255,215,0,0.4)';
              }
            }}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '30px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px',
          }}
        >
          <p style={{ margin: 0 }}>
            ليس لديك حساب؟ يرجى التواصل مع المسؤول
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
