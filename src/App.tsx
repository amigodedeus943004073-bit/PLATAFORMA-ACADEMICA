/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { ClassWorkspace } from './components/class/ClassWorkspace';
import { ClassFormModal, JoinClassModal, ProfileModal } from './components/Modals';
import { InstallModal } from './components/InstallModal';
import { UniversityClass, Enrollment } from './types/academic';
import {
  subscribeLecturerClasses,
  subscribeStudentEnrollments,
  enrollStudentByCode,
} from './services/academicService';
import { Menu, Plus, Smartphone, LogIn } from 'lucide-react';

const AcademicShell: React.FC = () => {
  const { firebaseUser, profile, loading, effectiveRole, syncStudentIdentity } = useAuth();

  const [classes, setClasses] = useState<UniversityClass[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Modals & Mobile Drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<UniversityClass | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState('');
  const [autoInviteClassId, setAutoInviteClassId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  // Detect invite link (?convite=CODE) or complete pending student registration from LoginView
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlCode = (params.get('convite') || params.get('code') || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (urlCode) {
      window.localStorage.setItem('aulapro_pending_invite', urlCode);
      params.delete('convite');
      params.delete('code');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }

    if (!firebaseUser || !profile) return;

    const storedCode = (window.localStorage.getItem('aulapro_pending_invite') || '').trim().toUpperCase();
    const storedName = (window.localStorage.getItem('aulapro_pending_name') || '').trim();
    const storedStudentCode = (window.localStorage.getItem('aulapro_pending_student_code') || '').trim();
    const storedPhoto = (window.localStorage.getItem('aulapro_pending_photo') || '').trim();

    if (!storedCode) return;

    window.localStorage.removeItem('aulapro_pending_invite');
    window.localStorage.removeItem('aulapro_pending_name');
    window.localStorage.removeItem('aulapro_pending_student_code');
    window.localStorage.removeItem('aulapro_pending_photo');

    if (storedName.length >= 3 && storedStudentCode.length >= 1) {
      (async () => {
        try {
          const res = await enrollStudentByCode(
            storedCode,
            firebaseUser.uid,
            storedName,
            storedStudentCode,
            storedPhoto || undefined
          );
          if (res.success && res.classId) {
            await syncStudentIdentity(storedName, storedStudentCode, storedPhoto || undefined);
            setSelectedClassId(res.classId);
          } else {
            setPendingInviteCode(storedCode);
            setJoinModalOpen(true);
          }
        } catch {
          setPendingInviteCode(storedCode);
          setJoinModalOpen(true);
        }
      })();
    } else {
      setPendingInviteCode(storedCode);
      setJoinModalOpen(true);
    }
  }, [firebaseUser, profile, syncStudentIdentity]);

  useEffect(() => {
    if (!firebaseUser) {
      setClasses([]);
      setEnrollments([]);
      return;
    }

    const unsubLect = subscribeLecturerClasses(firebaseUser.uid, setClasses);
    const unsubEnr = subscribeStudentEnrollments(firebaseUser.uid, setEnrollments);

    return () => {
      unsubLect();
      unsubEnr();
    };
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">A carregar plataforma académica...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <>
        <LoginView onOpenInstall={() => setInstallModalOpen(true)} />
        <InstallModal isOpen={installModalOpen} onClose={() => setInstallModalOpen(false)} />
      </>
    );
  }

  const activeClassObj =
    classes.find((c) => c.id === selectedClassId) ||
    enrollments.find((e) => e.classId === selectedClassId);

  const activeBreadcrumb = activeClassObj
    ? 'title' in activeClassObj
      ? `${activeClassObj.code} · ${activeClassObj.title}`
      : `${activeClassObj.classCode} · ${activeClassObj.classTitle}`
    : 'Painel Geral';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        classes={classes}
        enrollments={enrollments}
        selectedClassId={selectedClassId}
        onSelectOverview={() => setSelectedClassId(null)}
        onSelectClass={(id) => setSelectedClassId(id)}
        onOpenNewClass={() => {
          setEditingClass(null);
          setClassFormOpen(true);
        }}
        onOpenJoinClass={() => setJoinModalOpen(true)}
        onOpenInstall={() => setInstallModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb Left + 1-2 Actions Right */}
        <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
              <button
                onClick={() => setSelectedClassId(null)}
                className="hover:text-slate-900 font-medium cursor-pointer shrink-0"
              >
                AulaPro
              </button>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{activeBreadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setInstallModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-700" />
              <span>Instalar App</span>
            </button>

            {effectiveRole === 'docente' && profile?.role === 'docente' ? (
              <button
                onClick={() => {
                  setEditingClass(null);
                  setClassFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Turma</span>
              </button>
            ) : (
              <button
                onClick={() => setJoinModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar em Turma</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto">
          {selectedClassId ? (
            <ClassWorkspace
              classId={selectedClassId}
              autoOpenInvite={autoInviteClassId === selectedClassId}
              onClearAutoInvite={() => setAutoInviteClassId(null)}
              onBackOverview={() => setSelectedClassId(null)}
              onEditClass={(cls) => {
                setEditingClass(cls);
                setClassFormOpen(true);
              }}
            />
          ) : (
            <DashboardOverview
              classes={classes}
              enrollments={enrollments}
              onSelectClass={(id) => setSelectedClassId(id)}
              onOpenNewClass={() => {
                setEditingClass(null);
                setClassFormOpen(true);
              }}
              onOpenJoinClass={() => setJoinModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ClassFormModal
        isOpen={classFormOpen}
        onClose={() => {
          setClassFormOpen(false);
          setEditingClass(null);
        }}
        editingClass={editingClass}
        onSuccess={(newId) => {
          setAutoInviteClassId(newId);
          setSelectedClassId(newId);
        }}
      />

      <JoinClassModal
        isOpen={joinModalOpen}
        initialCode={pendingInviteCode}
        onClose={() => {
          setJoinModalOpen(false);
          setPendingInviteCode('');
        }}
        onJoined={(id) => {
          setPendingInviteCode('');
          setSelectedClassId(id);
        }}
      />

      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      <InstallModal isOpen={installModalOpen} onClose={() => setInstallModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AcademicShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
