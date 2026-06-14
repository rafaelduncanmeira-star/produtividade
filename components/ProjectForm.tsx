import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Project, HABIT_COLORS, PROJECT_EMOJIS } from '../types';

interface ProjectFormProps {
  initialProject?: Project | null;
  onSave: (data: Omit<Project, 'id'>, id?: string) => void;
  onClose: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ initialProject, onSave, onClose }) => {
  const [name, setName] = useState(initialProject?.name ?? '');
  const [emoji, setEmoji] = useState(initialProject?.emoji ?? PROJECT_EMOJIS[0]);
  const [color, setColor] = useState(initialProject?.color ?? HABIT_COLORS[0]);
  const [dueDate, setDueDate] = useState(initialProject?.dueDate ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      emoji,
      color,
      dueDate: dueDate || undefined,
      createdAt: initialProject?.createdAt ?? new Date().toISOString(),
    }, initialProject?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
          <h3 className="font-bold text-slate-800">{initialProject ? 'Editar Meta' : 'Nova Meta'}</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome da Meta</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-200 outline-none"
              placeholder="Ex: Prova de Anatomia..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ícone</label>
            <div className="grid grid-cols-6 gap-2">
              {PROJECT_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                    emoji === e ? 'bg-teal-50 ring-2 ring-teal-300 scale-105' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cor</label>
            <div className="flex gap-3">
              {HABIT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-teal-200' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Prazo (opcional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-200 outline-none text-slate-600"
            />
          </div>

          <button type="submit" className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 flex items-center justify-center gap-2 mt-2 active:scale-[0.98] transition-transform">
            <Save size={18} /> Salvar Meta
          </button>
        </form>
      </div>
    </div>
  );
};
