import React, { useState, useEffect, useMemo } from 'react';
import {
  Assessment,
  AssessmentCategory,
  Enrollment,
  StudentGrade,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import { StudentAvatar } from '../StudentAvatar';
import {
  createAssessment,
  deleteAssessment,
  subscribeAssessmentGrades,
  subscribeStudentAssessmentGrade,
  saveStudentGrade,
  saveBatchStudentGrades,
  buildGradesPdfFile,
  uploadClassAttachment,
  createResultPublication,
  triggerBlobDownload,
} from '../../services/academicService';
import {
  Award,
  Plus,
  Trash2,
  Save,
  FileSpreadsheet,
  FileText,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
} from 'lucide-react';

const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  prova: 'Prova Escrita',
  frequencia: 'Frequência',
  teste: 'Teste / Quiz',
  trabalho: 'Trabalho / Projeto',
  oral: 'Avaliação Oral',
  exame: 'Exame Final',
};

interface GradesTabProps {
  classId: string;
  classCode: string;
  classTitle: string;
  lecturerName: string;
  assessments: Assessment[];
  enrollments: Enrollment[];
  isLecturerOwner: boolean;
  onPublishedToResults?: () => void;
}

const StudentGradesView: React.FC<{
  classId: string;
  assessments: Assessment[];
}> = ({ classId, assessments }) => {
  const { firebaseUser } = useAuth();
  const [gradesMap, setGradesMap] = useState<Record<string, StudentGrade | null>>({});

  useEffect(() => {
    if (!firebaseUser || assessments.length === 0) {
      setGradesMap({});
      return;
    }

    const unsubs = assessments.map((asg) =>
      subscribeStudentAssessmentGrade(classId, asg.id, firebaseUser.uid, (grade) => {
        setGradesMap((prev) => ({ ...prev, [asg.id]: grade }));
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [classId, assessments, firebaseUser]);

  const summary = useMemo(() => {
    let gradedCount = 0;
    let totalWeightedPct = 0;
    assessments.forEach((a) => {
      const g = gradesMap[a.id];
      if (g) {
        gradedCount += 1;
        totalWeightedPct += (g.score / Math.max(1, a.maxPoints)) * 100;
      }
    });
    return {
      gradedCount,
      avgPct: gradedCount > 0 ? Math.round(totalWeightedPct / gradedCount) : null,
    };
  }, [assessments, gradesMap]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            As Minhas Notas · Provas &amp; Avaliações
          </h2>
          <p className="text-xs text-slate-500">
            Consulte as notas atribuídas pelo docente em cada prova, frequência ou avaliação realizada.
          </p>
        </div>

        {summary.avgPct !== null && (
          <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto">
            <span>Média Global:</span>
            <span className="font-mono text-sm font-bold text-emerald-300">{summary.avgPct}%</span>
          </div>
        )}
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Award className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Ainda sem provas ou avaliações registadas</h3>
          <p className="text-xs text-slate-500">
            Quando o docente criar avaliações e lançar notas individuais, os seus resultados aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {assessments.map((asg) => {
            const grade = gradesMap[asg.id];
            const pct = grade ? Math.round((grade.score / Math.max(1, asg.maxPoints)) * 100) : null;
            const passed = pct !== null && pct >= 50;

            return (
              <div
                key={asg.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-blue-700">
                      {CATEGORY_LABELS[asg.category] || 'Avaliação'}
                    </span>
                    {asg.date && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {asg.date}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Escala: 0 – {asg.maxPoints}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{asg.title}</h4>
                  {grade?.remarks && (
                    <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      Observação do docente: {grade.remarks}
                    </p>
                  )}
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  {grade ? (
                    <div
                      className={`px-3.5 py-2 rounded-xl border text-right ${
                        passed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-mono text-base font-extrabold tabular-nums">
                        {grade.score} <span className="text-xs font-normal opacity-75">/ {asg.maxPoints}</span>
                      </div>
                      <div className="text-[11px] font-semibold">
                        {pct}% · {passed ? 'Positiva' : 'Atenção'}
                      </div>
                    </div>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg">
                      Nota pendente
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const GradesTab: React.FC<GradesTabProps> = ({
  classId,
  classCode,
  classTitle,
  lecturerName,
  assessments,
  enrollments,
  isLecturerOwner,
  onPublishedToResults,
}) => {
  const { firebaseUser, profile, effectiveRole } = useAuth();
  const canAuthor = isLecturerOwner && effectiveRole === 'docente';

  // New assessment creation form
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AssessmentCategory>('prova');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [maxPoints, setMaxPoints] = useState(20);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected assessment & grading table state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [remarkInputs, setRemarkInputs] = useState<Record<string, string>>({});
  const [searchStudent, setSearchStudent] = useState('');
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [publishingPdf, setPublishingPdf] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (assessments.length > 0 && (!selectedId || !assessments.some((a) => a.id === selectedId))) {
      setSelectedId(assessments[0].id);
    } else if (assessments.length === 0) {
      setSelectedId(null);
    }
  }, [assessments, selectedId]);

  const selectedAssessment = useMemo(
    () => assessments.find((a) => a.id === selectedId) || null,
    [assessments, selectedId]
  );

  useEffect(() => {
    if (!canAuthor || !firebaseUser || !selectedId) {
      setGrades([]);
      return;
    }
    return subscribeAssessmentGrades(classId, selectedId, firebaseUser.uid, (list) => {
      setGrades(list);
      const nextScores: Record<string, string> = {};
      const nextRemarks: Record<string, string> = {};
      list.forEach((g) => {
        nextScores[g.studentId] = String(g.score);
        nextRemarks[g.studentId] = g.remarks || '';
      });
      setScoreInputs(nextScores);
      setRemarkInputs(nextRemarks);
    });
  }, [canAuthor, classId, selectedId, firebaseUser]);

  const sortedStudents = useMemo(() => {
    const active = enrollments.filter((e) => e.status === 'active');
    active.sort((a, b) => a.studentName.localeCompare(b.studentName, 'pt'));
    if (!searchStudent.trim()) return active;
    const q = searchStudent.toLowerCase();
    return active.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.studentCode || '').toLowerCase().includes(q)
    );
  }, [enrollments, searchStudent]);

  const gradesByStudentId = useMemo(() => {
    const map: Record<string, StudentGrade> = {};
    grades.forEach((g) => {
      map[g.studentId] = g;
    });
    return map;
  }, [grades]);

  const stats = useMemo(() => {
    if (!selectedAssessment) return { graded: 0, avg: '—', highest: '—', passRate: '—' };
    const vals = enrollments
      .map((s) => gradesByStudentId[s.studentId]?.score)
      .filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return { graded: 0, avg: '—', highest: '—', passRate: '—' };
    const sum = vals.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...vals);
    const passCount = vals.filter((v) => v >= selectedAssessment.maxPoints * 0.5).length;
    return {
      graded: vals.length,
      avg: (sum / vals.length).toFixed(2),
      highest: maxVal.toFixed(1),
      passRate: `${Math.round((passCount / vals.length) * 100)}%`,
    };
  }, [enrollments, gradesByStudentId, selectedAssessment]);

  if (!canAuthor) {
    return <StudentGradesView classId={classId} assessments={assessments} />;
  }

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || title.trim().length < 2) return;
    setCreating(true);
    setStatusMsg(null);
    try {
      const newId = await createAssessment(classId, firebaseUser.uid, {
        title,
        category,
        date,
        maxPoints,
        notes,
      });
      setTitle('');
      setNotes('');
      setShowNewForm(false);
      setSelectedId(newId);
      setStatusMsg({ type: 'ok', text: 'Prova/avaliação criada. Pode agora atribuir as notas aos estudantes.' });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao criar avaliação.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveOne = async (student: Enrollment) => {
    if (!firebaseUser || !selectedAssessment) return;
    const raw = (scoreInputs[student.studentId] ?? '').replace(',', '.').trim();
    if (raw === '') {
      setStatusMsg({ type: 'err', text: `Introduza a nota de ${student.studentName} antes de guardar.` });
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > selectedAssessment.maxPoints) {
      setStatusMsg({
        type: 'err',
        text: `Nota inválida para ${student.studentName}. Utilize valores entre 0 e ${selectedAssessment.maxPoints}.`,
      });
      return;
    }

    setSavingStudentId(student.studentId);
    setStatusMsg(null);
    try {
      await saveStudentGrade(classId, selectedAssessment.id, firebaseUser.uid, {
        studentId: student.studentId,
        studentName: student.studentName,
        studentCode: student.studentCode,
        score: parsed,
        maxPoints: selectedAssessment.maxPoints,
        remarks: remarkInputs[student.studentId] || '',
      });
      setStatusMsg({ type: 'ok', text: `Nota de ${student.studentName} guardada.` });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao guardar nota.',
      });
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleSaveAll = async () => {
    if (!firebaseUser || !selectedAssessment) return;
    const itemsToSave: Array<{
      studentId: string;
      studentName: string;
      studentCode?: string;
      score: number;
      maxPoints: number;
      remarks?: string;
    }> = [];

    for (const student of enrollments) {
      const raw = (scoreInputs[student.studentId] ?? '').replace(',', '.').trim();
      if (raw === '') continue;
      const parsed = Number(raw);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > selectedAssessment.maxPoints) {
        setStatusMsg({
          type: 'err',
          text: `Valor inválido para ${student.studentName} (use 0 a ${selectedAssessment.maxPoints}).`,
        });
        return;
      }
      itemsToSave.push({
        studentId: student.studentId,
        studentName: student.studentName,
        studentCode: student.studentCode,
        score: parsed,
        maxPoints: selectedAssessment.maxPoints,
        remarks: remarkInputs[student.studentId] || '',
      });
    }

    if (itemsToSave.length === 0) {
      setStatusMsg({ type: 'err', text: 'Preencha pelo menos uma nota antes de guardar.' });
      return;
    }

    setSavingAll(true);
    setStatusMsg(null);
    try {
      await saveBatchStudentGrades(classId, selectedAssessment.id, firebaseUser.uid, itemsToSave);
      setStatusMsg({
        type: 'ok',
        text: `${itemsToSave.length} nota(s) guardada(s) com sucesso em "${selectedAssessment.title}".`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao guardar lote de notas.',
      });
    } finally {
      setSavingAll(false);
    }
  };

  const buildRowsForExport = () => {
    const active = enrollments
      .filter((e) => e.status === 'active')
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'pt'));

    return active.map((student) => {
      const raw = (scoreInputs[student.studentId] ?? '').replace(',', '.').trim();
      const parsed = raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : null;
      const savedScore = gradesByStudentId[student.studentId]?.score ?? null;
      const finalScore = parsed !== null ? parsed : savedScore;
      const remarks =
        remarkInputs[student.studentId] ?? gradesByStudentId[student.studentId]?.remarks ?? '';
      return {
        studentName: student.studentName,
        studentCode: student.studentCode,
        score: finalScore,
        remarks,
      };
    });
  };

  const handleExportCsv = () => {
    if (!selectedAssessment) return;
    const rows = buildRowsForExport();
    const header = `Estudante,Numero,Nota (/${selectedAssessment.maxPoints}),Observacoes\n`;
    const body = rows
      .map(
        (r) =>
          `"${r.studentName.replace(/"/g, '""')}","${r.studentCode || ''}",${
            r.score !== null ? r.score : ''
          },"${(r.remarks || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const slug = selectedAssessment.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    triggerBlobDownload(`notas-${classCode}-${slug}.csv`, header + body, 'text/csv;charset=utf-8;');
  };

  const handleDownloadPdf = () => {
    if (!selectedAssessment) return;
    const file = buildGradesPdfFile({
      classCode,
      classTitle,
      lecturerName,
      assessmentTitle: selectedAssessment.title,
      assessmentDate: selectedAssessment.date,
      maxPoints: selectedAssessment.maxPoints,
      rows: buildRowsForExport(),
    });
    triggerBlobDownload(file.name, file, 'application/pdf');
  };

  const handlePublishPdfToBoard = async () => {
    if (!firebaseUser || !profile || !selectedAssessment) return;
    setPublishingPdf(true);
    setStatusMsg(null);
    try {
      const pdfFile = buildGradesPdfFile({
        classCode,
        classTitle,
        lecturerName,
        assessmentTitle: selectedAssessment.title,
        assessmentDate: selectedAssessment.date,
        maxPoints: selectedAssessment.maxPoints,
        rows: buildRowsForExport(),
      });
      const attachment = await uploadClassAttachment(classId, firebaseUser.uid, pdfFile);
      await createResultPublication(classId, firebaseUser.uid, profile.displayName, {
        title: `Pauta Oficial — ${selectedAssessment.title}`,
        assessmentTitle: selectedAssessment.title,
        format: 'pdf',
        notes: `Pauta gerada automaticamente a partir das notas lançadas (Média: ${stats.avg} / ${selectedAssessment.maxPoints}).`,
        publishedDate: new Date().toISOString().slice(0, 10),
        attachment,
      });
      setStatusMsg({
        type: 'ok',
        text: 'Pauta PDF publicada no Mural de Resultados da turma!',
      });
      onPublishedToResults?.();
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao publicar pauta PDF no mural.',
      });
    } finally {
      setPublishingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Notas das Provas &amp; Avaliações por Estudante
          </h2>
          <p className="text-xs text-slate-500">
            Crie provas, frequências ou testes, atribua a nota individual a cada estudante e publique a pauta em PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatusMsg(null);
            setShowNewForm(!showNewForm);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showNewForm ? 'Fechar Formulário' : 'Nova Prova / Avaliação'}</span>
        </button>
      </div>

      {/* Status alert */}
      {statusMsg && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMsg.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Create Assessment Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreateAssessment}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 animate-fadeIn"
        >
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Prova ou Avaliação *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.assessmentTitleMax}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: 1.ª Prova Parcelar / Exame Normal"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssessmentCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-600"
              >
                <option value="prova">Prova Escrita</option>
                <option value="frequencia">Frequência</option>
                <option value="teste">Teste / Quiz</option>
                <option value="trabalho">Trabalho / Defesa</option>
                <option value="oral">Avaliação Oral</option>
                <option value="exame">Exame Final</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Escala Máxima *
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

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Realização
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações / Critérios (opcional)
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.assessmentNotesMax}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: Peso 40% na média final, consulta não permitida"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || title.trim().length < 2}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              {creating ? 'A criar...' : 'Criar e Lançar Notas'}
            </button>
          </div>
        </form>
      )}

      {/* Assessments Selector */}
      {assessments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Award className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Nenhuma prova ou avaliação criada ainda</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Clique em <strong>Nova Prova / Avaliação</strong> acima para criar a 1.ª Frequência, Prova ou Exame e atribuir notas a cada estudante da turma.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Assessment Pills Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {assessments.map((asg) => {
              const active = asg.id === selectedId;
              return (
                <button
                  key={asg.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(asg.id);
                    setStatusMsg(null);
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-[10px] font-semibold uppercase ${active ? 'text-sky-300' : 'text-blue-700'}`}>
                    {CATEGORY_LABELS[asg.category]} · 0–{asg.maxPoints}
                  </div>
                  <div className="text-xs font-bold">{asg.title}</div>
                </button>
              );
            })}
          </div>

          {selectedAssessment && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Selected Assessment Header + Stats + Actions */}
              <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4 bg-slate-50/70">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-blue-700">
                        {CATEGORY_LABELS[selectedAssessment.category]}
                      </span>
                      {selectedAssessment.date && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{selectedAssessment.date}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">Nota Máx: {selectedAssessment.maxPoints}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{selectedAssessment.title}</h3>
                    {selectedAssessment.notes && (
                      <p className="text-xs text-slate-600">{selectedAssessment.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={enrollments.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 rounded-lg cursor-pointer disabled:opacity-40"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Exportar CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={enrollments.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 rounded-lg cursor-pointer disabled:opacity-40"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      <span>Exportar PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePublishPdfToBoard}
                      disabled={publishingPdf || enrollments.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                      title="Gera automaticamente a pauta em PDF e publica no Mural de Resultados"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{publishingPdf ? 'A publicar PDF...' : 'Publicar Pauta PDF no Mural'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteAssessment(classId, selectedAssessment.id)}
                      title="Eliminar avaliação"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-slate-500">Estudantes Avaliados</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {stats.graded} / {enrollments.length}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-slate-500">Média da Turma</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{stats.avg}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-slate-500">Nota Mais Alta</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{stats.highest}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-slate-500">Aprovação (≥ 50%)</span>
                    <div className="font-mono font-bold text-emerald-700 mt-0.5">{stats.passRate}</div>
                  </div>
                </div>
              </div>

              {/* Filter & Batch Save */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Procurar estudante por nome ou número..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 w-full sm:w-72"
                  />
                </div>

                {enrollments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={savingAll}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50 self-end sm:self-auto"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingAll ? 'A guardar todas...' : 'Guardar Todas as Notas'}</span>
                  </button>
                )}
              </div>

              {/* Grading Roster Table */}
              {enrollments.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Sem estudantes inscritos na turma</h4>
                  <p className="text-xs text-slate-500">
                    Convide os estudantes primeiro no separador <strong>Estudantes</strong> para poder atribuir notas individuais.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-4">Estudante</th>
                        <th className="py-2.5 px-4">N.º</th>
                        <th className="py-2.5 px-4 w-36">Nota (0–{selectedAssessment.maxPoints})</th>
                        <th className="py-2.5 px-4">Observação</th>
                        <th className="py-2.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedStudents.map((student) => {
                        const saved = gradesByStudentId[student.studentId];
                        const val = scoreInputs[student.studentId] ?? '';
                        const isSavingOne = savingStudentId === student.studentId;
                        return (
                          <tr key={student.studentId} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <StudentAvatar
                                  name={student.studentName}
                                  photoUrl={student.studentPhotoUrl}
                                  size="sm"
                                />
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {student.studentName}
                                  </div>
                                  {saved && (
                                    <span className="text-[10px] font-medium text-emerald-700">
                                      Registada: {saved.score} / {selectedAssessment.maxPoints}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {student.studentCode || '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="number"
                                min="0"
                                max={selectedAssessment.maxPoints}
                                step="0.1"
                                value={val}
                                onChange={(e) =>
                                  setScoreInputs((prev) => ({
                                    ...prev,
                                    [student.studentId]: e.target.value,
                                  }))
                                }
                                placeholder={`0–${selectedAssessment.maxPoints}`}
                                className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-900 outline-none focus:border-blue-600"
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                maxLength={BLUEPRINT_LIMITS.gradeRemarksMax}
                                value={remarkInputs[student.studentId] ?? ''}
                                onChange={(e) =>
                                  setRemarkInputs((prev) => ({
                                    ...prev,
                                    [student.studentId]: e.target.value,
                                  }))
                                }
                                placeholder="ex: Aprovado / Recurso / Faltou"
                                className="w-full min-w-[160px] px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleSaveOne(student)}
                                disabled={isSavingOne}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40"
                              >
                                <Save className="w-3 h-3" />
                                <span>{isSavingOne ? '...' : 'Guardar'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
