import React, { useState, useRef } from 'react';
import {
  ClassResource,
  ResourceCategory,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  createResource,
  deleteResource,
  uploadClassAttachment,
  downloadClassAttachment,
  formatFileSize,
  triggerBlobDownload,
} from '../../services/academicService';
import {
  Globe,
  FileText,
  Video,
  Code2,
  Wrench,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Search,
  Upload,
  Download,
  FileUp,
  X,
  AlertCircle,
} from 'lucide-react';

const CATEGORY_META: Record<
  ResourceCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  site: { label: 'Site / Portal Web', icon: Globe },
  documento: { label: 'Documento / Slides', icon: FileText },
  video: { label: 'Vídeo-aula', icon: Video },
  repositorio: { label: 'Repositório / Código', icon: Code2 },
  ferramenta: { label: 'Ferramenta Online', icon: Wrench },
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ResourcesTabProps {
  classId: string;
  classCode?: string;
  classTitle?: string;
  resources: ClassResource[];
  isLecturerOwner: boolean;
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({
  classId,
  classCode,
  classTitle,
  resources,
  isLecturerOwner,
}) => {
  const { firebaseUser, effectiveRole } = useAuth();
  const canAuthor = isLecturerOwner && effectiveRole === 'docente';

  const [showForm, setShowForm] = useState(false);
  const [sourceMode, setSourceMode] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ResourceCategory>('documento');
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [filterCat, setFilterCat] = useState<'all' | ResourceCategory>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleModeChange = (mode: 'file' | 'link') => {
    setSourceMode(mode);
    setFormError(null);
    if (mode === 'file' && category === 'site') {
      setCategory('documento');
    } else if (mode === 'link' && category === 'documento') {
      setCategory('site');
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size <= 0) {
      setFormError('O ficheiro selecionado está vazio.');
      return;
    }
    if (file.size > BLUEPRINT_LIMITS.attachmentMaxBytes) {
      setFormError('O ficheiro excede o limite de 5 MB. Comprima ou partilhe por link externo.');
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setTitle((cleanName || file.name).slice(0, BLUEPRINT_LIMITS.resourceTitleMax));
    }
    setCategory('documento');
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModuleName('');
    setDescription('');
    setFormError(null);
    setShowForm(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !title.trim()) return;
    setFormError(null);

    if (sourceMode === 'link' && !url.trim()) {
      setFormError('Indique o endereço URL do site ou material.');
      return;
    }
    if (sourceMode === 'file' && !selectedFile) {
      setFormError('Selecione um ficheiro do seu telemóvel ou computador.');
      return;
    }

    setSaving(true);
    try {
      let attachment;
      if (sourceMode === 'file' && selectedFile) {
        attachment = await uploadClassAttachment(classId, firebaseUser.uid, selectedFile);
      }

      await createResource(classId, firebaseUser.uid, {
        title,
        url: sourceMode === 'link' ? url : '',
        category,
        module: moduleName || 'Geral',
        description,
        attachment,
      });

      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível enviar o conteúdo. Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (id: string, link: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleDownloadFile = async (res: ClassResource) => {
    if (!res.attachmentId) return;
    setDownloadError(null);
    setDownloadingId(res.id);
    try {
      await downloadClassAttachment(classId, res.attachmentId);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'Não foi possível transferir este ficheiro.'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportDirectory = () => {
    const headerTitle = [classCode, classTitle].filter(Boolean).join(' — ') || 'Turma Universitária';
    const itemsHtml = resources
      .map((r) => {
        const cat = CATEGORY_META[r.category]?.label || 'Material';
        const isFile = Boolean(r.attachmentId);
        const linkOrFile = isFile
          ? `<div class="meta-line">Ficheiro enviado na plataforma: <strong>${escapeHtml(
              r.attachmentName || r.title
            )}</strong> (${escapeHtml(formatFileSize(r.attachmentSize))})</div>`
          : `<div class="meta-line"><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(
              r.url
            )}</a></div>`;
        return `
          <div class="card">
            <div class="badge">${escapeHtml(cat)} · ${escapeHtml(r.module || 'Geral')}</div>
            <h3>${escapeHtml(r.title)}</h3>
            ${r.description ? `<p>${escapeHtml(r.description)}</p>` : ''}
            ${linkOrFile}
          </div>
        `;
      })
      .join('\n');

    const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Conteúdos — ${escapeHtml(headerTitle)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 820px; margin: 32px auto; padding: 0 18px; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .badge { font-size: 11px; font-weight: 600; color: #1d4ed8; margin-bottom: 6px; }
    h3 { font-size: 16px; margin: 0 0 6px; }
    p { font-size: 13px; color: #334155; margin: 0 0 8px; }
    .meta-line { font-size: 12px; color: #475569; word-break: break-all; }
    a { color: #1d4ed8; }
  </style>
</head>
<body>
  <h1>${escapeHtml(headerTitle)}</h1>
  <div class="sub">Lista de Sites &amp; Conteúdos exportada em ${new Date().toLocaleDateString('pt-PT')} · ${resources.length} itens</div>
  ${itemsHtml}
</body>
</html>`;

    const safeSlug = (classCode || 'conteudos').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerBlobDownload(`conteudos-${safeSlug}.html`, html, 'text/html;charset=utf-8');
  };

  const filtered = resources.filter((r) => {
    if (filterCat !== 'all' && r.category !== filterCat) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        (r.attachmentName || '').toLowerCase().includes(q) ||
        (r.module || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Conteúdos, Ficheiros &amp; Endereços de Sites
          </h2>
          <p className="text-xs text-slate-500">
            Envie materiais diretamente do telemóvel ou computador, partilhe sites e exporte conteúdos para guardar offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {resources.length > 0 && (
            <button
              type="button"
              onClick={handleExportDirectory}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              title="Exportar lista de sites e conteúdos para o dispositivo"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar Lista (.HTML)</span>
            </button>
          )}

          {canAuthor && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setShowForm(!showForm);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showForm ? 'Fechar Formulário' : 'Enviar Conteúdo / Site'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Download error banner */}
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

      {/* Add Resource Form */}
      {canAuthor && showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-fadeIn"
        >
          {/* Segmented Mode Selector: File from Phone/PC vs Website URL */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700">
              Tipo de Envio
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleModeChange('file')}
                className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                  sourceMode === 'file'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar do Telemóvel / Computador</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('link')}
                className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                  sourceMode === 'link'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Endereço de Site / Link</span>
              </button>
            </div>
          </div>

          {sourceMode === 'file' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ficheiro do Telemóvel ou Computador (PDF, Word, Slides, Imagem, ZIP — máx. 5 MB) *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFilePick}
                className="hidden"
                id="resource-file-upload"
              />
              {!selectedFile ? (
                <label
                  htmlFor="resource-file-upload"
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl text-center cursor-pointer transition"
                >
                  <FileUp className="w-6 h-6 text-blue-700" />
                  <span className="text-xs font-semibold text-slate-800">
                    Toque ou clique para escolher um ficheiro no seu dispositivo
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Suporta PDF, DOCX, PPTX, XLSX, imagens, áudio, texto ou ZIP até 5 MB
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                    title="Remover ficheiro"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço URL do Site *
              </label>
              <input
                type="text"
                required={sourceMode === 'link'}
                maxLength={BLUEPRINT_LIMITS.urlMax}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600"
              />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título do Conteúdo ou Site *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.resourceTitleMax}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Apontamentos Semana 3 / Portal IEEE"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Módulo / Unidade Temática
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.moduleMax}
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="ex: Módulo 2 · Bases de Dados"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-600"
              >
                <option value="documento">Documento / Slides / PDF</option>
                <option value="site">Site / Portal Web</option>
                <option value="video">Vídeo-aula / Gravação</option>
                <option value="repositorio">Repositório de Código</option>
                <option value="ferramenta">Ferramenta Online / Simulador</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição / Nota para os Estudantes
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.resourceDescriptionMax}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve explicação sobre este conteúdo..."
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

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                !title.trim() ||
                (sourceMode === 'link' ? !url.trim() : !selectedFile)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? sourceMode === 'file'
                    ? 'A enviar ficheiro...'
                    : 'A guardar...'
                  : sourceMode === 'file'
                  ? 'Enviar Conteúdo'
                  : 'Guardar Endereço'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition cursor-pointer ${
              filterCat === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Todos
          </button>
          {(Object.keys(CATEGORY_META) as ResourceCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition cursor-pointer ${
                filterCat === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {CATEGORY_META[cat].label.split(' / ')[0]}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar sites e ficheiros..."
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 w-full sm:w-56"
          />
        </div>
      </div>

      {/* Resources List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Globe className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Sem sites ou conteúdos adicionados</h3>
          <p className="text-xs text-slate-500">
            Os ficheiros enviados do dispositivo e endereços web recomendados aparecerão listados aqui.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {filtered.map((res) => {
            const meta = CATEGORY_META[res.category] || CATEGORY_META.site;
            const IconComp = meta.icon;
            const hasAttachment = Boolean(res.attachmentId);
            const isDownloading = downloadingId === res.id;

            return (
              <div
                key={res.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{meta.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{res.module || 'Geral'}</span>
                      {hasAttachment && res.attachmentSize ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[11px] text-blue-700 font-semibold">
                            {formatFileSize(res.attachmentSize)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{res.title}</h4>
                    {res.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{res.description}</p>
                    )}
                    {hasAttachment ? (
                      <div className="text-[11px] font-mono text-slate-600 truncate">
                        Ficheiro: {res.attachmentName}
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-blue-700 truncate">{res.url}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {hasAttachment ? (
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownloadFile(res)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      title="Exportar / transferir ficheiro para o telemóvel ou computador"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloading ? 'A transferir...' : 'Exportar / Transferir'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopy(res.id, res.url)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs text-slate-700 cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedId === res.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === res.id ? 'Copiado' : 'Copiar'}</span>
                      </button>

                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition"
                      >
                        <span>Abrir</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}

                  {canAuthor && (
                    <button
                      type="button"
                      onClick={() => deleteResource(classId, res.id, res.attachmentId)}
                      title="Eliminar recurso"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
