import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import api from '../../services/api';
import ClientForm from './ClientForm';

export default function ClientsListPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (q = '') => {
    try {
      const res = await api.get('/clients', { params: { search: q || undefined } });
      setClients(res.data);
    } catch (err) {
      console.error('Load clients error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async (data) => {
    try {
      await api.post('/clients', data);
      setShowForm(false);
      load(search);
    } catch (err) {
      console.error('Create client error:', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[28px] font-extrabold" style={{ background: 'linear-gradient(135deg, #fff 30%, #E8792F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
          Clients
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[11px] font-bold uppercase transition-transform hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #E8792F, #c45c1a)', letterSpacing: '0.05em', boxShadow: '0 0 20px rgba(232,121,47,0.35), 0 2px 8px rgba(0,0,0,0.3)' }}
        >
          <Plus size={14} />
          Add Client
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          onFocus={(e) => e.target.style.borderColor = 'rgba(232,121,47,0.5)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
      </div>

      {loading ? (
        <div style={{ color: '#64748b' }}>Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#475569' }}>
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">No clients yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {clients.map((c) => (
            <Link
              key={c.id}
              to={`/clients/${c.id}`}
              className="glass rounded-xl p-5 transition-all hover:-translate-y-0.5"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,121,47,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'; }}
            >
              <div className="text-[13px] font-bold text-white mb-1">{c.name}</div>
              {c.company && <div className="text-xs" style={{ color: '#64748b' }}>{c.company}</div>}
              {c.email && <div className="text-xs" style={{ color: '#475569' }}>{c.email}</div>}
              <div className="mt-3 text-[10px] font-semibold uppercase" style={{ color: '#E8792F', letterSpacing: '0.04em' }}>
                {c._count?.sessions || 0} session{c._count?.sessions !== 1 ? 's' : ''}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && <ClientForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
