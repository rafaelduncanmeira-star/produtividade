import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Send, Sparkles, LoaderCircle, CheckSquare, CalendarClock, Repeat, Check, CircleCheck, ArrowRightLeft, Pencil, Target, type LucideIcon } from 'lucide-react';
import { askAssistant, AIResult, AIAction } from '../services/aiAssistant';
import { Task, TimeBlock, Habit, Project, TaskStatus } from '../types';
import { TaskForm } from './TaskForm';
import { TimeBlockForm } from './TimeBlockForm';
import { HabitForm } from './HabitForm';

interface AIAssistantProps {
  tasks: Task[];
  blocks: TimeBlock[];
  projects: Project[];
  onCreateTask: (data: Omit<Task, 'id'>) => void;
  onCreateBlock: (data: Omit<TimeBlock, 'id'>) => void;
  onCreateHabit: (data: Omit<Habit, 'id'>) => void;
  onCreateProject: (data: Omit<Project, 'id'>, tasks: Omit<Task, 'id'>[]) => void;
  onSetTaskStatus: (id: string, status: TaskStatus) => void;
  onClose: () => void;
}

const ACTION_ICONS: Record<AIAction['type'], LucideIcon> = {
  create_task: CheckSquare,
  create_block: CalendarClock,
  create_habit: Repeat,
  create_project: Target,
  complete_task: CircleCheck,
  set_task_status: ArrowRightLeft,
};

const SUGGESTIONS = [
  'Planeje minha manhã de amanhã com 2 horas de estudo',
  'Tenho prova de anatomia sexta, organiza isso pra mim',
  'Quero criar o hábito de revisar o conteúdo toda noite',
];

