import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ClassChatMessage,
  Enrollment,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  sendClassChatMessage,
  deleteClassChatMessage,
  updateStudentEnrollmentPhoto,
} from '../../services/academicService';
import { StudentAvatar, StudentPhotoPicker } from '../StudentAvatar';
import {
  MessageCircle,
  Send,
  Trash2,
  Camera,
  X,
  AlertCircle,
} from 'lucide-react';

interface ClassChatTabProps {
  classId: string;
  classCode: string;
  classTitle: string;
  lecturerId: string;
  messages: ClassChatMessage[];
  isLecturerOwner: boolean;
  myEnrollment: Enrollment | null;
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Hoje';
  if (sameDay(date, yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(date?: Date): string {
  if (!date) return 'agora';
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export const ClassChatTab: React.FC<ClassChatTabProps> = ({
  classId,
  classCode,
  classTitle,
  lecturerId,
  messages,
  isLecturerOwner,
  myEnrollment,
}) => {
  const { firebaseUser, profile, syncStudentIdentity } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showMyPhotoEditor, setShowMyPhotoEditor] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const myDisplayName = myEnrollment?.studentName || profile?.displayName || 'Utilizador';
  const myStudentCode = myEnrollment?.studentCode || profile?.studentCode || '';
  const myPhotoUrl = myEnrollment?.studentPhotoUrl ?? profile?.photoUrl ?? '';

  const groupedMessages = useMemo(() => {
    const groups: Array<{ dayKey: string; dayLabel: string; items: ClassChatMessage[] }> = [];
    messages.forEach((msg) => {
      const d = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const last = groups[groups.length - 1];
      if (!last || last.dayKey !== dayKey) {
        groups.push({ dayKey, dayLabel: formatDayLabel(d), items: [msg] });
      } else {
        last.items.push(msg);
      }
    });
    return groups;
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!firebaseUser || !profile || !text.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      await sendClassChatMessage(classId, lecturerId, {
        authorId: firebaseUser.uid,
        authorName: isLecturerOwner ? profile.displayName : myDisplayName,
        authorRole: isLecturerOwner ? 'docente' : 'estudante',
        authorStudentCode: isLecturerOwner ? undefined : myStudentCode,
        authorPhotoUrl: myPhotoUrl,
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

  const handleUpdateMyPhoto = async (nextPhoto: string) => {
    if (!firebaseUser) return;
    setSavingPhoto(true);
    setError('');
    try {
      if (myEnrollment) {
        await updateStudentEnrollmentPhoto(classId, firebaseUser.uid, nextPhoto);
      }
      await syncStudentIdentity(myDisplayName, myStudentCode, nextPhoto);
      setShowMyPhotoEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar a fotografia.');
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              Bate-Papo da Turma · {classCode}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              Conversa simples em tempo real ({classTitle})
            </p>
          </div>
        </div>

        {!isLecturerOwner && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <StudentAvatar name={myDisplayName} photoUrl={myPhotoUrl} size="sm" />
            <button
              type="button"
              onClick={() => setShowMyPhotoEditor(!showMyPhotoEditor)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg transition cursor-pointer"
            >
              {showMyPhotoEditor ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Fechar</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-blue-700" />
                  <span>{myPhotoUrl ? 'Alterar Minha Foto' : 'Adicionar Foto (Opcional)'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Optional inline student photo updater */}
      {showMyPhotoEditor && !isLecturerOwner && (
        <div className="p-4 border-b border-slate-200 bg-blue-50/40 animate-fadeIn">
          <StudentPhotoPicker
            compact
            photoUrl={myPhotoUrl}
            onChange={handleUpdateMyPhoto}
            label={savingPhoto ? 'A guardar fotografia...' : 'A Minha Fotografia na Turma (Opcional)'}
            helperText="A sua foto aparece junto ao seu nome no bate-papo e na pauta do docente."
          />
        </div>
      )}

      {/* Messages Feed */}
      <div className="p-4 sm:p-5 space-y-5 h-[440px] sm:h-[500px] overflow-y-auto bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 px-4">
            <MessageCircle className="w-9 h-9 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">Ainda sem mensagens no bate-papo</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Envie a primeira mensagem para tirar dúvidas rápidas, combinar horários ou conversar com toda a turma.
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.dayKey} className="space-y-3">
              <div className="flex items-center justify-center">
                <span className="px-3 py-0.5 bg-slate-200/80 text-slate-600 rounded-full text-[11px] font-semibold">
                  {group.dayLabel}
                </span>
              </div>

              <div className="space-y-2.5">
                {group.items.map((msg) => {
                  const isMine = firebaseUser?.uid === msg.authorId;
                  const canDelete = isLecturerOwner || isMine;
                  const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate() : undefined;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <StudentAvatar
                          name={msg.authorName}
                          photoUrl={msg.authorPhotoUrl}
                          size="sm"
                          tone={msg.authorRole === 'docente' ? 'lecturer' : 'student'}
                        />
                      )}

                      <div
                        className={`group max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs border ${
                          isMine
                            ? 'bg-slate-900 text-white border-slate-900 rounded-br-sm'
                            : msg.authorRole === 'docente'
                            ? 'bg-blue-50 text-slate-900 border-blue-200 rounded-bl-sm'
                            : 'bg-white text-slate-900 border-slate-200 rounded-bl-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span
                              className={`font-bold truncate ${
                                isMine ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {msg.authorName}
                            </span>
                            {msg.authorRole === 'docente' ? (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  isMine
                                    ? 'bg-blue-500/30 text-sky-200'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                Docente
                              </span>
                            ) : (
                              msg.authorStudentCode && (
                                <span
                                  className={`font-mono text-[10px] ${
                                    isMine ? 'text-slate-300' : 'text-slate-400'
                                  }`}
                                >
                                  #{msg.authorStudentCode}
                                </span>
                              )
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] font-mono ${
                                isMine ? 'text-slate-400' : 'text-slate-400'
                              }`}
                            >
                              {formatTimeLabel(msgTime)}
                            </span>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => deleteClassChatMessage(classId, msg.id)}
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
                          name={msg.authorName}
                          photoUrl={msg.authorPhotoUrl}
                          size="sm"
                          tone={msg.authorRole === 'docente' ? 'lecturer' : 'student'}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
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
            placeholder="Escreva uma mensagem no bate-papo da turma..."
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

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Prima Enter para enviar · Shift+Enter para nova linha</span>
          {text.length > 1200 && (
            <span className="font-mono">
              {text.length} / {BLUEPRINT_LIMITS.chatMessageMax}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
