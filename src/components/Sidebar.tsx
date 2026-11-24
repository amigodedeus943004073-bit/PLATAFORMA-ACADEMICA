import React from 'react';
import { UniversityClass, Enrollment, AccentColor } from '../types/academic';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  LayoutDashboard,
  Plus,
  LogIn,
  Smartphone,
  LogOut,
  Eye,
  UserCog,
  X,
} from 'lucide-react';

export const ACCENT_DOT: Record<AccentColor, string> = {
  indigo: 'bg-indigo-600',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-600',
  rose: 'bg-rose-600',
  sky: 'bg-sky-600',
  slate: 'bg-slate-600',
};

interface SidebarProps {
  classes: UniversityClass[];
  enrollments: Enrollment[];
  selectedClassId: string | null;
  onSelectOverview: () => void;
  onSelectClass: (classId: string) => void;
  onOpenNewClass: () => void;
  onOpenJoinClass: () => void;
  onOpenInstall: () => void;
  onOpenProfile: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  classes,
  enrollments,
  selectedClassId,
  onSelectOverview,
  onSelectClass,
  onOpenNewClass,
  onOpenJoinClass,
  onOpenInstall,
  onOpenProfile,
  mobileOpen,
  onCloseMobile,
}) => {
  const { profile, effectiveRole, viewAsStudent, setViewAsStudent, signOut } = useAuth();

  const isDocenteAccount = profile?.role === 'docente';

  const navContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-slate-200 w-[264px] select-none">
      {/* Top Brand + Primary Navigation */}
      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">AulaPro</span>
          </div>

          <button
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1">
          <button
            onClick={() => {
              onSelectOverview();
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              selectedClassId === null
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Painel Geral</span>
          </button>

          <button
            onClick={() => {
              onOpenInstall();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-blue-700 shrink-0" />
            <span>Instalar no Telemóvel</span>
          </button>
        </div>

        {/* Classes Taught (Docente) */}
        {isDocenteAccount && (
          <div className="space-y-2 pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500">
                Turmas que leciono ({classes.length})
              </span>
              <button
                onClick={() => {
                  onOpenNewClass();
                  onCloseMobile();
                }}
                title="Criar Nova Turma"
                className="p-1 rounded-md text-blue-700 hover:bg-blue-50 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {classes.length === 0 ? (
              <p className="px-2 text-xs text-slate-400">Sem turmas criadas.</p>
            ) : (
              <div className="space-y-0.5">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      onSelectClass(cls.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                      selectedClassId === cls.id
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        ACCENT_DOT[cls.accentColor] || 'bg-indigo-600'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{cls.title}</div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {cls.code} · {cls.joinCode}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enrolled Classes (Estudante or Docente enrolled elsewhere) */}
        {(effectiveRole === 'estudante' || enrollments.length > 0) && (
          <div className="space-y-2 pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500">
                Turmas Inscritas ({enrollments.length})
              </span>
              <button
                onClick={() => {
                  onOpenJoinClass();
                  onCloseMobile();
                }}
                title="Entrar numa Turma"
                className="p-1 rounded-md text-blue-700 hover:bg-blue-50 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {enrollments.length === 0 ? (
              <button
                onClick={() => {
                  onOpenJoinClass();
                  onCloseMobile();
                }}
                className="w-full px-3 py-2 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium text-left transition cursor-pointer"
              >
                + Inserir código da turma
              </button>
            ) : (
              <div className="space-y-0.5">
                {enrollments.map((enr) => (
                  <button
                    key={enr.classId}
                    onClick={() => {
                      onSelectClass(enr.classId);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                      selectedClassId === enr.classId
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        ACCENT_DOT[enr.accentColor] || 'bg-indigo-600'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{enr.classTitle}</div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {enr.classCode} · {enr.lecturerName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Profile & Role Controls */}
      <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/70">
        {isDocenteAccount && (
          <button
            onClick={() => setViewAsStudent(!viewAsStudent)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
              viewAsStudent
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              <span>{viewAsStudent ? 'Modo: Visão Estudante' : 'Pré-visualizar Estudante'}</span>
            </span>
          </button>
        )}

        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 cursor-pointer"
          >
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.displayName || 'Utilizador'}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {profile?.displayName?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {profile?.displayName || 'Utilizador'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {effectiveRole === 'docente' ? 'Docente Universitário' : 'Estudante'}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenProfile}
              title="Definições de Perfil"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={signOut}
              title="Terminar Sessão"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">{navContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 lg:hidden flex"
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
