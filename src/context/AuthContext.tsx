import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, BLUEPRINT_LIMITS } from '../types/academic';

const LECTURER_DEFAULT_EMAIL = 'amigodeDeus943004073@gmail.com';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  effectiveRole: UserRole;
  viewAsStudent: boolean;
  setViewAsStudent: (v: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: {
    displayName: string;
    role: UserRole;
    department?: string;
    studentCode?: string;
    photoUrl?: string;
  }) => Promise<void>;
  syncStudentIdentity: (
    displayName: string,
    studentCode: string,
    photoUrl?: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [viewAsStudent, setViewAsStudent] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userPath = `users/${user.uid}`;
      const userRef = doc(db, 'users', user.uid);

      try {
        const snap = await getDoc(userRef);
        const pendingRole =
          typeof window !== 'undefined' ? window.localStorage.getItem('aulapro_pending_role') : null;
        const pendingInvite =
          typeof window !== 'undefined' ? window.localStorage.getItem('aulapro_pending_invite') : null;
        const pendingName =
          typeof window !== 'undefined' ? window.localStorage.getItem('aulapro_pending_name') : null;
        const pendingStudentCode =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('aulapro_pending_student_code')
            : null;
        const pendingPhoto =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('aulapro_pending_photo')
            : null;

        if (!snap.exists()) {
          const isPrimaryLecturer =
            user.email?.toLowerCase() === LECTURER_DEFAULT_EMAIL.toLowerCase();
          const defaultRole: UserRole =
            !isPrimaryLecturer && (pendingRole === 'estudante' || Boolean(pendingInvite))
              ? 'estudante'
              : 'docente';

          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('aulapro_pending_role');
          }

          const cleanName = (
            (defaultRole === 'estudante' && pendingName?.trim()) ||
            user.displayName ||
            user.email?.split('@')[0] ||
            (defaultRole === 'estudante' ? 'Estudante' : 'Docente')
          ).slice(0, BLUEPRINT_LIMITS.displayNameMax);
          const cleanEmail = (user.email || '').slice(0, 160);
          const cleanStudentCode =
            defaultRole === 'estudante' && pendingStudentCode
              ? pendingStudentCode.trim().slice(0, BLUEPRINT_LIMITS.studentCodeMax)
              : '';
          const cleanPhotoUrl =
            defaultRole === 'estudante' &&
            pendingPhoto &&
            pendingPhoto.length <= BLUEPRINT_LIMITS.photoMax
              ? pendingPhoto
              : '';

          await setDoc(userRef, {
            uid: user.uid,
            displayName: cleanName,
            email: cleanEmail,
            role: defaultRole,
            department: defaultRole === 'docente' ? 'Docência Universitária' : '',
            studentCode: cleanStudentCode,
            ...(cleanPhotoUrl ? { photoUrl: cleanPhotoUrl } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (pendingRole === 'docente' && snap.data()?.role !== 'docente') {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('aulapro_pending_role');
          }
          await updateDoc(userRef, {
            role: 'docente',
            updatedAt: serverTimestamp(),
          });
        } else if (typeof window !== 'undefined' && pendingRole) {
          window.localStorage.removeItem('aulapro_pending_role');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }

      unsubProfile = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, userPath);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha ao iniciar sessão com a conta Google.';
      setAuthError(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setViewAsStudent(false);
    await firebaseSignOut(auth);
  }, []);

  const updateUserProfile = useCallback(
    async (data: {
      displayName: string;
      role: UserRole;
      department?: string;
      studentCode?: string;
      photoUrl?: string;
    }) => {
      if (!firebaseUser) return;
      const userPath = `users/${firebaseUser.uid}`;
      const userRef = doc(db, 'users', firebaseUser.uid);

      const cleanPayload: Record<string, unknown> = {
        displayName: data.displayName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
        role: data.role,
        department: (data.department || '').trim().slice(0, BLUEPRINT_LIMITS.departmentMax),
        studentCode: (data.studentCode || '').trim().slice(0, BLUEPRINT_LIMITS.studentCodeMax),
        updatedAt: serverTimestamp(),
      };
      if (data.photoUrl !== undefined) {
        cleanPayload.photoUrl =
          data.photoUrl.length <= BLUEPRINT_LIMITS.photoMax ? data.photoUrl : '';
      }

      try {
        await updateDoc(userRef, cleanPayload);
        if (data.role === 'estudante') {
          setViewAsStudent(false);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      }
    },
    [firebaseUser]
  );

  const syncStudentIdentity = useCallback(
    async (displayName: string, studentCode: string, photoUrl?: string) => {
      if (!firebaseUser) return;
      const userPath = `users/${firebaseUser.uid}`;
      const userRef = doc(db, 'users', firebaseUser.uid);
      const payload: Record<string, unknown> = {
        displayName: displayName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
        studentCode: studentCode.trim().slice(0, BLUEPRINT_LIMITS.studentCodeMax),
        updatedAt: serverTimestamp(),
      };
      if (photoUrl !== undefined) {
        payload.photoUrl = photoUrl.length <= BLUEPRINT_LIMITS.photoMax ? photoUrl : '';
      }
      try {
        await updateDoc(userRef, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      }
    },
    [firebaseUser]
  );

  const actualRole: UserRole = profile?.role || 'docente';
  const effectiveRole: UserRole = actualRole === 'docente' && viewAsStudent ? 'estudante' : actualRole;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        effectiveRole,
        viewAsStudent,
        setViewAsStudent,
        signInWithGoogle,
        signOut,
        updateUserProfile,
        syncStudentIdentity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
