import React, { useState, useEffect, useRef } from 'react';
import {
  ClassPost,
  PostComment,
  PostType,
  PostPriority,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  createPost,
  togglePostPin,
  deletePost,
  subscribePostComments,
  addComment,
  deleteComment,
  uploadClassAttachment,
  downloadClassAttachment,
  formatFileSize,
  triggerBlobDownload,
} from '../../services/academicService';
import {
  Megaphone,
  Globe,
  AlertTriangle,
  Pin,
  Trash2,
  ExternalLink,
  MessageSquare,
  Send,
  Plus,
  Search,
  Paperclip,
  Download,
  FileText,
  X,
  AlertCircle,
} from 'lucide-react';

const TYPE_LABELS: Record<PostType, string> = {
  comunicado: 'Comunicado',
  conteudo: 'Conteúdo de Aula',
  link: 'Endereço de Site',
  aviso_avaliacao: 'Aviso de Avaliação',
};

const PostCommentsSection: React.FC<{
  classId: string;
  postId: string;
  isLecturerOwner: boolean;
}> = ({ classId, postId, isLecturerOwner }) => {
  const { firebaseUser, profile, effectiveRole } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return subscribePostComments(classId, postId, setComments);
  }, [classId, postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !text.trim()) return;
    setSending(true);
    try {
      const roleForComment = isLecturerOwner && effectiveRole === 'docente' ? 'docente' : 'estudante';
      await addComment(classId, postId, firebaseUser.uid, profile.displayName, roleForComment, text);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-3 mt-3 border-t border-slate-100 space-y-3">
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((cmt) => (
            <div
              key={cmt.id}
              className="flex items-start justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-semibold text-slate-900">{cmt.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span className={cmt.authorRole === 'docente' ? 'text-blue-700 font-medium' : ''}>
                    {cmt.authorRole === 'docente' ? 'Docente' : 'Estudante'}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed break-words">{cmt.text}</p>
              </div>
              {(isLecturerOwner || cmt.authorId === firebaseUser?.uid) && (
                <button
                  onClick={() => deleteComment(classId, postId, cmt.id)}
                  title="Remover comentário"
                  className="text-slate-400 hover:text-red-600 p-1 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          maxLength={BLUEPRINT_LIMITS.commentMax}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escrever dúvida ou comentário na turma..."
          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-600"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition cursor-pointer disabled:opacity-40"
        >
          <Send className="w-3 h-3" />
          <span>Enviar</span>
        </button>
      </form>
    </div>
  );
};

interface PostStreamTabProps {
  classId: string;
  classCode?: string;
  classTitle?: string;
  posts: ClassPost[];
  isLecturerOwner: boolean;
}

export const PostStreamTab: React.FC<PostStreamTabProps> = ({
  classId,
  classCode,
  classTitle,
  posts,
  isLecturerOwner,
}) => {
  const { firebaseUser, profile, effectiveRole } = useAuth();
  const canAuthor = isLecturerOwner && effectiveRole === 'docente';

  const [composerOpen, setComposerOpen] = useState(false);
  const [type, setType] = useState<PostType>('comunicado');
  const [priority, setPriority] = useState<PostPriority>('normal');
  const [moduleName, setModuleName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalLabel, setExternalLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [filterType, setFilterType] = useState<'all' | PostType | 'pinned'>('all');
  const [search, setSearch] = useState('');
  const [openCommentsMap, setOpenCommentsMap] = useState<Record<string, boolean>>({});
  const [downloadingPostId, setDownloadingPostId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size <= 0) {
      setFormError('O ficheiro selecionado está vazio.');
      return;
    }
    if (file.size > BLUEPRINT_LIMITS.attachmentMaxBytes) {
      setFormError('O ficheiro excede o limite de 5 MB por anexo.');
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setTitle((cleanName || file.name).slice(0, BLUEPRINT_LIMITS.postTitleMax));
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || title.trim().length < 2) return;
    setFormError(null);
    setPublishing(true);
    try {
      let attachment;
      if (selectedFile) {
        attachment = await uploadClassAttachment(classId, firebaseUser.uid, selectedFile);
      }

      await createPost(classId, firebaseUser.uid, profile.displayName, {
        type,
        priority,
        module: moduleName || 'Geral',
        title,
        body,
        externalUrl,
        externalLabel: externalLabel || (externalUrl ? 'Abrir Site / Recurso' : ''),
        attachment,
        isPinned,
      });

      setTitle('');
      setBody('');
      setExternalUrl('');
      setExternalLabel('');
      setModuleName('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsPinned(false);
      setComposerOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível publicar. Tente novamente.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadAttachment = async (post: ClassPost) => {
    if (!post.attachmentId) return;
    setDownloadError(null);
    setDownloadingPostId(post.id);
    try {
      await downloadClassAttachment(classId, post.attachmentId);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'Não foi possível transferir o ficheiro anexo.'
      );
    } finally {
      setDownloadingPostId(null);
    }
  };

  const handleExportPostText = (post: ClassPost) => {
    const classHeader = [classCode, classTitle].filter(Boolean).join(' — ');
    const lines = [
      classHeader ? `TURMA: ${classHeader}` : '',
      `CATEGORIA: ${TYPE_LABELS[post.type] || 'Comunicado'}`,
      `MÓDULO: ${post.module || 'Geral'}`,
      `DOCENTE: ${post.authorName}`,
      `DATA: ${formatPostDate(post)}`,
      '',
      post.title.toUpperCase(),
      '='.repeat(Math.min(post.title.length, 60)),
      '',
      post.body || '(Sem texto adicional)',
      post.externalUrl ? `\nLINK EXTERNO: ${post.externalUrl}` : '',
      post.attachmentName
        ? `\nFICHEIRO ANEXO: ${post.attachmentName} (${formatFileSize(post.attachmentSize)})`
        : '',
    ].filter((line) => line !== undefined && line !== null);

    const safeName = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    triggerBlobDownload(
      `${safeName || 'conteudo-turma'}.txt`,
      lines.join('\n'),
      'text/plain;charset=utf-8'
    );
  };

  const filteredPosts = posts.filter((p) => {
    if (filterType === 'pinned' && !p.isPinned) return false;
    if (filterType !== 'all' && filterType !== 'pinned' && p.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.body || '').toLowerCase().includes(q) ||
        (p.attachmentName || '').toLowerCase().includes(q) ||
        (p.module || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatPostDate = (post: ClassPost) => {
    const dt = post.createdAt?.toDate?.();
    if (!dt) return 'Agora mesmo';
    return dt.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-5">
      {/* Lecturer Composer */}
      {canAuthor && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          {!composerOpen ? (
            <button
              onClick={() => {
                setFormError(null);
                setComposerOpen(true);
              }}
              className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            >
              <span className="text-sm text-slate-600">
                Enviar comunicado, anexar conteúdo do dispositivo ou partilhar site com a turma...
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0">
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Publicação</span>
              </span>
            </button>
          ) : (
            <form onSubmit={handlePublish} className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Nova Publicação na Turma</h3>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PostType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-600"
                  >
                    <option value="comunicado">Comunicado</option>
                    <option value="conteudo">Conteúdo / Matéria</option>
                    <option value="link">Endereço de Site</option>
                    <option value="aviso_avaliacao">Aviso de Avaliação</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PostPriority)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-600"
                  >
                    <option value="normal">Normal</option>
                    <option value="importante">Importante</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Módulo / Semana</label>
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.moduleMax}
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="ex: Semana 3 · Arquitetura"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.postTitleMax}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Assunto do comunicado ou título da aula..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Texto / Orientações aos Estudantes
                </label>
                <textarea
                  rows={4}
                  maxLength={BLUEPRINT_LIMITS.postBodyMax}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escreva o conteúdo completo, instruções, datas ou resumo da aula..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 resize-y"
                />
              </div>

              {/* Optional Device File Attachment */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Enviar Ficheiro do Telemóvel / Computador (opcional, até 5 MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFilePick}
                  className="hidden"
                  id="post-file-upload"
                />
                {!selectedFile ? (
                  <label
                    htmlFor="post-file-upload"
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50/60 border border-dashed border-slate-300 hover:border-blue-500 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-blue-700" />
                    <span>Escolher ficheiro do dispositivo (PDF, slides, Word, imagem...)</span>
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-600 shrink-0">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-slate-500 hover:text-red-600 p-0.5 cursor-pointer"
                      title="Remover ficheiro"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Endereço de Site / Link Externo (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.urlMax}
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://exemplo.edu/material"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Texto do Botão do Link (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.externalLabelMax}
                    value={externalLabel}
                    onChange={(e) => setExternalLabel(e.target.value)}
                    placeholder="ex: Abrir Portal de Documentação"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Fixar publicação no topo do mural</span>
                </label>

                <button
                  type="submit"
                  disabled={publishing || title.trim().length < 2}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{publishing ? 'A publicar...' : 'Publicar na Turma'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Download Error Banner */}
      {downloadError && (
        <div className="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="text-red-500 hover:text-red-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'comunicado', label: 'Comunicados' },
              { id: 'conteudo', label: 'Conteúdos' },
              { id: 'link', label: 'Sites' },
              { id: 'pinned', label: 'Fixados' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition cursor-pointer ${
                filterType === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar no mural..."
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 w-full sm:w-56"
          />
        </div>
      </div>

      {/* Posts Feed */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Nenhuma publicação encontrada</h3>
          <p className="text-xs text-slate-500">
            {canAuthor
              ? 'Utilize o painel acima para enviar comunicados, anexar conteúdos do dispositivo ou partilhar sites.'
              : 'O docente ainda não publicou comunicados nesta categoria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const commentsVisible = !!openCommentsMap[post.id];
            const isDownloading = downloadingPostId === post.id;

            return (
              <article
                key={post.id}
                className={`bg-white border rounded-xl p-5 space-y-3 ${
                  post.priority === 'urgente'
                    ? 'border-red-300'
                    : post.isPinned
                    ? 'border-blue-300'
                    : 'border-slate-200'
                }`}
              >
                {/* Metadata & Actions Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {TYPE_LABELS[post.type] || 'Comunicado'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{post.module || 'Geral'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px]">{formatPostDate(post)}</span>

                      {post.priority === 'urgente' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Urgente</span>
                          </span>
                        </>
                      )}

                      {post.priority === 'importante' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-amber-700">Importante</span>
                        </>
                      )}

                      {post.isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                            <Pin className="w-3 h-3" />
                            <span>Fixado</span>
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {post.title}
                    </h3>
                  </div>

                  {canAuthor && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => togglePostPin(classId, post.id, !post.isPinned)}
                        title={post.isPinned ? 'Desafixar' : 'Fixar no topo'}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          post.isPinned
                            ? 'text-blue-700 bg-blue-50'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePost(classId, post.id, post.attachmentId)}
                        title="Eliminar publicação"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Body text */}
                {post.body && (
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {post.body}
                  </div>
                )}

                {/* Uploaded File Attachment Card */}
                {post.attachmentId && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {post.attachmentName || 'Ficheiro anexo'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600">
                          {formatFileSize(post.attachmentSize)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownloadAttachment(post)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloading ? 'A transferir...' : 'Transferir Ficheiro'}</span>
                    </button>
                  </div>
                )}

                {/* External Website Link Preview */}
                {post.externalUrl && (
                  <a
                    href={post.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe className="w-4 h-4 text-blue-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                          {post.externalLabel || 'Abrir Site / Material'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          {post.externalUrl}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
                  </a>
                )}

                {/* Footer / Export & Comments Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                  <span>Publicado por {post.authorName}</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleExportPostText(post)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-700 cursor-pointer"
                      title="Exportar publicação em texto para o dispositivo"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar (.TXT)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCommentsMap((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-700 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{commentsVisible ? 'Ocultar comentários' : 'Comentários e dúvidas'}</span>
                    </button>
                  </div>
                </div>

                {commentsVisible && (
                  <PostCommentsSection
                    classId={classId}
                    postId={post.id}
                    isLecturerOwner={isLecturerOwner}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
