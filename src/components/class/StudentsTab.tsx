import React, { useRef, useState } from 'react';
import { Enrollment } from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  updateEnrollmentAttendance,
  updateStudentEnrollmentPhoto,
  compressStudentPhotoDataUrl,
  removeEnrollment,
} from '../../services/academicService';
import { StudentAvatar } from '../StudentAvatar';
import {
  Users,
  Copy,
  Check,
  Plus,
  Minus,
  Trash2,
  Download,
  UserPlus,
  Link2,
  Camera,
  MessageSquare,
} from 'lucide-react';

interface StudentsTabProps {
  classId: string;
  classCode: string;
  classTitle?: string;
  joinCode: string;
  enrollments: Enrollment[];
  isLecturerOwner: boolean;
  onOpenInvite?: () => void;
  onMessageStudent?: (studentId: string) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  classId,
  classCode,
  joinCode,
  enrollments,
  isLecturerOwner,
  onOpenInvite,
  onMessageStudent,
}) => {
  const { effectiveRole } = useAuth();
  const canManage = isLecturerOwner && effectiveRole === 'docente';
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const targetStudentRef = useRef<string | null>(null);

  const inviteUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/?convite=${joinCode}` : '';

  const handleCopy = (val: string, kind: 'code' | 'link') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    }
  };

  const handleTriggerPhoto = (studentId: string) => {
    targetStudentRef.current = studentId;
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const studentId = targetStudentRef.current;
    e.target.value = '';
    if (!file || !studentId) return;

    setPhotoError('');
    setUploadingPhotoFor(studentId);
    try {
      const compressed = await compressStudentPhotoDataUrl(file);
      await updateStudentEnrollmentPhoto(classId, studentId, compressed);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Erro ao atualizar fotografia.');
    } finally {
      setUploadingPhotoFor(null);
      targetStudentRef.current = null;
    }
  };

  const handleExportCsv = () => {
    const header = 'Nome,Numero,Presencas,Estado\n';
    const rows = enrollments
      .map(
        (e) =>
          `"${e.studentName.replace(/"/g, '""')}","${e.studentCode || ''}",${e.attendanceCount},${e.status}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pauta_${classCode}_${joinCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Invite Students Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Convidar Estudantes para a Turma</h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Envie o código ou link de convite. Os estudantes inserem o código e registam-se com o seu{' '}
            <strong>nome completo</strong> e <strong>número de estudante</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-4 py-2 bg-slate-900 text-white rounded-lg font-mono text-base font-bold tracking-widest">
            {joinCode}
          </div>
          <button
            onClick={() => handleCopy(joinCode, 'code')}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            {copied === 'code' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied === 'code' ? 'Código Copiado' : 'Copiar Código'}</span>
          </button>
          <button
            onClick={() => handleCopy(inviteUrl, 'link')}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            {copied === 'link' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            <span>{copied === 'link' ? 'Link Copiado' : 'Copiar Link'}</span>
          </button>
          {onOpenInvite && (
            <button
              onClick={onOpenInvite}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Convite &amp; QR Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">
          Estudantes Inscritos ({enrollments.length})
        </h3>
        {canManage && enrollments.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Pauta CSV</span>
          </button>
        )}
      </div>

      {photoError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {photoError}
        </div>
      )}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelected}
        className="hidden"
      />

      {enrollments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">Nenhum estudante inscrito ainda</h4>
          <p className="text-xs text-slate-500">
            Envie o código <span className="font-mono font-bold text-slate-800">{joinCode}</span> aos alunos para que façam a inscrição.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Estudante</th>
                  <th className="py-2.5 px-4">N.º Estudante</th>
                  <th className="py-2.5 px-4 text-right">Presenças</th>
                  {canManage && <th className="py-2.5 px-4 text-right">Controlo</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enr) => (
                  <tr key={enr.studentId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar
                          name={enr.studentName}
                          photoUrl={enr.studentPhotoUrl}
                          size="sm"
                        />
                        <span className="font-semibold text-slate-900">{enr.studentName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {enr.studentCode || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {enr.attendanceCount}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              updateEnrollmentAttendance(
                                classId,
                                enr.studentId,
                                Math.max(0, enr.attendanceCount - 1)
                              )
                            }
                            title="Remover 1 presença"
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              updateEnrollmentAttendance(
                                classId,
                                enr.studentId,
                                enr.attendanceCount + 1
                              )
                            }
                            title="Registar +1 presença"
                            className="p-1 rounded border border-slate-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleTriggerPhoto(enr.studentId)}
                            disabled={uploadingPhotoFor === enr.studentId}
                            title={
                              enr.studentPhotoUrl
                                ? 'Alterar foto do estudante'
                                : 'Adicionar foto ao estudante'
                            }
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer disabled:opacity-40"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                          {onMessageStudent && (
                            <button
                              onClick={() => onMessageStudent(enr.studentId)}
                              title="Conversar em privado com este estudante"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold cursor-pointer ml-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span className="hidden sm:inline">Conversar</span>
                            </button>
                          )}
                          {confirmRemoveId === enr.studentId ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                onClick={async () => {
                                  setRemovingId(enr.studentId);
                                  setPhotoError('');
                                  try {
                                    await removeEnrollment(classId, enr.studentId);
                                    setConfirmRemoveId(null);
                                  } catch (err) {
                                    setPhotoError(
                                      err instanceof Error
                                        ? err.message
                                        : 'Não foi possível remover o estudante.'
                                    );
                                  } finally {
                                    setRemovingId(null);
                                  }
                                }}
                                disabled={removingId === enr.studentId}
                                className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                {removingId === enr.studentId ? 'A remover...' : 'Confirmar'}
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveId(enr.studentId)}
                              title="Remover estudante da turma"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 ml-1 text-[11px] font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Remover</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