const getSpeechRecognition = (): any => {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ tasks, blocks, projects, onCreateTask, onCreateBlock, onCreateHabit, onCreateProject, onSetTaskStatus, onClose }) => {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechSupported = getSpeechRecognition() !== null;

  useEffect(() => () => { recognitionRef.current?.abort?.(); }, []);

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    let finalSoFar = input ? input + ' ' : '';
    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalSoFar += piece + ' ';
        else interim += piece;
      }
      setInput((finalSoFar + interim).trimStart());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try {
      rec.start();
      setListening(true);
      setError(null);
    } catch {
      setError('Não foi possível acessar o microfone.');
    }
  };

  const handleSend = async () => {
    const command = input.trim();
    if (!command || busy) return;
    recognitionRef.current?.stop?.();
    setListening(false);
    setBusy(true);
    setError(null);
    setResult(null);
    setApplied(false);
    try {
      setResult(await askAssistant(command, { tasks, blocks }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    result.actions.forEach((action: AIAction) => {
      if (action.type === 'create_task') onCreateTask(action.data);
      else if (action.type === 'create_block') onCreateBlock(action.data);
      else if (action.type === 'create_habit') onCreateHabit(action.data);
      else if (action.type === 'create_project') onCreateProject(action.data, action.tasks);
      else if (action.type === 'complete_task') onSetTaskStatus(action.taskId, 'done');
      else if (action.type === 'set_task_status') onSetTaskStatus(action.taskId, action.status);
    });
    setApplied(true);
    setInput('');
  };

  const labelFor = (type: AIAction['type'], data: any): string => {
    if (type === 'create_task') return `Tarefa: ${data.title}${data.dueDate ? ` (até ${data.dueDate.slice(8, 10)}/${data.dueDate.slice(5, 7)})` : ''}`;
    if (type === 'create_block') return `Bloco: ${data.title} — ${data.date.slice(8, 10)}/${data.date.slice(5, 7)} ${data.start}–${data.end}`;
    if (type === 'create_habit') return `Hábito: ${data.emoji} ${data.name}`;
    return '';
  };

  // Substitui os dados de uma ação proposta após edição no formulário
  const updateAction = (index: number, data: any) => {
    setResult(prev => {
      if (!prev) return prev;
      const actions = prev.actions.map((a, i) =>
        i === index && (a.type === 'create_task' || a.type === 'create_block' || a.type === 'create_habit')
          ? ({ ...a, data, label: labelFor(a.type, data) } as AIAction)
          : a
      );
      return { ...prev, actions };
    });
    setEditingIndex(null);
  };

  const removeAction = (index: number) =>
    setResult(prev => (prev ? { ...prev, actions: prev.actions.filter((_, i) => i !== index) } : prev));

  const editing = editingIndex !== null && result ? result.actions[editingIndex] : null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
          <h3 className="font-bold flex items-center gap-2"><Sparkles size={18} /> Assistente IA</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-teal-200" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* Entrada por voz/texto */}
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2">
              {speechSupported ? (
                <>
                  <button
                    onClick={toggleMic}
                    disabled={busy}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      listening
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 animate-pulse'
                        : 'bg-teal-600 text-white shadow-lg shadow-teal-200 hover:bg-teal-700'
                    }`}
                  >
                    {listening ? <MicOff size={32} /> : <Mic size={32} />}
                  </button>
                  <p className="text-xs text-slate-400">
                    {listening ? 'Ouvindo... toque para parar' : 'Toque e dite seu comando'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center">
                  Ditado por voz não disponível neste navegador (use o Chrome). Digite abaixo:
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                rows={2}
                placeholder='Ex: "Amanhã às 14h tenho reunião e preciso estudar dermato urgente"'
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 outline-none text-sm resize-none"
              />
              <button
                onClick={handleSend}
                disabled={busy || !input.trim()}
                aria-label="Enviar comando"
                className="self-end p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-40 active:scale-95 transition-all"
              >
                {busy ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>

            {!result && !busy && !error && (
              <div className="space-y-1.5">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="w-full text-left text-xs text-slate-500 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 px-3 py-2 rounded-lg transition-colors"
                  >
                    💡 {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-600">{error}</div>
          )}

          {/* Resposta e ações propostas */}
          {result && (
            <div className="space-y-3">
              <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-sm text-teal-800">
                {result.reply}
              </div>

              {result.actions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {applied ? 'Aplicado!' : 'O que vou criar:'}
                  </p>
                  {result.actions.map((action, i) => {
                    const Icon = ACTION_ICONS[action.type];
                    const editable = action.type === 'create_task' || action.type === 'create_block' || action.type === 'create_habit';
                    return (
                      <div key={i} className="flex items-center gap-2.5 bg-slate-50 rounded-lg px-3 py-2.5">
                        <Icon size={15} className={applied ? 'text-emerald-500' : 'text-teal-500'} />
                        <span className="text-sm text-slate-600 flex-1">{action.label}</span>
                        {applied ? (
                          <Check size={15} className="text-emerald-500" strokeWidth={3} />
                        ) : (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {editable && (
                              <button onClick={() => setEditingIndex(i)} aria-label="Editar" className="p-1 text-slate-400 hover:text-teal-600 rounded-md hover:bg-teal-50 transition-colors">
                                <Pencil size={14} />
                              </button>
                            )}
                            <button onClick={() => removeAction(i)} aria-label="Remover" className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!applied ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setResult(null); }}
                        className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-sm font-medium hover:border-slate-300"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={handleApply}
                        className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 flex items-center justify-center gap-1.5"
                      >
                        <Check size={16} /> Aplicar tudo
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setResult(null); setApplied(false); }}
                      className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold"
                    >
                      ✓ Criado com sucesso! Novo comando?
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {editing && editing.type === 'create_task' && (
      <TaskForm
        initialTask={{ ...editing.data, id: 'ai-edit' }}
        projects={projects}
        onSave={(data) => updateAction(editingIndex!, data)}
        onClose={() => setEditingIndex(null)}
      />
    )}
    {editing && editing.type === 'create_block' && (
      <TimeBlockForm
        initialBlock={{ ...editing.data, id: 'ai-edit' }}
        defaultDate={editing.data.date}
        tasks={tasks}
        onSave={(data) => updateAction(editingIndex!, data)}
        onClose={() => setEditingIndex(null)}
      />
    )}
    {editing && editing.type === 'create_habit' && (
      <HabitForm
        initialHabit={{ ...editing.data, id: 'ai-edit' }}
        onSave={(data) => updateAction(editingIndex!, data)}
        onClose={() => setEditingIndex(null)}
      />
    )}
    </>
  );
};
