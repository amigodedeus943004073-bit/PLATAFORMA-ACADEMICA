import React, { useState, useEffect } from 'react';
import {
  UniversityClass,
  ClassJoinCode,
  AccentColor,
  AcademicYear,
  ACADEMIC_YEARS,
  UserRole,
  BLUEPRINT_LIMITS,
} from '../types/academic';
import {
  createClass,
  updateClass,
  enrollStudentByCode,
  lookupClassByJoinCode,
} from '../services/academicService';
import { useAuth } from '../context/AuthContext';
import { StudentPhotoPicker } from './StudentAvatar';
import {
  X,
  Check,
  AlertCircle,
  Copy,
  Share2,
  QrCode,
  UserCheck,
  GraduationCap,
} from 'lucide-react';

const ACCENT_OPTIONS: { id: AccentColor; label: string; swatch: string }[] = [
  { id: 'indigo', label: 'Índigo', swatch: 'bg-indigo-600' },
  { id: 'emerald', label: 'Esmeralda', swatch: 'bg-emerald-600' },
  { id: 'sky', label: 'Azul', swatch: 'bg-sky-600' },
  { id: 'amber', label: 'Âmbar', swatch: 'bg-amber-600' },
  { id: 'rose', label: 'Carmim', swatch: 'bg-rose-600' },
  { id: 'slate', label: 'Ardósia', swatch: 'bg-slate-700' },
];

// ----------------------------------------------------------------------------
// 1. CREATE / EDIT CLASS MODAL
// ----------------------------------------------------------------------------
interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClass?: UniversityClass | null;
  onSuccess?: (classId: string) => void;
}

export const ClassFormModal: React.FC<ClassFormModalProps> = ({
  isOpen,
  onClose,
  editingClass,
  onSuccess,
}) => {
  const { firebaseUser, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [course, setCourse] = useState('');
  const [academicYear, setAcademicYear] = useState<AcademicYear>('1.º Ano');
  const [semester, setSemester] = useState('2026/2027 · 1.º Semestre');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState<AccentColor>('indigo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingClass) {
      setTitle(editingClass.title);
      setCode(editingClass.code);
      setCourse(editingClass.course || editingClass.department || '');
      setAcademicYear(editingClass.academicYear || '1.º Ano');
      setSemester(editingClass.semester);
      setSchedule(editingClass.schedule || '');
      setRoom(editingClass.room || '');
      setMeetingUrl(editingClass.meetingUrl || '');
      setDescription(editingClass.description || '');
      setAccentColor(editingClass.accentColor || 'indigo');
    } else {
      setTitle('');
      setCode('');
      setCourse('');
      setAcademicYear('1.º Ano');
      setSemester('2026/2027 · 1.º Semestre');
      setSchedule('');
      setRoom('');
      setMeetingUrl('');
      setDescription('');
      setAccentColor('indigo');
    }
    setError('');
  }, [editingClass, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) return;
    if (title.trim().length < 2 || code.trim().length < 2) {
      setError('Indique a unidade curricular e o código da turma (mín. 2 caracteres).');
      return;
    }
    if (course.trim().length < 2) {
      setError('Indique o curso da turma (mín. 2 caracteres).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingClass) {
        await updateClass(editingClass.id, editingClass.joinCode, profile.displayName, {
          title,
          code,
          semester,
          course,
          academicYear,
          schedule,
          room,
          meetingUrl,
          description,
          accentColor,
          isArchived: editingClass.isArchived,
        });
        onClose();
      } else {
        const newId = await createClass(firebaseUser.uid, profile.displayName, {
          title,
          code,
          semester,
          course,
          academicYear,
          schedule,
          room,
          meetingUrl,
          description,
          accentColor,
        });
        onClose();
        onSuccess?.(newId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar a turma.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingClass ? 'Editar Turma' : 'Criar Nova Turma Universitária'}
            </h2>
            <p className="text-xs text-slate-500">
              Será gerado automaticamente um código de inscrição para os seus estudantes.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unidade Curricular *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.classTitleMax}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Sistemas Operativos Avançados"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código da Turma *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.classCodeMax}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ex: INF-302"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Curso *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.courseMax}
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="ex: Licenciatura em Engenharia Informática"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ano (1.º ao 5.º Ano) *
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value as AcademicYear)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-600"
              >
                {ACADEMIC_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ano Letivo / Semestre *
            </label>
            <input
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.semesterMax}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="2026/2027 · 1.º Semestre"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horário das Aulas
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.scheduleMax}
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="ex: Terça e Quinta · 14:00 - 16:00"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sala / Laboratório
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.roomMax}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="ex: Anfiteatro B1 / Online"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Endereço da Sala Virtual (Zoom / Meet / Teams)
            </label>
            <input
              type="text"
              maxLength={BLUEPRINT_LIMITS.meetingUrlMax}
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Programa / Descrição da Disciplina
            </label>
            <textarea
              rows={3}
              maxLength={BLUEPRINT_LIMITS.classDescriptionMax}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos pedagógicos, método de avaliação e informações gerais..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cor Identificadora da Turma
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setAccentColor(opt.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    accentColor === opt.id
                      ? 'border-slate-900 bg-slate-100 text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${opt.swatch}`} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'A guardar...' : editingClass ? 'Guardar Alterações' : 'Criar Turma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 2. JOIN CLASS BY INVITE CODE MODAL (ESTUDANTES: CÓDIGO + NOME COMPLETO + N.º)
// ----------------------------------------------------------------------------
interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined?: (classId: string) => void;
  initialCode?: string;
}

