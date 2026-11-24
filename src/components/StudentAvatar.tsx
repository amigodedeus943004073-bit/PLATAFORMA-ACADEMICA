import React, { useRef, useState } from 'react';
import { Camera, Trash2, Upload, User } from 'lucide-react';
import { compressStudentPhotoDataUrl } from '../services/academicService';

interface StudentAvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tone?: 'student' | 'lecturer';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
};

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name,
  photoUrl,
  size = 'sm',
  tone = 'student',
}) => {
  const sizeCls = SIZE_CLASSES[size];
  const fallbackCls =
    tone === 'lecturer'
      ? 'bg-blue-700 text-white border-blue-800'
      : 'bg-slate-200 text-slate-700 border-slate-300';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeCls} rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      className={`${sizeCls} ${fallbackCls} rounded-full border font-bold flex items-center justify-center shrink-0 select-none`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

interface StudentPhotoPickerProps {
  photoUrl: string;
  onChange: (nextPhotoUrl: string) => void;
  label?: string;
  helperText?: string;
  compact?: boolean;
}

export const StudentPhotoPicker: React.FC<StudentPhotoPickerProps> = ({
  photoUrl,
  onChange,
  label = 'Fotografia do Estudante (Opcional)',
  helperText = 'Pode tirar uma foto ou escolher da galeria. Campo opcional.',
  compact = false,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      const compressed = await compressStudentPhotoDataUrl(file);
      onChange(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar fotografia.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <div
        className={`flex flex-wrap items-center gap-3 ${
          compact ? 'p-2.5' : 'p-3'
        } bg-slate-50 border border-slate-200 rounded-xl`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Pré-visualização da fotografia"
            className="w-12 h-12 rounded-full object-cover border border-slate-300 shrink-0 bg-white"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
            <User className="w-5 h-5" />
          </div>
        )}

        <div className="flex-1 min-w-[160px] space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={processing}
              onClick={() => cameraRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-blue-700" />
              <span>{processing ? 'A processar...' : 'Tirar Foto'}</span>
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Escolher Foto</span>
            </button>
            {photoUrl && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  onChange('');
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 text-[11px] font-medium rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remover</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{helperText}</p>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
};
