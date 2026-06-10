import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Layout } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

export default function PlacementsManager({ user }) {
  const { t } = useTranslation();
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState(null);

  const [form, setForm] = useState({
    slug: '', name: '', description: '', position: 'header',
    width: 728, height: 90, max_banners: 3, is_active: true, sort_order: 0,
  });

  const POSITIONS = [
    { value: 'header', label: 'Шапка сайта' },
    { value: 'sidebar', label: 'Боковая панель' },
    { value: 'footer', label: 'Подвал сайта' },
    { value: 'feed', label: 'Лента объявлений' },
    { value: 'between', label: 'Между блоками' },
    { value: 'search', label: 'Результаты поиска' },
    { value: 'category', label: 'Страница категории' },
    { value: 'listing', label: 'Страница объявления' },
  ];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.token}`,
    'Accept': 'application/json',
  };

  useEffect(() => { loadPlacements(); }, []);

  const loadPlacements = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/placements`, { headers });
      setPlacements(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, width: parseInt(form.width), height: parseInt(form.height), max_banners: parseInt(form.max_banners), sort_order: parseInt(form.sort_order) || 0 };
    try {
      if (editingPlacement) {
        await fetch(`${API_URL}/admin/placements/${editingPlacement.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      } else {
        await fetch(`${API_URL}/admin/placements`, { method: 'POST', headers, body: JSON.stringify(payload) });
      }
      setShowForm(false); setEditingPlacement(null); resetForm(); loadPlacements();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleEdit = (p) => {
    setEditingPlacement(p);
    setForm({ slug: p.slug, name: p.name, description: p.description || '', position: p.position, width: p.width, height: p.height, max_banners: p.max_banners, is_active: p.is_active, sort_order: p.sort_order || 0 });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta posición?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/placements/${id}`, { method: 'DELETE', headers });
      if (!res.ok) { const data = await res.json(); alert(data.error || 'Error'); return; }
      loadPlacements();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const toggleActive = async (p) => {
    try {
      await fetch(`${API_URL}/admin/placements/${p.id}`, { method: 'PUT', headers, body: JSON.stringify({ is_active: !p.is_active }) });
      loadPlacements();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const resetForm = () => { setForm({ slug: '', name: '', description: '', position: 'header', width: 728, height: 90, max_banners: 3, is_active: true, sort_order: 0 }); };

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').trim();

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Posiciones publicitarias ({placements.length})</h2>
        <button onClick={() => { setShowForm(true); setEditingPlacement(null); resetForm(); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Nueva posición
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">{editingPlacement ? 'Editar posición' : 'Nueva posición'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Slug (código) *</label>
                <input type="text" required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} disabled={!!editingPlacement} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:opacity-50" pattern="[a-z0-9_]+" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Nombre *</label>
                <input type="text" required value={form.name} onChange={e => { const name = e.target.value; setForm({ ...form, name, slug: editingPlacement ? form.slug : generateSlug(name) }); }} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Ubicación *</label>
                <select required value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Ancho (px)</label>
                  <input type="number" min="100" max="2000" value={form.width} onChange={e => setForm({ ...form, width: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Alto (px)</label>
                  <input type="number" min="30" max="1000" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Máx. banners</label>
                <input type="number" min="1" max="10" value={form.max_banners} onChange={e => setForm({ ...form, max_banners: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Orden</label>
                <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{t('ads.description')}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" rows="2" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="placement_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="placement_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">Activa</label>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">{editingPlacement ? 'Guardar' : 'Crear'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingPlacement(null); resetForm(); }} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-white px-6 py-2 rounded-lg font-medium">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {placements.map(p => (
          <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-4 ${p.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{p.name}</h3>
                <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">{p.slug}</code>
              </div>
              <button onClick={() => toggleActive(p)} className={`p-1.5 rounded ${p.is_active ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                {p.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            {p.description && <p className="text-xs text-slate-500 mb-3">{p.description}</p>}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Ubicación:</span><span className="font-medium text-slate-700 dark:text-slate-300">{POSITIONS.find(pos => pos.value === p.position)?.label || p.position}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tamaño:</span><span className="font-mono text-slate-700 dark:text-slate-300">{p.width}x{p.height}px</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Banners:</span><span className="text-slate-700 dark:text-slate-300">{p.banners_count || 0} / {p.max_banners}</span></div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => handleEdit(p)} className="flex-1 flex items-center justify-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg"><Edit2 size={12} /> Editar</button>
              <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center gap-1 text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      {placements.length === 0 && (
        <div className="text-center py-12 text-slate-500"><Layout size={48} className="mx-auto mb-3 opacity-30" /><p>No hay posiciones</p></div>
      )}
    </div>
  );
}