export const JoinClassModal: React.FC<JoinClassModalProps> = ({
  isOpen,
  onClose,
  onJoined,
  initialCode = '',
}) => {
  const { firebaseUser, profile, syncStudentIdentity } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [classPreview, setClassPreview] = useState<ClassJoinCode | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const normalizedInit = (initialCode || '').trim().toUpperCase();
      setJoinCode(normalizedInit);
      setFullName(profile?.displayName || '');
      setStudentCode(profile?.studentCode || '');
      setPhotoUrl(profile?.photoUrl || '');
      setClassPreview(null);
      setFeedback(null);
    }
  }, [isOpen, initialCode, profile?.displayName, profile?.studentCode, profile?.photoUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const clean = joinCode.trim().toUpperCase();
    if (clean.length < 4) {
      setClassPreview(null);
      return;
    }

    let cancelled = false;
    setCheckingCode(true);
    const timer = setTimeout(async () => {
      try {
        const info = await lookupClassByJoinCode(clean);
        if (!cancelled) {
          setClassPreview(info);
        }
      } catch {
        if (!cancelled) {
          setClassPreview(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingCode(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [joinCode, isOpen]);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) return;

    const cleanName = fullName.trim();
    const cleanNumber = studentCode.trim();
    if (cleanName.length < 3) {
      setFeedback({ ok: false, msg: 'Introduza o seu nome completo (mínimo 3 caracteres).' });
      return;
    }
    if (!cleanNumber) {
      setFeedback({ ok: false, msg: 'Introduza o seu número de estudante.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await enrollStudentByCode(
        joinCode,
        firebaseUser.uid,
        cleanName,
        cleanNumber,
        photoUrl || undefined
      );
      setFeedback({ ok: res.success, msg: res.message });
      if (res.success && res.classId) {
        await syncStudentIdentity(cleanName, cleanNumber, photoUrl || undefined);
        setTimeout(() => {
          onClose();
          onJoined?.(res.classId!);
        }, 700);
      }
    } catch (err) {
      setFeedback({
        ok: false,
        msg: err instanceof Error ? err.message : 'Não foi possível concluir o registo na turma.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registo na Turma por Convite</h2>
            <p className="text-xs text-slate-500">
              Coloque o código de convite do docente, o seu nome completo e o número de estudante.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                feedback.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {feedback.ok ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.msg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código de Convite da Turma *
            </label>
            <input
              type="text"
              required
              maxLength={16}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ex: A7K9P2"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base font-mono tracking-widest uppercase outline-none focus:border-blue-600"
            />

            {joinCode.trim().length >= 4 && (
              <div className="mt-2">
                {checkingCode ? (
                  <p className="text-[11px] text-slate-400">A verificar código de convite...</p>
                ) : classPreview ? (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs">
                    <GraduationCap className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {classPreview.code} — {classPreview.title}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Docente: {classPreview.lecturerName} · {classPreview.semester}
                        {classPreview.course && ` · ${classPreview.course}`}
                        {classPreview.academicYear && ` (${classPreview.academicYear})`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700">
                    Código ainda não localizado. Confirme as letras e números com o docente.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Completo do Estudante *
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={BLUEPRINT_LIMITS.displayNameMax}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ex: Maria João Fernandes Silva"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Estudante / Mecanográfico *
            </label>
            <input
              type="text"
              required
              minLength={1}
              maxLength={BLUEPRINT_LIMITS.studentCodeMax}
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              placeholder="ex: 20260418"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600"
            />
          </div>

          <StudentPhotoPicker
            compact
            photoUrl={photoUrl}
            onChange={setPhotoUrl}
            label="Fotografia do Estudante (Opcional)"
            helperText="Opcional — pode tirar foto ou escolher da galeria para o seu registo na turma."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !joinCode.trim() || !fullName.trim() || !studentCode.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{submitting ? 'A registar...' : 'Concluir Registo na Turma'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 3. PROFILE & ROLE MODAL
// ----------------------------------------------------------------------------
interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('docente');
  const [department, setDepartment] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile && isOpen) {
      setDisplayName(profile.displayName);
      setRole(profile.role);
      setDepartment(profile.department || '');
      setStudentCode(profile.studentCode || '');
      setPhotoUrl(profile.photoUrl || '');
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile({
        displayName,
        role,
        department,
        studentCode,
        photoUrl,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Perfil Académico</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.displayNameMax}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Função na Plataforma</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('docente')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  role === 'docente'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Docente Universitário
              </button>
              <button
                type="button"
                onClick={() => setRole('estudante')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  role === 'estudante'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Estudante
              </button>
            </div>
          </div>

          {role === 'docente' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Curso / Área Académica
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.departmentMax}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="ex: Engenharia Informática"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número Mecanográfico / Estudante
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.studentCodeMax}
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="ex: 20260418"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600"
              />
            </div>
          )}

          <StudentPhotoPicker
            compact
            photoUrl={photoUrl}
            onChange={setPhotoUrl}
            label="Fotografia de Perfil (Opcional)"
            helperText="Utilizada no seu perfil e no bate-papo das turmas."
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              {saving ? 'A guardar...' : 'Guardar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 4. INVITE STUDENTS MODAL (DOCENTE)
// ----------------------------------------------------------------------------
interface InviteStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: UniversityClass | null;
  justCreated?: boolean;
}

export const InviteStudentsModal: React.FC<InviteStudentsModalProps> = ({
  isOpen,
  onClose,
  cls,
  justCreated = false,
}) => {
  const [copiedField, setCopiedField] = useState<'code' | 'link' | 'msg' | null>(null);

  if (!isOpen || !cls) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/?convite=${cls.joinCode}`;
  const inviteMessage = `Convite para a turma ${cls.code} — ${cls.title} (Docente: ${cls.lecturerName}).\nAceda a: ${inviteUrl}\nIntroduza o código de registo ${cls.joinCode} e cadastre-se com o seu nome completo e número de estudante.`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    inviteUrl
  )}&bgcolor=ffffff&color=0f172a&margin=8`;

  const copyValue = (text: string, field: 'code' | 'link' | 'msg') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Código de Registo: ${cls.code} — ${cls.title}`,
          text: inviteMessage,
          url: inviteUrl,
        });
        return;
      } catch {
        // Fallback to copy message
      }
    }
    copyValue(inviteMessage, 'msg');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 space-y-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {justCreated ? 'Turma Criada · Código de Registo Gerado' : 'Convidar Estudantes'}
            </h2>
            <p className="text-xs text-slate-500">
              {cls.code} · {cls.title}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {justCreated && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              A sua turma foi criada! Partilhe o <strong>código de registo</strong> ou o link abaixo para que os
              estudantes se comecem a cadastrar.
            </span>
          </div>
        )}

        {/* Invite Code Highlight */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Código de Registo da Turma
            </span>
            <div className="text-3xl font-mono font-extrabold tracking-[0.2em] mt-1">
              {cls.joinCode}
            </div>
          </div>
          <button
            onClick={() => copyValue(cls.joinCode, 'code')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
          >
            {copiedField === 'code' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copiedField === 'code' ? 'Código Copiado' : 'Copiar Código'}</span>
          </button>
        </div>

        {/* Direct Invite Link */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Link Direto de Convite (abre já o registo com o código preenchido)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 outline-none truncate"
            />
            <button
              onClick={() => copyValue(inviteUrl, 'link')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
            >
              {copiedField === 'link' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedField === 'link' ? 'Copiado' : 'Copiar Link'}</span>
            </button>
          </div>
        </div>

        {/* QR Code for lecture hall */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
          <div className="p-2 bg-white border border-slate-200 rounded-xl shrink-0">
            <img
              src={qrUrl}
              alt={`QR Code de convite para ${cls.title}`}
              className="w-32 h-32 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <QrCode className="w-4 h-4 text-blue-700" />
              <span>Projetar na Sala de Aula</span>
            </div>
            <p className="leading-relaxed">
              Os estudantes apontam a câmara para o código QR ou inserem o código{' '}
              <span className="font-mono font-bold text-slate-900">{cls.joinCode}</span> e registam-se com o seu{' '}
              <strong>Nome Completo</strong>, <strong>Número de Estudante</strong> e{' '}
              <strong>Foto (opcional)</strong>.
            </p>
          </div>
        </div>

        {/* Share / Copy Invite Message */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={() => copyValue(inviteMessage, 'msg')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            {copiedField === 'msg' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedField === 'msg' ? 'Convite Copiado' : 'Copiar Mensagem de Convite'}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Partilhar Convite</span>
          </button>
        </div>
      </div>
    </div>
  );
};
