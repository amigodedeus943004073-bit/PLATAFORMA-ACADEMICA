import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentPhotoPicker } from './StudentAvatar';
import {
  GraduationCap,
  Megaphone,
  Globe,
  BookOpen,
  ClipboardCheck,
  Smartphone,
  ArrowRight,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

interface LoginViewProps {
  onOpenInstall: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenInstall }) => {
  const { signInWithGoogle, authError } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [arrivedFromLink, setArrivedFromLink] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get('convite') || params.get('code') || '').trim().toUpperCase();
    const fromStorage = (window.localStorage.getItem('aulapro_pending_invite') || '').trim().toUpperCase();
    if (fromUrl) {
      setInviteCode(fromUrl);
      setArrivedFromLink(true);
      window.localStorage.setItem('aulapro_pending_invite', fromUrl);
    } else if (fromStorage) {
      setInviteCode(fromStorage);
      setArrivedFromLink(true);
    }
  }, []);

  const handleLecturerLogin = () => {
    setLocalError('');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('aulapro_pending_role', 'docente');
      window.localStorage.removeItem('aulapro_pending_invite');
      window.localStorage.removeItem('aulapro_pending_name');
      window.localStorage.removeItem('aulapro_pending_student_code');
      window.localStorage.removeItem('aulapro_pending_photo');
    }
    signInWithGoogle();
  };

  const handleStudentInviteLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    const cleanCode = inviteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanName = fullName.trim();
    const cleanNumber = studentNumber.trim();

    if (cleanCode.length < 4) {
      setLocalError('Introduza o código de registo da turma (mínimo 4 caracteres).');
      return;
    }
    if (cleanName.length < 3) {
      setLocalError('Introduza o seu nome completo antes de entrar na turma.');
      return;
    }
    if (!cleanNumber) {
      setLocalError('Introduza o seu número de estudante antes de entrar na turma.');
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('aulapro_pending_role', 'estudante');
      window.localStorage.setItem('aulapro_pending_invite', cleanCode);
      window.localStorage.setItem('aulapro_pending_name', cleanName);
      window.localStorage.setItem('aulapro_pending_student_code', cleanNumber);
      if (photoUrl) {
        window.localStorage.setItem('aulapro_pending_photo', photoUrl);
      } else {
        window.localStorage.removeItem('aulapro_pending_photo');
      }
    }
    signInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">AulaPro</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenInstall}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition cursor-pointer whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-700" />
            <span>Instalar no Telemóvel</span>
          </button>
          <button
            onClick={handleLecturerLogin}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer whitespace-nowrap"
          >
            <span>Entrar com Gmail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 lg:py-14 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-6">
          {arrivedFromLink ? (
            <>
              <div className="text-xs font-semibold text-blue-700 tracking-wide">
                Acesso Direto à Turma · Código {inviteCode}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight text-balance">
                Identifique-se para aceder à sua turma.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Antes de ser direcionado para a sala da disciplina, coloque o seu <strong>Nome Completo</strong> e{' '}
                <strong>Número de Estudante</strong> e confirme a sua entrada com a conta Google.
              </p>

              {(authError || localError) && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{localError || authError}</span>
                </div>
              )}

              <form
                onSubmit={handleStudentInviteLogin}
                className="p-5 bg-white border-2 border-blue-200 rounded-2xl space-y-3.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="text-xs font-bold text-slate-900">
                      Dados do Estudante para Entrada na Turma
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded font-mono text-xs font-bold">
                    {inviteCode}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: Maria João Fernandes Silva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de Estudante *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      placeholder="ex: 20260418"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código da Turma *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono uppercase tracking-wider outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <StudentPhotoPicker
                  compact
                  photoUrl={photoUrl}
                  onChange={setPhotoUrl}
                  label="Fotografia do Estudante (Opcional)"
                  helperText="Opcional — ajuda o docente a identificá-lo na pauta e no bate-papo."
                />

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition cursor-pointer shadow-sm"
                >
                  <span>Confirmar Dados e Entrar na Turma (Google)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={handleLecturerLogin}
                  className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
                >
                  Sou o docente · Entrar com Gmail
                </button>
                <button
                  type="button"
                  onClick={onOpenInstall}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Instalar no telemóvel</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-blue-700 tracking-wide">
                Plataforma Académica Universitária · Docentes (Gmail) &amp; Estudantes
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight text-balance">
                Todas as suas turmas, comunicados, conteúdos e portais num só sistema.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Entre como docente usando a sua conta <strong>Gmail</strong>, crie a turma e partilhe logo o{' '}
                <strong>endereço direto</strong> gerado automaticamente. Os estudantes clicam no link, colocam o nome
                completo e número e entram na turma.
              </p>

              {(authError || localError) && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{localError || authError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleLecturerLogin}
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-sm"
                >
                  <span>Entrar como Docente (Gmail)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenInstall}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-medium text-sm rounded-xl transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-slate-600" />
                  <span>Instalar App (PWA)</span>
                </button>
              </div>

              {/* Student Invite Entry Card */}
              <form
                onSubmit={handleStudentInviteLogin}
                className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">
                    É Estudante? Entre com o Código da Turma
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    maxLength={16}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Código (ex: A7K9P2)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase tracking-wider outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome completo *"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    maxLength={40}
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="N.º Estudante *"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-600"
                  />
                </div>
                <StudentPhotoPicker
                  compact
                  photoUrl={photoUrl}
                  onChange={setPhotoUrl}
                  label="Fotografia do Estudante (Opcional)"
                  helperText="Pode enviar uma foto agora ou deixar em branco."
                />
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <span>Entrar na Turma como Estudante (Google)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Capabilities Grid */}
        <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <Megaphone className="w-5 h-5 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900">Comunicados Prioritários</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Envie avisos urgentes, alterações de sala ou notas informativas fixadas no mural de cada turma.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Diretório de Sites &amp; Links</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Publique endereços web, portais de investigação, repositórios e ferramentas organizados por módulo.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Conteúdos por Unidade</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Estruture apontamentos, guias de laboratório e materiais de aula com fórum de dúvidas integrado.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Trabalhos, Pautas &amp; Presenças</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Receba entregas por link, atribua notas numéricas com feedback e registe presenças dos estudantes.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>AulaPro · Gestão de Turmas e Ensino Superior</span>
        <span>Sincronização segura via Google Auth &amp; Firestore</span>
      </footer>
    </div>
  );
};
