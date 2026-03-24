import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1e, #0f172a, #0a0f1e)' }}>
      {/* Atmospheric halos */}
      <div className="fixed top-0 right-0 w-80 h-80 rounded-full opacity-50 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,121,47,0.12), transparent 70%)', filter: 'blur(40px)' }} />
      <div className="fixed bottom-0 left-0 w-64 h-64 rounded-full opacity-50 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)', filter: 'blur(40px)' }} />

      <div className="glass w-full max-w-md rounded-2xl p-8 relative" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <h1 className="text-2xl font-extrabold text-center mb-2" style={{ background: 'linear-gradient(135deg, #fff 30%, #E8792F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Done With You
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: '#64748b' }}>Sign in to your account</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg text-white text-xs font-bold uppercase transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 4px 16px rgba(232,121,47,0.3)' }}
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold hover:underline" style={{ color: '#E8792F' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
