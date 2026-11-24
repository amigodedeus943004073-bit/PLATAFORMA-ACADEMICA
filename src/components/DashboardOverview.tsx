import React, { useState } from 'react';
import {
  UniversityClass,
  Enrollment,
  PostType,
  PostPriority,
  AccentColor,
} from '../types/academic';
import { useAuth } from '../context/AuthContext';
import { createPost, seedSampleAcademicClasses } from '../services/academicService';
import {
  Plus,
  Copy,
  Check,
  Send,
  ArrowRight,
  Calendar,
  MapPin,
  Sparkles,
  LogIn,
  ExternalLink,
  Search,
  Link2,
} from 'lucide-react';

const ACCENT_TOP_BORDER: Record<AccentColor, string> = {
  indigo: 'border-t-indigo-600',
  emerald: 'border-t-emerald-600',
  amber: 'border-t-amber-600',
  rose: 'border-t-rose-600',
  sky: 'border-t-sky-600',
  slate: 'border-t-slate-700',
};

interface DashboardOverviewProps {
  classes: UniversityClass[];
  enrollments: Enrollment[];
  onSelectClass: (classId: string) => void;
  onOpenNewClass: () => void;
  onOpenJoinClass: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  classes,
  enrollments,
  onSelectClass,
  onOpenNewClass,
  onOpenJoinClass,
}) => {
  const { firebaseUser, profile, effectiveRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Quick Broadcast Composer state
  const [targetClassId, setTargetClassId] = useState('');
  const [postType, setPostType] = useState<PostType>('comunicado');
  const [priority, setPriority] = useState<PostPriority>('normal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);

  const isDocente = effectiveRole === 'docente';
  const activeTargetId = targetClassId || classes[0]?.id || '';

  const handleCopyCode = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedId(val);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleQuickBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !activeTargetId || !title.trim()) return;

    setSending(true);
    try {
      await createPost(activeTargetId, firebaseUser.uid, profile.displayName, {
        type: postType,
        priority,
        module: 'Comunicado Geral',
        title,
        body,
        externalUrl,
        externalLabel: externalUrl ? 'Aceder ao Site / Recurso' : '',
        isPinned: priority === 'urgente',
      });
      setTitle('');
      setBody('');
      setExternalUrl('');
      setSentNotice(true);
      setTimeout(() => setSentNotice(false), 3000);
    } finally {
      setSending(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!firebaseUser || !profile) return;
    setSeeding(true);
    try {
      await seedSampleAcademicClasses(firebaseUser.uid, profile.displayName);
    } finally {
      setSeeding(false);
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.course || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.academicYear || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.semester.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.classTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.classCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.course || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.academicYear || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {isDocente ? 'Portal do Docente Universitário' : 'Portal do Estudante'} ·{' '}
            {profile?.department || 'Ensino Superior'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Bem-vindo, {profile?.displayName}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar turmas..."
              className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-600 w-48 sm:w-56"
            />
          </div>

          {isDocente ? (
            <button
              onClick={onOpenNewClass}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Turma</span>
            </button>
          ) : (
            <button
              onClick={onOpenJoinClass}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar numa Turma</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Turmas Lecionadas</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{classes.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Turmas Inscritas</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{enrollments.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Perfil Ativo</div>
          <div className="text-sm font-bold text-slate-900 mt-2">
            {isDocente ? 'Docente' : 'Estudante'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Estado da Base de Dados</div>
          <div className="text-sm font-semibold text-emerald-700 mt-2">Sincronização Ativa</div>
        </div>
      </div>

      {/* DOCENTE: Quick Broadcast Publisher + Classes Grid */}
      {isDocente && (
        <>
          {classes.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Envio Rápido de Comunicado, Conteúdo ou Site
                  </h2>
                  <p className="text-xs text-slate-500">
                    Publique diretamente para qualquer uma das suas turmas sem sair do painel principal.
                  </p>
                </div>
                {sentNotice && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Publicado na turma com sucesso
                  </span>
                )}
              </div>

              <form onSubmit={handleQuickBroadcast} className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Turma Destino
                    </label>
                    <select
                      value={activeTargetId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tipo de Publicação
                    </label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as PostType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
                    >
                      <option value="comunicado">Comunicado aos Estudantes</option>
                      <option value="conteudo">Conteúdo / Material de Aula</option>
                      <option value="link">Endereço de Site / Recurso Web</option>
                      <option value="aviso_avaliacao">Aviso de Avaliação / Prova</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as PostPriority)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
                    >
                      <option value="normal">Normal</option>
                      <option value="importante">Importante</option>
                      <option value="urgente">Urgente (Fixar no topo)</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título do comunicado ou conteúdo..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="Endereço de site opcional (ex: https://docs.exemplo.edu)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                  <textarea
                    rows={2}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Escreva os detalhes, orientações de estudo ou informações adicionais..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !title.trim()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? 'A enviar...' : 'Publicar na Turma'}</span>
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Classes Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">As Minhas Turmas</h2>
              <span className="text-xs text-slate-500 font-mono">{filteredClasses.length} unidades</span>
            </div>

            {classes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
                <h3 className="text-base font-bold text-slate-900">Ainda não tem turmas criadas</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Crie a sua primeira unidade curricular para começar a publicar comunicados, endereços de sites, conteúdos e avaliações.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={onOpenNewClass}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Primeira Turma</span>
                  </button>
                  <button
                    onClick={handleSeedDemo}
                    disabled={seeding}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>{seeding ? 'A criar turmas modelo...' : 'Carregar 2 Turmas Modelo'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => onSelectClass(cls.id)}
                    className={`bg-white border border-slate-200 border-t-4 ${
                      ACCENT_TOP_BORDER[cls.accentColor] || 'border-t-indigo-600'
                    } rounded-xl p-5 hover:border-slate-300 transition cursor-pointer flex flex-col justify-between gap-4`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">{cls.code}</span>
                        <span>
                          {cls.academicYear ? `${cls.academicYear} · ` : ''}
                          {cls.semester}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {cls.title}
                      </h3>

                      {(cls.course || cls.department) && (
                        <div className="text-xs font-medium text-blue-700 truncate">
                          {cls.course || cls.department}
                        </div>
                      )}

                      {cls.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {cls.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="space-y-1 text-xs text-slate-500">
                        {cls.schedule && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{cls.schedule}</span>
                          </div>
                        )}
                        {cls.room && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{cls.room}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px]">
                          <span className="font-mono text-blue-900 truncate">
                            /?convite={cls.joinCode}
                          </span>
                          <button
                            onClick={(e) =>
                              handleCopyCode(
                                `${typeof window !== 'undefined' ? window.location.origin : ''}/?convite=${cls.joinCode}`,
                                e
                              )
                            }
                            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 shrink-0 cursor-pointer"
                            title="Copiar endereço direto para enviar aos estudantes"
                          >
                            {copiedId ===
                            `${typeof window !== 'undefined' ? window.location.origin : ''}/?convite=${cls.joinCode}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Link2 className="w-3 h-3" />
                                <span>Copiar Endereço</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => handleCopyCode(cls.joinCode, e)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-mono font-semibold text-slate-800 transition cursor-pointer"
                            title="Copiar código para enviar aos estudantes"
                          >
                            <span>Código: {cls.joinCode}</span>
                            {copiedId === cls.joinCode ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500" />
                            )}
                          </button>

                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                            <span>Abrir</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ESTUDANTE VIEW: Enrolled Classes */}
      {!isDocente && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Minhas Disciplinas Inscritas</h2>
            <span className="text-xs text-slate-500 font-mono">{filteredEnrollments.length} turmas</span>
          </div>

          {enrollments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
              <h3 className="text-base font-bold text-slate-900">Ainda não está inscrito em nenhuma turma</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Peça o código da turma ao seu docente universitário e clique abaixo para aceder aos comunicados, sites e trabalhos.
              </p>
              <button
                onClick={onOpenJoinClass}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar com Código da Turma</span>
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEnrollments.map((enr) => (
                <div
                  key={enr.classId}
                  onClick={() => onSelectClass(enr.classId)}
                  className={`bg-white border border-slate-200 border-t-4 ${
                    ACCENT_TOP_BORDER[enr.accentColor] || 'border-t-indigo-600'
                  } rounded-xl p-5 hover:border-slate-300 transition cursor-pointer flex flex-col justify-between gap-4`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">{enr.classCode}</span>
                      <span>
                        {enr.academicYear ? `${enr.academicYear} · ` : ''}
                        {enr.semester}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{enr.classTitle}</h3>
                    {enr.course && (
                      <div className="text-xs font-medium text-blue-700 truncate">{enr.course}</div>
                    )}
                    <p className="text-xs text-slate-600">Docente: {enr.lecturerName}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-mono">
                      Presenças registadas: {enr.attendanceCount}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                      <span>Aceder</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
