import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, Loader2, X, Plus, Image, GripVertical, Pencil } from 'lucide-react';
import { filterConfig } from '../../constants/filterConfig';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${STORAGE_URL}/${path}`;
};

const getImageUrls = (pathStr) => {
  if (!pathStr) return [];
  try {
    const arr = JSON.parse(pathStr);
    if (Array.isArray(arr)) return arr.map(getImageUrl);
  } catch (e) {}
  return [getImageUrl(pathStr)];
};

export default function EditAdScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ad, setAd] = useState(null);
  const [categories, setCategories] = useState([]);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', price: '', location: '',
    category: '', condition: 'usado', attributes: {}
  });

  // Images: { source: 'existing'|'new', url: string, path: string|null, file: File|null, preview: string }
  const [images, setImages] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);

  const token = localStorage.getItem('auth_token');

  // Load ad and categories
  useEffect(() => {
    if (!token) { navigate('/'); return; }

    const fetchAll = async () => {
      try {
        const [adRes, catRes] = await Promise.all([
          fetch(`${API_URL}/ads/${id}/edit`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
          }),
          fetch(`${API_URL}/categories`, { headers: { Accept: 'application/json' } })
        ]);

        if (adRes.status === 403) { navigate('/'); return; }
        if (!adRes.ok) throw new Error('No se pudo cargar el anuncio');

        const adData = await adRes.json();
        const catData = catRes.ok ? await catRes.json() : [];

        setAd(adData);
        setCategories(Array.isArray(catData) ? catData : (catData.data || []));

        let parsedAttrs = {};
        try { parsedAttrs = typeof adData.attributes === 'string' ? JSON.parse(adData.attributes) : (adData.attributes || {}); } catch (e) {}

        setForm({
          title: adData.title || '',
          description: adData.description || '',
          price: adData.price ?? '',
          location: adData.location || '',
          category: adData.category || '',
          condition: adData.condition || 'usado',
          attributes: parsedAttrs
        });

        // Load existing images
        setImages(getImageUrls(adData.image_url).map(url => ({
          source: 'existing',
          url,
          path: url.replace(`${STORAGE_URL}/`, ''),
          file: null,
          preview: url
        })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id, token, navigate]);

  const catConfig = form.category ? (filterConfig[form.category] || []) : [];

  const handleAttrChange = (fieldId, value) => {
    setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [fieldId]: value } }));
  };

  const handleAttrCheckbox = (fieldId, option) => {
    setForm(prev => {
      const current = Array.isArray(prev.attributes[fieldId]) ? prev.attributes[fieldId] : [];
      const next = current.includes(option) ? current.filter(v => v !== option) : [...current, option];
      return { ...prev, attributes: { ...prev.attributes, [fieldId]: next } };
    });
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      alert('Máximo 10 imágenes por anuncio'); return;
    }
    const newImgs = files.map(file => ({
      source: 'new', url: null, path: null, file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImgs]);
    e.target.value = '';
  };

  const handleRemoveImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Drag-to-reorder
  const handleDragStart = (idx) => setDragIndex(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIndex(idx);
  };
  const handleDragEnd = () => setDragIndex(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('location', form.location);
      formData.append('category', form.category);
      formData.append('condition', form.condition);

      // Attributes
      Object.entries(form.attributes).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach(val => formData.append(`attributes[${k}][]`, val));
        } else if (v !== '' && v !== null && v !== undefined) {
          formData.append(`attributes[${k}]`, v);
        }
      });

      // Existing images to keep (in order)
      const existing = images.filter(img => img.source === 'existing');
      existing.forEach(img => formData.append('existing_images[]', img.path));

      // New image files (in order, appended after existing)
      const newImages = images.filter(img => img.source === 'new');
      newImages.forEach(img => formData.append('images[]', img.file));

      // Laravel POST for multipart
      const res = await fetch(`${API_URL}/ads/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al guardar los cambios');
      }

      navigate(`/?ad=${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  if (error && !ad) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-slate-600">{error}</p>
        <button onClick={() => navigate(-1)} className="btn bg-slate-100 hover:bg-slate-200 text-slate-700">Volver</button>
      </div>
    );
  }

  const isRejected = ad?.status === 'rejected';
  const rejectionNote = isRejected && ad?.rejection_reason;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors">
        <ChevronLeft size={20} /> Volver al anuncio
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-lime-100 flex items-center justify-center">
          <Pencil className="w-5 h-5 text-[#65A30D]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar anuncio</h1>
          <p className="text-slate-500 text-sm">Los cambios importantes se enviarán a revisión</p>
        </div>
      </div>

      {/* Rejection warning */}
      {isRejected && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Este anuncio fue rechazado</p>
            {rejectionNote && <p className="text-red-600 text-sm mt-1">{rejectionNote}</p>}
            <p className="text-red-600 text-sm mt-1">Edítalo y se enviará a revisión nuevamente.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            required
            maxLength={255}
            placeholder="Ej: iPhone 15 Pro en perfecto estado"
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Precio (MXN) *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input
              type="number"
              value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              required
              min={0}
              step="0.01"
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Categoría *</label>
          <select
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value, attributes: {} }))}
            required
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white"
          >
            <option value="">Seleccionar categoría</option>
            {categories.map(cat => (
              <option key={cat.slug} value={cat.slug}>{cat.name || cat.slug}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ciudad / Ubicación</label>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            placeholder="Ej: Ciudad de México, CDMX"
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white"
          />
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Condición</label>
          <div className="flex gap-3">
            {['nuevo', 'usado'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(p => ({ ...p, condition: c }))}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold border-2 transition-all ${form.condition === c ? 'border-lime-400 bg-lime-50 text-[#65A30D]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                {c === 'nuevo' ? 'Nuevo' : 'Usado'}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción *</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            required
            rows={6}
            placeholder="Describe tu artículo en detalle: estado, características, motivo de venta..."
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white resize-none"
          />
        </div>

        {/* Dynamic category attributes */}
        {catConfig.length > 0 && (
          <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm">Características de la categoría</h3>
            {catConfig.map(field => (
              <div key={field.id}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={form.attributes[field.id] || ''}
                    onChange={e => handleAttrChange(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    <option value="">Seleccionar...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map(opt => {
                      const selected = Array.isArray(form.attributes[field.id]) && form.attributes[field.id].includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAttrCheckbox(field.id, opt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${selected ? 'bg-lime-100 border-lime-400 text-[#65A30D]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={form.attributes[field.id] || ''}
                    onChange={e => handleAttrChange(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Images */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Imágenes ({images.length}/10) — arrastra para reordenar
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-grab transition-all ${dragIndex === idx ? 'opacity-50 border-lime-400 scale-95' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-lime-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
                    Principal
                  </span>
                )}
                <div className="absolute top-1 right-1 flex gap-1">
                  <div className="bg-white/80 rounded-lg p-1 cursor-grab">
                    <GripVertical size={12} className="text-slate-500" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="bg-red-500 rounded-lg p-1 hover:bg-red-600 transition-colors"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              </div>
            ))}

            {images.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-lime-400 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-lime-500 transition-all bg-slate-50 hover:bg-lime-50"
              >
                <Plus size={20} />
                <span className="text-xs font-medium">Agregar</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpg,image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleAddImages}
          />
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Image size={12} /> La primera imagen será la foto principal del anuncio
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
