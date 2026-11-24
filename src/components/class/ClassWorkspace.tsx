import React, { useState, useEffect } from 'react';
import {
  UniversityClass,
  ClassPost,
  ClassResource,
  Assignment,
  Enrollment,
  Assessment,
  ResultPublication,
  ClassChatMessage,
  LecturerPublicProfile,
  DirectConversation,
  AccentColor,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeClassById,
  subscribeClassPosts,
  subscribeClassResources,
  subscribeClassAssignments,
  subscribeClassEnrollments,
  subscribeClassAssessments,
  subscribeClassResults,
  subscribeClassChatMessages,
  subscribeMyEnrollment,
  subscribeLecturerProfile,
  subscribeClassConversations,
  deleteClass,
  removeEnrollment,
} from '../../services/academicService';
import { PostStreamTab } from './PostStreamTab';
import { ClassChatTab } from './ClassChatTab';
import { DirectChatTab } from './DirectChatTab';
import { LecturerProfileTab } from './LecturerProfileTab';
import { ResourcesTab } from './ResourcesTab';
import { AssignmentsTab } from './AssignmentsTab';
import { GradesTab } from './GradesTab';
import { ResultsBoardTab } from './ResultsBoardTab';
import { StudentsTab } from './StudentsTab';
import { InviteStudentsModal } from '../Modals';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  Copy,
  Check,
  Edit3,
  Trash2,
  Megaphone,
  MessageCircle,
  MessageSquare,
  GraduationCap,
  Globe,
  ClipboardCheck,
  Award,
  Camera,
  Users,
  Info,
  UserPlus,
  Link2,
  LogOut,
} from 'lucide-react';

const BANNER_GRADIENT: Record<AccentColor, string> = {
  indigo: 'from-slate-900 via-indigo-950 to-blue-950',
  emerald: 'from-slate-900 via-emerald-950 to-teal-950',
  amber: 'from-slate-900 via-amber-950 to-stone-900',
  rose: 'from-slate-900 via-rose-950 to-slate-900',
  sky: 'from-slate-900 via-sky-950 to-blue-950',
  slate: 'from-slate-900 via-slate-800 to-zinc-900',
};

interface ClassWorkspaceProps {
  classId: string;
  onBackOverview: () => void;
  onEditClass: (cls: UniversityClass) => void;
  autoOpenInvite?: boolean;
  onClearAutoInvite?: () => void;
}

