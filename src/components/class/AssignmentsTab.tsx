import React, { useState, useEffect } from 'react';
import {
  Assignment,
  Submission,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  createAssignment,
  toggleAssignmentStatus,
  deleteAssignment,
  subscribeAssignmentSubmissions,
  subscribeStudentSubmission,
  submitAssignment,
  gradeSubmission,
} from '../../services/academicService';
import {
  ClipboardCheck,
  Plus,
  ExternalLink,
  Calendar,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  Send,
  X,
} from 'lucide-react';

// Lecturer Grading Drawer for a selected Assignment
const LecturerSubmissionsPanel: React.FC<{
  classId: string;
  assignment: Assignment;
  onClose: () => void;
}> = ({ classId, assignment, onClose }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAssignmentSubmissions(classId, assignment.id, (list) => {
      setSubmissions(list);
      const nextG: Record<string, string> = {};
      const nextF: Record<string, string> = {};
      list.forEach((s) => {
        nextG[s.studentId] = s.isGraded ? String(s.grade) : '';
        nextF[s.studentId] = s.feedback || '';
      });
      setGrades(nextG);
      setFeedbacks(nextF);
    });
  }, [classId, assignment.id]);

  const handleGradeSave = async (sub: Submission) => {
    setSavingId(sub.studentId);
    try {
      const numGrade = Number(grades[sub.studentId] || 0);
      await gradeSubmission(
        classId,
        assignment.id,
        sub.studentId,
        Math.min(assignment.maxPoints, Math.max(0, numGrade)),
        feedbacks[sub.studentId] || ''
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span className="text-xs font-mono text-blue-700 font-semibold">
            Avaliação de Entregas · Máx: {assignment.maxPoints} pts
          </span>
          <h3 className="text-base font-bold text-slate-900">{assignment.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {submissions.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          Ainda não existem entregas submetidas pelos estudantes para este trabalho.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {submissions.map((sub) => (
            <div key={sub.studentId} className="py-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900">{sub.studentName}</div>
                  <div className="text-xs text-slate-500">
                    {sub.isGraded ? (
                      <span className="text-emerald-700 font-semibold">
                        Avaliado ({sub.grade} / {assignment.maxPoints})
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">Aguarda avaliação</span>
                    )}
                  </div>
                </div>

                {sub.submissionUrl && (
                  <a
                    href={sub.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-blue-700"
                  >
                    <span>Abrir Entrega / Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {sub.notes && (
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {sub.notes}
                </p>
              )}

              <div className="grid sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-3">
                  <input
                    type="number"
                    min="0"
                    max={assignment.maxPoints}
                    step="0.1"
                    value={grades[sub.studentId] ?? ''}
                    onChange={(e) =>
                      setGrades((prev) => ({ ...prev, [sub.studentId]: e.target.value }))
                    }
                    placeholder={`Nota (0-${assignment.maxPoints})`}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-7">
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.feedbackMax}
                    value={feedbacks[sub.studentId] ?? ''}
                    onChange={(e) =>
                      setFeedbacks((prev) => ({ ...prev, [sub.studentId]: e.target.value }))
                    }
                    placeholder="Comentário / feedback do docente..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    onClick={() => handleGradeSave(sub)}
                    disabled={savingId === sub.studentId}
                    className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {savingId === sub.studentId ? '...' : 'Lançar Nota'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Student Submission Widget inside an Assignment Card
const StudentSubmissionBox: React.FC<{
  classId: string;
  assignment: Assignment;
}> = ({ classId, assignment }) => {
  const { firebaseUser, profile } = useAuth();
  const [sub, setSub] = useState<Submission | null>(null);
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeStudentSubmission(classId, assignment.id, firebaseUser.uid, (data) => {
      setSub(data);
      if (data) {
        setUrl(data.submissionUrl || '');
        setNotes(data.notes || '');
      }
    });
  }, [classId, assignment.id, firebaseUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !url.trim()) return;
    setSubmitting(true);
    try {
      await submitAssignment(
        classId,
        assignment.id,
        assignment.lecturerId,
        firebaseUser.uid,
        profile.displayName,
        url,
        notes,
        !!sub
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sub?.isGraded) {
    return (
      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Trabalho Avaliado pelo Docente
          </span>
          <span className="font-mono font-bold text-sm text-emerald-800">
            {sub.grade} / {assignment.maxPoints}
          </span>
        </div>
        {sub.feedback && (
          <p className="text-xs text-emerald-800">Feedback: {sub.feedback}</p>
        )}
      </div>
    );
  }

  if (assignment.status === 'closed' && !sub) {
    return (
      <div className="text-xs text-red-600 font-medium">
        Prazo encerrado pelo docente para novas submissões.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800">
          {sub ? 'A sua entrega (pode atualizar antes da correção)' : 'Submeter Trabalho'}
        </span>
        {sub && <span className="text-blue-700 font-medium">Entregue</span>}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <input
          type="text"
          required
          maxLength={BLUEPRINT_LIMITS.urlMax}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link do trabalho (Drive, GitHub, PDF, Site)..."
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
        />
        <input
          type="text"
          maxLength={BLUEPRINT_LIMITS.submissionNotesMax}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações para o docente (opcional)..."
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !url.trim() || assignment.status === 'closed'}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
          <span>{submitting ? 'A enviar...' : sub ? 'Atualizar Entrega' : 'Enviar Trabalho'}</span>
        </button>
      </div>
    </form>
  );
};

interface AssignmentsTabProps {
  classId: string;
  assignments: Assignment[];
  isLecturerOwner: boolean;
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  classId,
  assignments,
  isLecturerOwner,
}) => {
  const { firebaseUser, effectiveRole } = useAuth();
  const canAuthor = isLecturerOwner && effectiveRole === 'docente';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxPoints, setMaxPoints] = useState(20);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !title.trim()) return;
    setSaving(true);
    try {
      await createAssignment(classId, firebaseUser.uid, {
        title,
        description,
        dueDate,
        maxPoints,
        referenceUrl,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setMaxPoints(20);
      setReferenceUrl('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Trabalhos, Projetos &amp; Avaliações</h2>
          <p className="text-xs text-slate-500">
            Crie enunciados, receba links de entregas e atribua classificações com feedback individual.
          </p>
        </div>

        {canAuthor && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'Fechar Formulário' : 'Novo Trabalho'}</span>
          </button>
        )}
      </div>

      {/* Create Assignment Form */}
      {canAuthor && showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 animate-fadeIn"
        >
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título do Trabalho / Avaliação *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.assignmentTitleMax}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Trabalho Prático 2 — Análise de Algoritmos"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pontuação Máxima *
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Limite de Entrega
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link do Enunciado / Site de Apoio (opcional)
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.urlMax}
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instruções e Critérios de Avaliação
            </label>
            <textarea
              rows={3}
              maxLength={BLUEPRINT_LIMITS.assignmentDescriptionMax}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que os estudantes devem entregar e os critérios de avaliação..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              {saving ? 'A publicar...' : 'Publicar Trabalho'}
            </button>
          </div>
        </form>
      )}

      {/* Grading Panel if Lecturer selected one */}
      {canAuthor && gradingAssignment && (
        <LecturerSubmissionsPanel
          classId={classId}
          assignment={gradingAssignment}
          onClose={() => setGradingAssignment(null)}
        />
      )}

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Sem trabalhos publicados</h3>
          <p className="text-xs text-slate-500">
            Quando o docente lançar atividades ou avaliações, poderá acompanhá-las aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((asg) => (
            <div
              key={asg.id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span
                      className={`font-semibold ${
                        asg.status === 'open' ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {asg.status === 'open' ? 'Entregas Abertas' : 'Encerrado'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Cotação: {asg.maxPoints} pts</span>
                    {asg.dueDate && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          Prazo: {asg.dueDate}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{asg.title}</h3>
                </div>

                {canAuthor && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setGradingAssignment(asg)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Avaliar Entregas
                    </button>
                    <button
                      onClick={() =>
                        toggleAssignmentStatus(
                          classId,
                          asg.id,
                          asg.status === 'open' ? 'closed' : 'open'
                        )
                      }
                      title={asg.status === 'open' ? 'Encerrar entregas' : 'Reabrir entregas'}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      {asg.status === 'open' ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteAssignment(classId, asg.id)}
                      title="Eliminar trabalho"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {asg.description && (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {asg.description}
                </p>
              )}

              {asg.referenceUrl && (
                <a
                  href={asg.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Enunciado / Site de Referência</span>
                </a>
              )}

              {/* Student Submission Box when viewing as student (and not lecturer editing own class) */}
              {!canAuthor && <StudentSubmissionBox classId={classId} assignment={asg} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
