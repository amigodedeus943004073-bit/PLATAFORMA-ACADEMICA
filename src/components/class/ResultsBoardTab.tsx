import React, { useState, useEffect, useRef } from 'react';
import {
  ResultPublication,
  ResultFormat,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { useAuth } from '../../context/AuthContext';
import {
  uploadClassAttachment,
  compressImageFile,
  createResultPublication,
  deleteResultPublication,
  fetchClassAttachmentBlob,
  downloadClassAttachment,
  formatFileSize,
} from '../../services/academicService';
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  ZoomIn,
  RefreshCw,
  Eye,
  Award,
  Calendar,
} from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [camError, setCamError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      setStarting(true);
      setCamError(null);
      stopStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCamError(
          'A câmara direta não está disponível neste navegador. Utilize o botão "Câmara do Telemóvel / Galeria".'
        );
        setStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setCamError(
            'Não foi possível abrir a câmara. Verifique as permissões do navegador ou use "Câmara do Telemóvel / Galeria".'
          );
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const file = new File([blob], `resultados-${stamp}.jpg`, { type: 'image/jpeg' });
        stopStream();
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.88
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Camera className="w-4 h-4 text-sky-400" />
            <span>Tirar Foto da Pauta / Resultados</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
          {camError ? (
            <div className="p-6 text-center space-y-3 text-slate-200 max-w-sm">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs leading-relaxed">{camError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-contain"
              />
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
                  A iniciar câmara...
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-900 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Alternar Câmara</span>
          </button>

          <button
            type="button"
            disabled={!!camError || starting}
            onClick={handleTakeSnapshot}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40"
          >
            <Camera className="w-4 h-4" />
            <span>Capturar Foto</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResultCardProps {
  classId: string;
  item: ResultPublication;
  canAuthor: boolean;
  onZoomImage: (url: string, title: string) => void;
  onPreviewPdf: (url: string, title: string, fileName: string) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({
  classId,
  item,
  canAuthor,
  onZoomImage,
  onPreviewPdf,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (item.format === 'foto') {
      setLoadingPreview(true);
      fetchClassAttachmentBlob(classId, item.attachmentId)
        .then(({ blob }) => {
          if (!active) return;
          createdUrl = URL.createObjectURL(blob);
          setPreviewUrl(createdUrl);
        })
        .catch(() => {
          if (active) setErr('Não foi possível carregar a pré-visualização da imagem.');
        })
        .finally(() => {
          if (active) setLoadingPreview(false);
        });
    }

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [classId, item.attachmentId, item.format]);

  const handleDownload = async () => {
    setErr(null);
    setDownloading(true);
    try {
      await downloadClassAttachment(classId, item.attachmentId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao transferir o ficheiro.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPdfModal = async () => {
    setErr(null);
    setDownloading(true);
    try {
      const { blob, fileName } = await fetchClassAttachmentBlob(classId, item.attachmentId);
      const url = URL.createObjectURL(blob);
      onPreviewPdf(url, item.title, fileName);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao abrir pré-visualização do PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  item.format === 'foto' ? 'text-blue-700' : 'text-red-700'
                }`}
              >
                {item.format === 'foto' ? (
                  <ImageIcon className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>{item.format === 'foto' ? 'Fotografia dos Resultados' : 'Lista Oficial em PDF'}</span>
              </span>
              {item.assessmentTitle && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-700">{item.assessmentTitle}</span>
                </>
              )}
              {item.publishedDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="w-3 h-3" />
                    {item.publishedDate}
                  </span>
                </>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h3>
          </div>

          {canAuthor && (
            <button
              type="button"
              onClick={() => deleteResultPublication(classId, item.id, item.attachmentId)}
              title="Remover publicação de resultados"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {item.notes && (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{item.notes}</p>
        )}

        {/* Photo Inline Preview or PDF Box */}
        {item.format === 'foto' ? (
          <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {loadingPreview ? (
              <div className="h-56 flex items-center justify-center text-xs text-slate-500">
                A carregar fotografia dos resultados...
              </div>
            ) : previewUrl ? (
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt={item.title}
                  onClick={() => onZoomImage(previewUrl, item.title)}
                  className="w-full max-h-[460px] object-contain bg-slate-950/5 cursor-zoom-in"
                />
                <button
                  type="button"
                  onClick={() => onZoomImage(previewUrl, item.title)}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Ampliar Foto</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50/60 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{item.attachmentName}</div>
                <div className="text-[11px] font-mono text-slate-600">
                  Documento PDF · {formatFileSize(item.attachmentSize)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={downloading}
                onClick={handleOpenPdfModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar PDF</span>
              </button>
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'A transferir...' : 'Transferir PDF'}</span>
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
          <span>Publicado por {item.authorName}</span>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{item.format === 'foto' ? 'Guardar Foto no Dispositivo' : 'Guardar PDF'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

interface ResultsBoardTabProps {
  classId: string;
  results: ResultPublication[];
  isLecturerOwner: boolean;
}

export const ResultsBoardTab: React.FC<ResultsBoardTabProps> = ({
  classId,
  results,
  isLecturerOwner,
}) => {
  const { firebaseUser, profile, effectiveRole } = useAuth();
  const canAuthor = isLecturerOwner && effectiveRole === 'docente';

  const [composerOpen, setComposerOpen] = useState(false);
  const [format, setFormat] = useState<ResultFormat>('foto');
  const [title, setTitle] = useState('');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [publishedDate, setPublishedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const mobileCamInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox / PDF preview modals
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string; fileName: string } | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  const setPreparedFile = async (rawFile: File, targetFormat: ResultFormat) => {
    setFormError(null);
    if (rawFile.size <= 0) {
      setFormError('O ficheiro selecionado está vazio.');
      return;
    }

    let finalFile = rawFile;
    if (targetFormat === 'foto') {
      finalFile = await compressImageFile(rawFile);
    }

    if (finalFile.size > BLUEPRINT_LIMITS.attachmentMaxBytes) {
      setFormError('O ficheiro excede o limite de 5 MB. Reduza o tamanho ou divida o PDF.');
      return;
    }

    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    if (targetFormat === 'foto') {
      setPreviewObjectUrl(URL.createObjectURL(finalFile));
    } else {
      setPreviewObjectUrl(null);
    }

    setFormat(targetFormat);
    setSelectedFile(finalFile);
    if (!title.trim()) {
      const base = finalFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setTitle((base ? `Resultados — ${base}` : 'Pauta de Resultados').slice(0, BLUEPRINT_LIMITS.resultTitleMax));
    }
  };

  const handleResetComposer = () => {
    setTitle('');
    setAssessmentTitle('');
    setNotes('');
    setSelectedFile(null);
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }
    if (mobileCamInputRef.current) mobileCamInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';
    setFormError(null);
    setComposerOpen(false);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !selectedFile || title.trim().length < 2) return;
    setFormError(null);
    setSuccessNotice(null);
    setPublishing(true);

    try {
      const attachment = await uploadClassAttachment(classId, firebaseUser.uid, selectedFile);
      await createResultPublication(classId, firebaseUser.uid, profile.displayName, {
        title,
        assessmentTitle,
        format,
        notes,
        publishedDate,
        attachment,
      });
      handleResetComposer();
      setSuccessNotice('Resultados publicados no mural oficial da turma!');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível publicar os resultados.'
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Mural de Publicação dos Resultados
          </h2>
          <p className="text-xs text-slate-500">
            Tire fotografia da pauta na hora ou publique a lista oficial de notas em PDF ou imagem para todos os estudantes da turma.
          </p>
        </div>

        {canAuthor && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setSuccessNotice(null);
              setComposerOpen(!composerOpen);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Camera className="w-4 h-4" />
            <span>{composerOpen ? 'Fechar Painel' : 'Publicar Resultados (Foto / PDF)'}</span>
          </button>
        )}
      </div>

      {successNotice && (
        <div className="flex items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lecturer Publish Composer */}
      {canAuthor && composerOpen && (
        <form
          onSubmit={handlePublish}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-fadeIn"
        >
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700">
              1. Escolha como publicar os resultados *
            </span>

            {/* Hidden inputs for native mobile camera, photo gallery, and PDF picker */}
            <input
              ref={mobileCamInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreparedFile(f, 'foto');
              }}
              className="hidden"
              id="results-mobile-camera"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreparedFile(f, 'foto');
              }}
              className="hidden"
              id="results-gallery-image"
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreparedFile(f, 'pdf');
              }}
              className="hidden"
              id="results-pdf-upload"
            />

            <div className="grid sm:grid-cols-3 gap-2.5">
              {/* Live In-App Camera */}
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-blue-800 transition cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs font-bold">Tirar Foto (Câmara)</span>
                <span className="text-[11px] text-blue-700/80">Fotografar pauta agora</span>
              </button>

              {/* Phone Native Camera / Gallery */}
              <label
                htmlFor="results-gallery-image"
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 transition cursor-pointer"
              >
                <ImageIcon className="w-5 h-5 text-slate-700" />
                <span className="text-xs font-bold">Foto do Telemóvel / PC</span>
                <span className="text-[11px] text-slate-500">Galeria ou câmara nativa</span>
              </label>

              {/* PDF List Upload */}
              <label
                htmlFor="results-pdf-upload"
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-red-50/70 hover:bg-red-100/60 border border-red-200 rounded-xl text-red-800 transition cursor-pointer"
              >
                <FileText className="w-5 h-5 text-red-700" />
                <span className="text-xs font-bold">Publicar Lista em PDF</span>
                <span className="text-[11px] text-red-700/80">Ficheiro .PDF até 5 MB</span>
              </label>
            </div>

            {/* Extra direct mobile camera trigger link */}
            <div className="text-[11px] text-slate-500">
              No telemóvel, também pode{' '}
              <label
                htmlFor="results-mobile-camera"
                className="text-blue-700 font-semibold underline cursor-pointer"
              >
                abrir diretamente a câmara do sistema
              </label>
              .
            </div>
          </div>

          {/* Selected Preview Box */}
          {selectedFile && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {format === 'foto' ? (
                    <ImageIcon className="w-4 h-4 text-blue-700 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-700 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    ({formatFileSize(selectedFile.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (previewObjectUrl) {
                      URL.revokeObjectURL(previewObjectUrl);
                      setPreviewObjectUrl(null);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {previewObjectUrl && (
                <img
                  src={previewObjectUrl}
                  alt="Pré-visualização da foto"
                  className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-white"
                />
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título da Publicação *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.resultTitleMax}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Resultados Finais — 1.ª Frequência"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Publicação
              </label>
              <input
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prova / Avaliação Associada (opcional)
              </label>
              <input
                type="text"
                maxLength={120}
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                placeholder="ex: Exame Época Normal"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nota / Informações de Revisão de Prova (opcional)
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.resultNotesMax}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: Revisão de provas na quinta-feira às 14h na sala A2"
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
              onClick={handleResetComposer}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={publishing || !selectedFile || title.trim().length < 2}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{publishing ? 'A publicar resultados...' : 'Publicar no Mural'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Results Feed */}
      {results.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Award className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            Nenhum resultado publicado no mural ainda
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {canAuthor
              ? 'Utilize o botão acima para fotografar a pauta ou publicar a lista de notas em PDF ou imagem.'
              : 'Quando o docente publicar as pautas das provas por fotografia ou PDF, aparecerão aqui para consulta e transferência.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((item) => (
            <ResultCard
              key={item.id}
              classId={classId}
              item={item}
              canAuthor={canAuthor}
              onZoomImage={(url, imgTitle) => setZoomedImage({ url, title: imgTitle })}
              onPreviewPdf={(url, pdfTitle, fileName) =>
                setPdfPreview({ url, title: pdfTitle, fileName })
              }
            />
          ))}
        </div>
      )}

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => setPreparedFile(file, 'foto')}
      />

      {/* Photo Lightbox Modal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full max-h-[92vh] flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-700"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <span className="text-xs sm:text-sm font-bold truncate">{zoomedImage.title}</span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-black">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                className="max-w-full max-h-[82vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfPreview && (
        <div
          onClick={() => {
            URL.revokeObjectURL(pdfPreview.url);
            setPdfPreview(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full h-[88vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">{pdfPreview.title}</h4>
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  {pdfPreview.fileName}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={pdfPreview.url}
                  download={pdfPreview.fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Transferir</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(pdfPreview.url);
                    setPdfPreview(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfPreview.url}
              title={pdfPreview.title}
              className="flex-1 w-full border-0 bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};
