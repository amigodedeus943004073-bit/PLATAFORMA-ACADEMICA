import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UniversityClass,
  Enrollment,
  DirectConversation,
  DirectMessage,
  LecturerPublicProfile,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeDirectMessages,
  sendDirectMessage,
  deleteDirectMessage,
} from '../../services/academicService';
import { StudentAvatar } from '../StudentAvatar';
import {
  MessageSquare,
  Send,
  Trash2,
  Lock,
  Search,
  UserCheck,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';

interface DirectChatTabProps {
  cls: UniversityClass;
  lecturerProfile: LecturerPublicProfile | null;
  isLecturerOwner: boolean;
  canManage: boolean;
  enrollments: Enrollment[];
  conversations: DirectConversation[];
  myEnrollment: Enrollment | null;
  selectedStudentId?: string | null;
  onSelectStudent?: (studentId: string) => void;
  onOpenLecturerProfile?: () => void;
}

function formatMessageTime(date?: Date): string {
  if (!date) return 'agora';
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(date?: Date): string {
  if (!date) return '';
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

export const DirectChatTab: React.FC<DirectChatTabProps> = ({
  cls,
  lecturerProfile,
  isLecturerOwner,
  canManage,
  enrollments,
  conversations,
  myEnrollment,
  selectedStudentId,
  onSelectStudent,
  onOpenLecturerProfile,
}) => {
  const { firebaseUser, profile } = useAuth();
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Determine target student thread ID
  const targetStudentId = useMemo(() => {
    if (!canManage) {
      return firebaseUser?.uid || '';
    }
    if (selectedStudentId) return selectedStudentId;
    if (activeStudentId) return activeStudentId;
    if (conversations.length > 0) return conversations[0].studentId;
    if (enrollments.length > 0) return enrollments[0].studentId;
    return '';
  }, [canManage, firebaseUser?.uid, selectedStudentId, activeStudentId, conversations, enrollments]);

  useEffect(() => {
    if (selectedStudentId) {
      setActiveStudentId(selectedStudentId);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (!firebaseUser || !targetStudentId) {
      setMessages([]);
      return;
    }
    return subscribeDirectMessages(
      cls.id,
      targetStudentId,
      firebaseUser.uid,
      canManage && isLecturerOwner,
      setMessages
    );
  }, [cls.id, targetStudentId, firebaseUser, canManage, isLecturerOwner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, targetStudentId]);

  // Combined roster + conversations list for lecturer inbox
  const inboxItems = useMemo(() => {
    const convMap = new Map<string, DirectConversation>();
    conversations.forEach((c) => convMap.set(c.studentId, c));

    const merged = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentCode?: string;
        studentPhotoUrl?: string;
        lastMessage?: string;
        lastSenderRole?: 'docente' | 'estudante';
        lastTime?: Date;
      }
    >();

    conversations.forEach((c) => {
      merged.set(c.studentId, {
        studentId: c.studentId,
        studentName: c.studentName,
        studentCode: c.studentCode,
        studentPhotoUrl: c.studentPhotoUrl,
        lastMessage: c.lastMessage,
        lastSenderRole: c.lastSenderRole,
        lastTime: c.lastMessageAt?.toDate ? c.lastMessageAt.toDate() : undefined,
      });
    });

    enrollments.forEach((e) => {
      if (!merged.has(e.studentId)) {
        merged.set(e.studentId, {
          studentId: e.studentId,
          studentName: e.studentName,
          studentCode: e.studentCode,
          studentPhotoUrl: e.studentPhotoUrl,
        });
      }
    });

    const list = Array.from(merged.values());
    list.sort((a, b) => {
      const tA = a.lastTime ? a.lastTime.getTime() : 0;
      const tB = b.lastTime ? b.lastTime.getTime() : 0;
      if (tA !== tB) return tB - tA;
      return a.studentName.localeCompare(b.studentName, 'pt');
    });

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.studentName.toLowerCase().includes(q) ||
        (item.studentCode || '').toLowerCase().includes(q)
    );
  }, [conversations, enrollments, searchQuery]);

  const activePartner = useMemo(() => {
    if (!canManage) return null;
    return (
      inboxItems.find((i) => i.studentId === targetStudentId) ||
      enrollments.find((e) => e.studentId === targetStudentId) ||
      null
    );
  }, [canManage, inboxItems, enrollments, targetStudentId]);

  const lecturerDisplayName = lecturerProfile?.displayName || cls.lecturerName;
  const myStudentName = myEnrollment?.studentName || profile?.displayName || 'Estudante';
  const myStudentCode = myEnrollment?.studentCode || profile?.studentCode || '';
  const myStudentPhoto = myEnrollment?.studentPhotoUrl || profile?.photoUrl || '';

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!firebaseUser || !profile || !text.trim() || sending || !targetStudentId) return;

    const partnerName = canManage
      ? activePartner?.studentName || 'Estudante'
      : myStudentName;
    const partnerCode = canManage ? activePartner?.studentCode : myStudentCode;
    const partnerPhoto = canManage ? activePartner?.studentPhotoUrl : myStudentPhoto;

    setSending(true);
    setError('');
    try {
      await sendDirectMessage({
        classId: cls.id,
        lecturerId: cls.lecturerId,
        lecturerName: lecturerDisplayName,
        studentId: targetStudentId,
        studentName: partnerName,
        studentCode: partnerCode,
        studentPhotoUrl: partnerPhoto,
        senderId: firebaseUser.uid,
        senderName: canManage ? lecturerDisplayName : myStudentName,
        senderRole: canManage ? 'docente' : 'estudante',
        senderPhotoUrl: canManage ? lecturerProfile?.photoUrl || profile.photoUrl : myStudentPhoto,
        text,
      });
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid md:grid-cols-12 min-h-[540px]">
      {/* Left Sidebar (Lecturer Inbox of Students) */}
      {canManage && (
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Mensagens dos Estudantes</h2>
              <span className="text-[11px] font-mono text-slate-500">{inboxItems.length}</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Procurar estudante..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[220px] md:max-h-[480px]">
            {inboxItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Ainda não existem estudantes inscritos para iniciar conversa privada.
              </div>
            ) : (
              inboxItems.map((item) => {
                const isSelected = item.studentId === targetStudentId;
                return (
                  <button
                    key={item.studentId}
                    type="button"
                    onClick={() => {
                      setActiveStudentId(item.studentId);
                      onSelectStudent?.(item.studentId);
                    }}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition cursor-pointer ${
                      isSelected ? 'bg-blue-50/90 border-l-4 border-l-blue-700' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <StudentAvatar
                      name={item.studentName}
                      photoUrl={item.studentPhotoUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.studentName}
                        </span>
                        {item.lastTime && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {formatShortDate(item.lastTime)}
                          </span>
                        )}
                      </div>
                      {item.studentCode && (
                        <div className="text-[10px] font-mono text-slate-500">
                          N.º {item.studentCode}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.lastMessage
                          ? `${item.lastSenderRole === 'docente' ? 'Você: ' : ''}${item.lastMessage}`
                          : 'Iniciar conversa privada'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Conversation Thread */}
      <div className={`${canManage ? 'md:col-span-8' : 'md:col-span-12'} flex flex-col`}>
        {/* Conversation Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          {canManage ? (
            activePartner ? (
              <div className="flex items-center gap-3 min-w-0">
                <StudentAvatar
                  name={activePartner.studentName}
                  photoUrl={activePartner.studentPhotoUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {activePartner.studentName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>
                      Conversa privada com o estudante
                      {activePartner.studentCode ? ` · N.º ${activePartner.studentCode}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-500">
                Selecione um estudante à esquerda para responder em privado.
              </div>
            )
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <StudentAvatar
                  name={lecturerDisplayName}
                  photoUrl={lecturerProfile?.photoUrl}
                  size="sm"
                  tone="lecturer"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {lecturerDisplayName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                    <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>
                      Conversa direta e privada com o professor
                      {lecturerProfile?.academicTitle ? ` · ${lecturerProfile.academicTitle}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {onOpenLecturerProfile && (
                <button
                  type="button"
                  onClick={onOpenLecturerProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                  <span>Sobre o Professor</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-4 sm:p-5 space-y-3 h-[380px] sm:h-[430px] overflow-y-auto bg-slate-50/30">
          {!targetStudentId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 px-4">
              <UserCheck className="w-8 h-8 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">Nenhum estudante selecionado</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Assim que houver estudantes inscritos, poderá trocar mensagens diretas privadas por aqui.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 px-4">
              <MessageSquare className="w-9 h-9 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">
                {canManage
                  ? `Sem mensagens com ${activePartner?.studentName || 'este estudante'}`
                  : `Inicie uma conversa com ${lecturerDisplayName}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Esta conversa é privada: apenas você e {canManage ? 'o estudante' : 'o professor da turma'} podem ver estas mensagens.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = firebaseUser?.uid === msg.senderId;
              const canDelete = isLecturerOwner || isMine;
              const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate() : undefined;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <StudentAvatar
                      name={msg.senderName}
                      photoUrl={msg.senderPhotoUrl}
                      size="sm"
                      tone={msg.senderRole === 'docente' ? 'lecturer' : 'student'}
                    />
                  )}

                  <div
                    className={`max-w-[82%] sm:max-w-[72%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs border ${
                      isMine
                        ? 'bg-slate-900 text-white border-slate-900 rounded-br-sm'
                        : msg.senderRole === 'docente'
                        ? 'bg-blue-50 text-slate-900 border-blue-200 rounded-bl-sm'
                        : 'bg-white text-slate-900 border-slate-200 rounded-bl-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={`font-bold ${isMine ? 'text-white' : 'text-slate-900'}`}>
                        {msg.senderName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatMessageTime(msgTime)}
                        </span>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteDirectMessage(cls.id, targetStudentId, msg.id)}
                            title="Apagar mensagem"
                            className={`p-0.5 rounded transition cursor-pointer ${
                              isMine
                                ? 'text-slate-400 hover:text-red-300'
                                : 'text-slate-400 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                        isMine ? 'text-slate-100' : 'text-slate-800'
                      }`}
                    >
                      {msg.text}
                    </p>
                  </div>

                  {isMine && (
                    <StudentAvatar
                      name={msg.senderName}
                      photoUrl={msg.senderPhotoUrl}
                      size="sm"
                      tone={msg.senderRole === 'docente' ? 'lecturer' : 'student'}
                    />
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        {targetStudentId && (
          <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-2">
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                maxLength={BLUEPRINT_LIMITS.chatMessageMax}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  canManage
                    ? `Responder em privado a ${activePartner?.studentName || 'estudante'}...`
                    : `Escreva uma mensagem privada para ${lecturerDisplayName}...`
                }
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white resize-none max-h-28"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'A enviar...' : 'Enviar'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
