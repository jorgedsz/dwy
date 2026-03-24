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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p>No clients yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Link
              key={c.id}
              to={`/clients/${c.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="font-semibold text-gray-900 mb-1">{c.name}</div>
              {c.company && <div className="text-sm text-gray-500 mb-1">{c.company}</div>}
              {c.email && <div className="text-sm text-gray-400">{c.email}</div>}
              <div className="mt-3 text-xs text-gray-400">
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
