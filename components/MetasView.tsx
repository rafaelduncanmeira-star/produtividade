import React, { useState, useRef, useEffect } from 'react';
import { Plus, Target, Pencil, Trash2, Calendar, ChevronDown, StickyNote } from 'lucide-react';
import { Project, Task } from '../types';
import { todayISO, formatShortDate } from '../utils';
import { TaskItem } from './TaskItem';
import { TaskForm } from './TaskForm';
import { ProjectForm } from './ProjectForm';

// Anotações livres da meta: textarea que cresce sozinha e salva ao sair do campo.
const MetaNotes: React.FC<{ project: Project; onSave: (p: Project) => void }> = ({ project, onSave }) => {
  const [value, setValue] = useState(project.notes ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  // Re-seed só quando troca de meta (não atropela a digitação).
  useEffect(() => { setValue(project.notes ?? ''); }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [value]);
  const commit = () => {
    const next = value.trim();
    if (next === (project.notes ?? '')) return;
    onSave({ ...project, notes: next || undefined });
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1.5">
        <StickyNote size={13} className="text-teal-600" /> Anotações
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        rows={2}
        placeholder="Contexto, links, decisões, ideias…"
        className="w-full text-sm text-slate-700 placeholder:text-slate-300 outline-none resize-none bg-transparent leading-relaxed min-h-[2.5rem]"
      />
    </div>
  );
};

interface MetasViewProps {
  projects: Project[];
  tasks: Task[];
  onAddProject: (data: Omit<Project, 'id'>) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (data: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
  onStartFocusTask: (id: string) => void;
}

export const MetasView: React.FC<MetasViewProps> = ({
  projects, tasks, onAddProject, onUpdateProject, onDeleteProject,
  onAddTask, onUpdateTask, onDeleteTask, onToggleTask, onStartFocusTask,
}) => {
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<{ projectId: string; task: Task | null } | null>(null);

  const today = todayISO();

  const openNewProject = () => { setEditingProject(null); setIsProjectFormOpen(true); };
  const saveProject = (data: Omit<Project, 'id'>, id?: string) => {
    if (id) onUpdateProject({ ...data, id }); else onAddProject(data);
    setIsProjectFormOpen(false);
    setEditingProject(null);
  };
  const saveTask = (data: Omit<Task, 'id'>, id?: string) => {
    if (id) onUpdateTask({ ...data, id }); else onAddTask(data);
    setTaskForm(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-display">Metas</h2>
          <p className="text-slate-500 text-sm">Agrupe tarefas rumo a um objetivo.</p>
        </div>
        <button
          onClick={openNewProject}
          className="hidden md:flex items-center gap-2 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md shadow-teal-200 active:scale-95"
        >
          <Plus size={18} /><span>Nova Meta</span>
        </button>
      </div>

      {projects.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 px-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
            <Target size={28} className="text-teal-600" />
          </div>
          <p className="text-sm">Nenhuma meta ainda. Crie uma ou peça à IA: <span className="text-slate-500">"organiza minha prova de anatomia"</span>.</p>
          <button
            onClick={openNewProject}
            className="mt-4 inline-flex items-center gap-2 bg-teal-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-900 active:scale-95 transition"
          >
            <Plus size={16} /> Nova meta
          </button>
        </div>
      )}

      <div className="space-y-3">
        {projects.map(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id);
          const done = pTasks.filter(t => t.completed).length;
          const total = pTasks.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const overdue = !!p.dueDate && p.dueDate < today && done < total;
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${p.color}22` }}>{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">{done}/{total} concluídas · {pct}%</span>
                      {p.dueDate && (
                        <span className={`flex items-center gap-0.5 text-[11px] font-medium ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                          <Calendar size={11} /> {overdue ? `Atrasada ${formatShortDate(p.dueDate)}` : formatShortDate(p.dueDate)}
                        </span>
                      )}
                      {p.notes && (
                        <span className="flex items-center gap-0.5 text-[11px] font-medium text-teal-700"><StickyNote size={11} /> nota</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button onClick={() => { setEditingProject(p); setIsProjectFormOpen(true); }} aria-label="Editar meta" className="p-2 text-slate-300 hover:text-teal-700 hover:bg-teal-50 rounded-lg"><Pencil size={15} /></button>
                    <button onClick={() => onDeleteProject(p.id)} aria-label="Excluir meta" className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bar-sheen transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <button onClick={() => setExpanded(isOpen ? null : p.id)} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-teal-700">
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {isOpen ? 'Ocultar tarefas' : `Ver tarefas (${total})`}
                  </button>
                  <button onClick={() => setTaskForm({ projectId: p.id, task: null })} className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800">
                    <Plus size={14} /> Tarefa
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 bg-slate-50/50">
                  <MetaNotes project={p} onSave={onUpdateProject} />
                  <div className="space-y-1.5">
                    {pTasks.length === 0 && <p className="text-xs text-slate-400 py-1">Nenhuma tarefa nesta meta ainda.</p>}
                    {pTasks.map(t => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        compact
                        onToggle={onToggleTask}
                        onDelete={onDeleteTask}
                        onEdit={(task) => setTaskForm({ projectId: p.id, task })}
                        onFocus={onStartFocusTask}
                        onUpdate={onUpdateTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isProjectFormOpen && (
        <ProjectForm
          initialProject={editingProject}
          onSave={saveProject}
          onClose={() => { setIsProjectFormOpen(false); setEditingProject(null); }}
        />
      )}
      {taskForm && (
        <TaskForm
          initialTask={taskForm.task}
          defaultProjectId={taskForm.projectId}
          projects={projects}
          onSave={saveTask}
          onClose={() => setTaskForm(null)}
        />
      )}
    </div>
  );
};
