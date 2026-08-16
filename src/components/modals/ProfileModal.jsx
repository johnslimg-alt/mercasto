import { useRef } from 'react';
import { Camera, Loader2, User, XCircle } from 'lucide-react';
import useModalFocusTrap from '../../hooks/useModalFocusTrap';

export default function ProfileModal({ handleProfileSubmit, profileForm, profileLoading, setProfileForm, setShowProfileModal, showProfileModal, t }) {
    const avatarInputRef = useRef(null);
    const closeModal = () => setShowProfileModal(false);
    const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({ isOpen: showProfileModal, onClose: closeModal });
    if (!showProfileModal) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onKeyDown={handleKeyDown} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-md rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
          <button ref={initialFocusRef} type="button" aria-label={t.close_btn || t.close || 'Close'} onClick={closeModal} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle size={24}/></button>
          <h2 id="profile-modal-title" className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900 dark:text-white">{t.edit_profile_title || 'Editar Perfil'}</h2>

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-950 mb-3 overflow-hidden relative group border border-slate-200 dark:border-slate-700">
                {profileForm.avatarPreview ? (
                  <img src={profileForm.avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={40} /></div>
                )}
                <button type="button" aria-label={t.change_photo || 'Cambiar Foto'} onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) setProfileForm({ ...profileForm, avatarFile: file, avatarPreview: URL.createObjectURL(file) });
                }}/>
              </div>
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{t.change_photo || 'Cambiar Foto'}</span>
            </div>

            <div>
              <label htmlFor="profile-modal-name" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.name_label || 'Nombre'}</label>
              <input id="profile-modal-name" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
            </div>

            <button type="submit" disabled={profileLoading} className="btn-lg w-full bg-[#0F172A] dark:bg-[#84CC16] text-white dark:text-slate-950 hover:bg-black dark:hover:bg-[#65A30D] flex justify-center mt-2">
              {profileLoading ? <Loader2 className="animate-spin" size={20}/> : (t.save_changes || 'Guardar Cambios')}
            </button>
          </form>
        </div>
      </div>
    );
  }