export const ClassWorkspace: React.FC<ClassWorkspaceProps> = ({
  classId,
  onBackOverview,
  onEditClass,
  autoOpenInvite = false,
  onClearAutoInvite,
}) => {
  const { firebaseUser, effectiveRole } = useAuth();
  const [cls, setCls] = useState<UniversityClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ClassPost[]>([]);
  const [resources, setResources] = useState<ClassResource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<ResultPublication[]>([]);
  const [chatMessages, setChatMessages] = useState<ClassChatMessage[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [myEnrollment, setMyEnrollment] = useState<Enrollment | null>(null);
  const [lecturerProfile, setLecturerProfile] = useState<LecturerPublicProfile | null>(null);
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [directStudentId, setDirectStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'stream'
    | 'chat'
    | 'direct'
    | 'professor'
    | 'resources'
    | 'assignments'
    | 'grades'
    | 'results'
    | 'students'
    | 'info'
  >('stream');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteJustCreated, setInviteJustCreated] = useState(false);

  useEffect(() => {
    if (autoOpenInvite && cls && cls.id === classId) {
      setInviteJustCreated(true);
      setInviteOpen(true);
      onClearAutoInvite?.();
    }
  }, [autoOpenInvite, cls, classId, onClearAutoInvite]);

  useEffect(() => {
    setLoading(true);
    setConfirmDelete(false);
    const unsubClass = subscribeClassById(classId, (data) => {
      setCls(data);
      setLoading(false);
    });
    const unsubPosts = subscribeClassPosts(classId, setPosts);
    const unsubRes = subscribeClassResources(classId, setResources);
    const unsubAsg = subscribeClassAssignments(classId, setAssignments);
    const unsubAssessments = subscribeClassAssessments(classId, setAssessments);
    const unsubResults = subscribeClassResults(classId, setResults);
    const unsubChat = subscribeClassChatMessages(classId, setChatMessages);

    return () => {
      unsubClass();
      unsubPosts();
      unsubRes();
      unsubAsg();
      unsubAssessments();
      unsubResults();
      unsubChat();
    };
  }, [classId]);

  const isLecturerOwner = Boolean(cls && firebaseUser && cls.lecturerId === firebaseUser.uid);

  // Subscribe to public lecturer profile panel
  useEffect(() => {
    if (!cls?.lecturerId) {
      setLecturerProfile(null);
      return;
    }
    return subscribeLecturerProfile(cls.lecturerId, setLecturerProfile);
  }, [cls?.lecturerId]);

  // Only lecturer subscribes to full class enrollments & private inbox list; students subscribe to their own enrollment
  useEffect(() => {
    if (!firebaseUser) {
      setEnrollments([]);
      setConversations([]);
      setMyEnrollment(null);
      return;
    }
    if (isLecturerOwner) {
      setMyEnrollment(null);
      const unsubEnr = subscribeClassEnrollments(classId, setEnrollments);
      const unsubConv = subscribeClassConversations(classId, firebaseUser.uid, setConversations);
      return () => {
        unsubEnr();
        unsubConv();
      };
    }
    setEnrollments([]);
    setConversations([]);
    return subscribeMyEnrollment(classId, firebaseUser.uid, setMyEnrollment);
  }, [classId, isLecturerOwner, firebaseUser]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="h-36 bg-slate-200 animate-pulse rounded-2xl" />
        <div className="h-12 bg-slate-200 animate-pulse rounded-xl" />
        <div className="h-48 bg-slate-200 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Turma não encontrada</h2>
        <p className="text-sm text-slate-500">
          Esta unidade curricular pode ter sido removida ou não tem permissão de acesso.
        </p>
        <button
          onClick={onBackOverview}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
        >
          Voltar ao Painel Geral
        </button>
      </div>
    );
  }

  const canManage = isLecturerOwner && effectiveRole === 'docente';

  const handleCopyJoinCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cls.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }
  };

  const handleCopyInviteLink = () => {
    if (navigator.clipboard && typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/?convite=${cls.joinCode}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    }
  };

  const handleDeleteClass = async () => {
    setDeletingClass(true);
    try {
      await deleteClass(cls.id, cls.joinCode, cls.lecturerId);
      onBackOverview();
    } finally {
      setDeletingClass(false);
    }
  };

  const handleLeaveClass = async () => {
    if (!firebaseUser) return;
    await removeEnrollment(cls.id, firebaseUser.uid);
    onBackOverview();
  };

  type WorkspaceTab =
    | 'stream'
    | 'chat'
    | 'direct'
    | 'professor'
    | 'resources'
    | 'assignments'
    | 'grades'
    | 'results'
    | 'students'
    | 'info';
  const tabs: Array<{
    id: WorkspaceTab;
    label: string;
    count: number | null;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'stream', label: 'Mural & Comunicados', count: posts.length, icon: Megaphone },
    { id: 'chat', label: 'Bate-Papo', count: chatMessages.length, icon: MessageCircle },
    {
      id: 'direct',
      label: canManage ? 'Mensagens Privadas' : 'Conversar com o Professor',
      count: canManage ? conversations.length : null,
      icon: MessageSquare,
    },
    { id: 'professor', label: 'Sobre o Professor', count: null, icon: GraduationCap },
    { id: 'resources', label: 'Sites & Conteúdos', count: resources.length, icon: Globe },
    { id: 'assignments', label: 'Trabalhos', count: assignments.length, icon: ClipboardCheck },
    { id: 'grades', label: 'Notas & Provas', count: assessments.length, icon: Award },
    { id: 'results', label: 'Mural de Resultados', count: results.length, icon: Camera },
    ...(isLecturerOwner
      ? [{ id: 'students' as const, label: 'Estudantes', count: enrollments.length, icon: Users }]
      : []),
    { id: 'info', label: 'Programa & Horário', count: null, icon: Info },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fadeIn">
      {/* Top Breadcrumb Action */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onBackOverview}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Todas as Turmas</span>
        </button>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white rounded-lg transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Convidar Estudantes</span>
            </button>
            <button
              onClick={() => onEditClass(cls)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 rounded-lg cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Turma</span>
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apagar Turma</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-[11px] font-semibold text-red-700">Apagar turma?</span>
                <button
                  onClick={handleDeleteClass}
                  disabled={deletingClass}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded cursor-pointer disabled:opacity-50"
                >
                  {deletingClass ? 'A apagar...' : 'Sim, Apagar'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[11px] rounded cursor-pointer"
                >
                  Não
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Class Hero Banner */}
      <div
        className={`bg-gradient-to-br ${
          BANNER_GRADIENT[cls.accentColor] || BANNER_GRADIENT.indigo
        } text-white rounded-2xl p-6 space-y-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-mono font-bold text-white">{cls.code}</span>
              <span aria-hidden="true">·</span>
              <span>{cls.semester}</span>
              {cls.school && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{cls.school}</span>
                </>
              )}
              {(cls.course || cls.department) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{cls.course || cls.department}</span>
                </>
              )}
              {cls.academicYear && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-sky-300">{cls.academicYear}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {cls.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span>
                Docente responsável:{' '}
                <strong className="text-white">
                  {lecturerProfile?.displayName || cls.lecturerName}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('professor')}
                className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 underline underline-offset-2 font-medium cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Ver perfil do professor</span>
              </button>
              {!canManage && (
                <button
                  type="button"
                  onClick={() => setActiveTab('direct')}
                  className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 underline underline-offset-2 font-medium cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Conversar com o professor</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start">
            <button
              onClick={handleCopyJoinCode}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-mono font-semibold text-white transition cursor-pointer"
              title="Copiar código de registo da turma"
            >
              <span>Código: {cls.joinCode}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Copiar endereço direto para enviar aos estudantes"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5 text-blue-700" />}
              <span>{copiedLink ? 'Endereço Copiado!' : 'Copiar Endereço da Turma'}</span>
            </button>
          </div>
        </div>

        {/* Schedule, Room, Online Meeting Quick Row */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10 text-xs text-slate-200">
          {cls.schedule && (
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{cls.schedule}</span>
            </div>
          )}
          {cls.room && (
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{cls.room}</span>
            </div>
          )}
          {cls.meetingUrl && (
            <a
              href={cls.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200 font-medium underline underline-offset-2"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Entrar na Sala Online</span>
            </a>
          )}
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="font-mono text-[11px] text-slate-400">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Surface */}
      <div>
        {activeTab === 'stream' && (
          <PostStreamTab
            classId={cls.id}
            classCode={cls.code}
            classTitle={cls.title}
            posts={posts}
            isLecturerOwner={isLecturerOwner}
          />
        )}

        {activeTab === 'chat' && (
          <ClassChatTab
            classId={cls.id}
            classCode={cls.code}
            classTitle={cls.title}
            lecturerId={cls.lecturerId}
            messages={chatMessages}
            isLecturerOwner={isLecturerOwner}
            myEnrollment={myEnrollment}
          />
        )}

        {activeTab === 'direct' && (
          <DirectChatTab
            cls={cls}
            lecturerProfile={lecturerProfile}
            isLecturerOwner={isLecturerOwner}
            canManage={canManage}
            enrollments={enrollments}
            conversations={conversations}
            myEnrollment={myEnrollment}
            selectedStudentId={directStudentId}
            onSelectStudent={(id) => setDirectStudentId(id)}
            onOpenLecturerProfile={() => setActiveTab('professor')}
          />
        )}

        {activeTab === 'professor' && (
          <LecturerProfileTab
            cls={cls}
            lecturerProfile={lecturerProfile}
            canManage={canManage}
            onOpenDirectChat={() => setActiveTab('direct')}
          />
        )}

        {activeTab === 'resources' && (
          <ResourcesTab
            classId={cls.id}
            classCode={cls.code}
            classTitle={cls.title}
            resources={resources}
            isLecturerOwner={isLecturerOwner}
          />
        )}

        {activeTab === 'assignments' && (
          <AssignmentsTab
            classId={cls.id}
            assignments={assignments}
            isLecturerOwner={isLecturerOwner}
          />
        )}

        {activeTab === 'grades' && (
          <GradesTab
            classId={cls.id}
            classCode={cls.code}
            classTitle={cls.title}
            lecturerName={cls.lecturerName}
            assessments={assessments}
            enrollments={enrollments}
            isLecturerOwner={isLecturerOwner}
            onPublishedToResults={() => setActiveTab('results')}
          />
        )}

        {activeTab === 'results' && (
          <ResultsBoardTab
            classId={cls.id}
            results={results}
            isLecturerOwner={isLecturerOwner}
          />
        )}

        {activeTab === 'students' && isLecturerOwner && (
          <StudentsTab
            classId={cls.id}
            classCode={cls.code}
            classTitle={cls.title}
            joinCode={cls.joinCode}
            enrollments={enrollments}
            isLecturerOwner={isLecturerOwner}
            onOpenInvite={() => setInviteOpen(true)}
            onMessageStudent={(studentId) => {
              setDirectStudentId(studentId);
              setActiveTab('direct');
            }}
          />
        )}

        {activeTab === 'info' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">
                Programa &amp; Informações Gerais
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {cls.description || 'Sem descrição programática registada para esta turma.'}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500">Unidade Curricular</span>
                <div className="font-semibold text-slate-900 mt-0.5">{cls.title}</div>
              </div>
              <div>
                <span className="text-slate-500">Escola / Instituição</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {cls.school || 'A definir'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Curso</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {cls.course || cls.department || 'A definir'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Ano Curricular</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {cls.academicYear || 'A definir'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Docente</span>
                <div className="font-semibold text-slate-900 mt-0.5">{cls.lecturerName}</div>
              </div>
              <div>
                <span className="text-slate-500">Código da Disciplina</span>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">{cls.code}</div>
              </div>
              <div>
                <span className="text-slate-500">Horário</span>
                <div className="font-semibold text-slate-900 mt-0.5">{cls.schedule || 'A definir'}</div>
              </div>
              <div>
                <span className="text-slate-500">Local / Sala</span>
                <div className="font-semibold text-slate-900 mt-0.5">{cls.room || 'A definir'}</div>
              </div>
            </div>

            {canManage ? (
              <div className="pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Zona de gestão da unidade curricular
                </span>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Apagar Turma</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-700">Confirmar eliminação?</span>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDeleteClass}
                      disabled={deletingClass}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {deletingClass ? 'A apagar...' : 'Sim, Apagar'}
                    </button>
                  </div>
                )}
              </div>
            ) : !isLecturerOwner && (
              <div className="pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Cancelar a sua inscrição nesta turma
                </span>
                {!confirmLeave ? (
                  <button
                    onClick={() => setConfirmLeave(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da Turma</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-700">Confirmar saída da turma?</span>
                    <button
                      onClick={() => setConfirmLeave(false)}
                      className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleLeaveClass}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
                    >
                      Sim, Sair
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <InviteStudentsModal
        isOpen={inviteOpen}
        justCreated={inviteJustCreated}
        onClose={() => {
          setInviteOpen(false);
          setInviteJustCreated(false);
        }}
        cls={cls}
      />
    </div>
  );
};
