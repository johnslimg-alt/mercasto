import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

export default function BannersManager({ user }) {
  const [banners, setBanners] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    placement_id: '',
    title: '',
    image_url: '',
    link_url: '',
    alt_text: '',
    description: '',
    priority: 0,
    is_active: true,
    starts_at: '',
    ends_at: '',
    target_categories: [],
    target_states: [],
  });

  const MEXICO_STATES = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima',
    'Durango', 'Estado de Mexico', 'Guanajuato', 'Guerrero', 'Hidalgo',
    'Jalisco', 'Michoacan', 'Morelos', 'Nayarit', 'Nuevo Leon', 'Oaxaca',
    'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
    'Yucatan', 'Zacatecas'
  ];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.token}`,
    'Accept': 'application/json',
  };

  useEffect(() => { loadBanners(); loadPlacements(); loadStats(); loadCategories(); }, []);

  const loadBanners = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/banners`, { headers });
      const data = await res.json();
      setBanners(data.data || data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadPlacements = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/placements`, { headers });
      setPlacements(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/banners/stats`, { headers });
      setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      setCategories(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`${API_URL}/admin/banners/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}`, 'Accept': 'application/json' },
        body: formData,
      });
      const data = await res.json();
      setForm(f => ({ ...f, image_url: data.url }));
    } catch (e) { alert('Error al subir: ' + e.message); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      placement_id: parseInt(form.placement_id),
      priority: parseInt(form.priority) || 0,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      target_categories: form.target_categories.length > 0 ? form.target_categories : null,
      target_states: form.target_states.length > 0 ? form.target_states : null,
    };
    try {
      if (editingBanner) {
        await fetch(`${API_URL}/admin/banners/${editingBanner.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      } else {
        await fetch(`${API_URL}/admin/banners`, { method: 'POST', headers, body: JSON.stringify(payload) });
      }
      setShowForm(false); setEditingBanner(null); resetForm(); loadBanners(); loadStats();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setForm({
      placement_id: banner.placement_id?.toString() || '',
      title: banner.title || '', image_url: banner.image_url || '',
      link_url: banner.link_url || '', alt_text: banner.alt_text || '',
      description: banner.description || '', priority: banner.priority || 0,
      is_active: banner.is_active ?? true,
      starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : '',
      ends_at: banner.ends_at ? banner.ends_at.slice(0, 16) : '',
      target_categories: banner.target_categories || [],
      target_states: banner.target_states || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este banner?')) return;
    try {
      await fetch(`${API_URL}/admin/banners/${id}`, { method: 'DELETE', headers });
      loadBanners(); loadStats();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const toggleActive = async (banner) => {
    try {
      await fetch(`${API_URL}/admin/banners/${banner.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ is_active: !banner.is_active }),
      });
      loadBanners();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const resetForm = () => {
    setForm({ placement_id: '', title: '', image_url: '', link_url: '', alt_text: '', description: '', priority: 0, is_active: true, starts_at: '', ends_at: '', target_categories: [], target_states: [] });
  };

  const getPlacementName = (id) => placements.find(p => p.id === id)?.name || '—';

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando banners...</div>;

  return (
    <div className="p-4 md:p-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total_banners}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Total banners</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.active_banners}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Activos</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.total_impressions?.toLocaleString()}</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Impresiones</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.total_clicks?.toLocaleString()}</div>
            <div className="text-xs text-orange-600 dark:text-orange-400">Clics ({stats.avg_ctr?.toFixed(1)}% CTR)</div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Banners publicitarios ({banners.length})</h2>
        <button onClick={() => { setShowForm(true); setEditingBanner(null); resetForm(); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Nuevo banner
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">{editingBanner ? 'Editar banner' : 'Nuevo banner'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Título *</label>
                <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Posición *</label>
                <select required value={form.placement_id} onChange={e => setForm({ ...form, placement_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <option value="">Seleccionar...</option>
                  {placements.map(p => <option key={p.id} value={p.id}>{p.name} ({p.width}x{p.height})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">URL de destino</label>
                <input type="url" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Prioridad (0-100)</label>
                <input type="number" min="0" max="100" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Fecha inicio</label>
                <input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Fecha fin</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Imagen *</label>
              <div className="flex gap-3 items-start">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="flex-1 text-sm" disabled={uploading} />
                {uploading && <span className="text-sm text-blue-600">Subiendo...</span>}
              </div>
              {form.image_url && (
                <div className="mt-2">
                  <img src={form.image_url} alt="Preview" className="max-h-32 rounded-lg border" />
                  <input type="text" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="w-full mt-1 px-3 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Categorías (vacío = todas)</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                    <input type="checkbox" checked={form.target_categories.includes(cat.slug)} onChange={e => {
                      if (e.target.checked) setForm({ ...form, target_categories: [...form.target_categories, cat.slug] });
                      else setForm({ ...form, target_categories: form.target_categories.filter(c => c !== cat.slug) });
                    }} className="w-3 h-3" />
                    {cat.name?.es || cat.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Estados (vacío = todos)</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                {MEXICO_STATES.map(state => (
                  <label key={state} className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                    <input type="checkbox" checked={form.target_states.includes(state)} onChange={e => {
                      if (e.target.checked) setForm({ ...form, target_states: [...form.target_states, state] });
                      else setForm({ ...form, target_states: form.target_states.filter(s => s !== state) });
                    }} className="w-3 h-3" />
                    {state}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active_form" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="is_active_form" className="text-sm font-medium text-slate-700 dark:text-slate-300">Activo</label>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">{editingBanner ? 'Guardar' : 'Crear banner'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingBanner(null); resetForm(); }} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white px-6 py-2 rounded-lg font-medium">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="p-3 text-left">Imagen</th>
              <th className="p-3 text-left">Título</th>
              <th className="p-3 text-left hidden md:table-cell">Posición</th>
              <th className="p-3 text-center hidden lg:table-cell">Impresiones</th>
              <th className="p-3 text-center hidden lg:table-cell">Clics</th>
              <th className="p-3 text-center hidden lg:table-cell">CTR</th>
              <th className="p-3 text-center hidden md:table-cell">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {banners.map(banner => (
              <tr key={banner.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-3">{banner.image_url && <img src={banner.image_url} alt="" className="w-16 h-10 object-cover rounded" />}</td>
                <td className="p-3">
                  <div className="font-medium text-slate-800 dark:text-white">{banner.title}</div>
                  <div className="text-xs text-slate-500">{banner.link_url ? '→ ' + banner.link_url.slice(0, 40) : 'Sin enlace'}</div>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">{getPlacementName(banner.placement_id)}</span>
                </td>
                <td className="p-3 text-center hidden lg:table-cell text-slate-600 dark:text-slate-400">{banner.impressions_count?.toLocaleString() || 0}</td>
                <td className="p-3 text-center hidden lg:table-cell text-slate-600 dark:text-slate-400">{banner.clicks_count?.toLocaleString() || 0}</td>
                <td className="p-3 text-center hidden lg:table-cell"><span className="text-xs font-mono">{banner.ctr || 0}%</span></td>
                <td className="p-3 text-center hidden md:table-cell">
                  <button onClick={() => toggleActive(banner)} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${banner.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                    {banner.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                    {banner.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => handleEdit(banner)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Editar"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(banner.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {banners.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Image size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay banners todavía</p>
          </div>
        )}
      </div>
    </div>
  );
}
