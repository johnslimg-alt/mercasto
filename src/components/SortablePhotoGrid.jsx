import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUI } from '../contexts/UIContext'

const COVER_LABELS = {
  es: 'Portada',
  en: 'Cover',
  pt: 'Capa',
  fr: 'Couverture',
  zh: '封面',
  ko: '대표 사진',
  de: 'Titelbild',
  it: 'Copertina',
  ar: 'الغلاف',
  ru: 'Обложка',
  ja: 'カバー',
}

function coverLabel(lang) {
  const code = String(lang || 'es').toLowerCase().split('-')[0]
  return COVER_LABELS[code] || COVER_LABELS.es
}

function SortablePhoto({ photo, index, onDelete, lang }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
      {index === 0 && (
        <span className="absolute bottom-1 left-1 z-10 bg-teal-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
          {coverLabel(lang)}
        </span>
      )}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 cursor-grab active:cursor-grabbing text-white bg-black/40 rounded p-1 touch-none select-none"
        style={{ minWidth: 22, minHeight: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="2" r="1.2"/><circle cx="9" cy="2" r="1.2"/>
          <circle cx="3" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/>
          <circle cx="3" cy="10" r="1.2"/><circle cx="9" cy="10" r="1.2"/>
        </svg>
      </div>
      <button
        type="button"
        onClick={() => onDelete(photo.id)}
        className="absolute top-1 right-1 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none transition-colors"
        aria-label="×"
      >
        ×
      </button>
      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
    </div>
  )
}

export default function SortablePhotoGrid({ photos, onReorder, onDelete, lang }) {
  const { lang: uiLang } = useUI()
  const activeLang = lang || uiLang
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex(p => p.id === active.id)
      const newIndex = photos.findIndex(p => p.id === over.id)
      onReorder(arrayMove(photos, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <SortablePhoto key={photo.id} photo={photo} index={index} onDelete={onDelete} lang={activeLang} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
