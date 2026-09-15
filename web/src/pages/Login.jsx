import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Truck, LogIn, AlertCircle, Sparkles } from 'lucide-react';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'driver') {
        navigate('/driver/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // Submits without hardcoded role; backend identifies role from user record
      const res = await login(identifier, password);
      setLoading(false);

      if (res.success) {
        const targetPath =
          location.state?.from?.pathname ||
          (res.role === 'admin' ? '/admin/dashboard' : '/driver/dashboard');

        navigate(targetPath, { replace: true });
      } else {
        setErrorMsg(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('An unexpected error occurred. Please try again.');
    }
  };

  const fillCredentials = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        backgroundImage: 'radial-gradient(ellipse at top, #1e293b 0%, #090d16 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#eff6ff',
              borderRadius: '999px',
              color: '#1d4ed8',
              fontSize: '0.8rem',
              fontWeight: '700',
              marginBottom: '16px'
            }}
          >
            <Sparkles size={14} />
            <span>Unified Platform Portal</span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Portal Sign In
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '6px' }}>
            Enter your credentials to access your Admin or Driver workspace.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>
              Email or Mobile Number
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. admin@platform.com or +919876543210"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              autoFocus
              style={{ padding: '11px 14px', borderRadius: '8px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: 0 }}>
                Password
              </label>
            </div>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your secure password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ padding: '11px 14px', borderRadius: '8px' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px',
              fontSize: '0.95rem',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)'
            }}
            disabled={loading}
          >
            <LogIn size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Demo Fast-Fill Helper Cards */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #f1f5f9'
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94a3b8',
              textAlign: 'center',
              marginBottom: '12px'
            }}
          >
            Quick Demo Login Fill
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => fillCredentials('admin@platform.com', 'admin123')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.775rem', fontWeight: '700', color: '#0f172a' }}>Super Admin</div>
                <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Full Control</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('driver@platform.com', 'driver123')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Truck size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.775rem', fontWeight: '700', color: '#0f172a' }}>Driver</div>
                <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Trips & Profile</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
