import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Share,
  Check,
  Copy,
  X,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'qrcode'>('android');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res) onClose();
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=ffffff&color=0f172a&margin=8`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="AulaPro"
              className="w-11 h-11 rounded-xl border border-slate-200 object-cover"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900">Instalar AulaPro no Telemóvel</h2>
              <p className="text-xs text-slate-500">Aplicação PWA para Android e iPhone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isInstalled && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>A plataforma já se encontra instalada em modo autónomo neste dispositivo.</span>
          </div>
        )}

        {isInstallable && !isInstalled && (
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Instalar Agora (1 Toque)</span>
          </button>
        )}

        {/* Segmented tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Android
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            iPhone (iOS)
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'qrcode'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Código QR
          </button>
        </div>

        {activeTab === 'android' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <p>
                Abra esta página no <strong>Google Chrome</strong> ou <strong>Samsung Internet</strong> do seu telemóvel Android.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <p>
                Toque no menu de <strong>3 pontos (⋮)</strong> no canto superior direito.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <p>
                Selecione <strong>"Instalar aplicação"</strong> ou <strong>"Adicionar ao ecrã principal"</strong>.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ios' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <p>
                Abra este endereço no navegador <strong>Safari</strong> do seu iPhone ou iPad.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <p className="flex items-center gap-1.5 flex-wrap">
                Toque no ícone de <strong>Partilha</strong>
                <span className="inline-flex p-1 bg-white border border-slate-200 rounded">
                  <Share className="w-3 h-3 text-slate-700" />
                </span>
                na barra inferior.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <p>
                Selecione <strong>"Adicionar ao Ecrã Principal"</strong> e confirme.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'qrcode' && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <span>Aponte a câmara do telemóvel para abrir diretamente:</span>
            </div>
            <div className="p-2 bg-white border border-slate-200 rounded-xl">
              <img
                src={qrCodeUrl}
                alt="Código QR AulaPro"
                className="w-44 h-44 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <input
            type="text"
            readOnly
            value={currentUrl}
            aria-label="Endereço da plataforma"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 outline-none truncate"
          />
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
