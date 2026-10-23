import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { dbService } from '../services/db';

const STORAGE_KEY_AUTH_USER = 'fudma_auth_user_v1';

interface AuthContextType {
  currentUser: User | null;
  engineMode: 'mock' | 'firebase';
  isLoginModalOpen: boolean;
  preferredLoginRole: string | null;
  isFirebaseConfigModalOpen: boolean;
  login: (email: string, password?: string) => Promise<User>;
  quickSwitch: (roleOrUid: string) => Promise<User>;
  logout: () => Promise<void>;
  openLoginModal: (preferredRole?: string) => void;
  closeLoginModal: () => void;
  openFirebaseConfigModal: () => void;
  closeFirebaseConfigModal: () => void;
  setEngineMode: (mode: 'mock' | 'firebase') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY_AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });

  const [engineMode, setEngineModeState] = useState<'mock' | 'firebase'>(() => dbService.getEngineMode());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [preferredLoginRole, setPreferredLoginRole] = useState<string | null>(null);
  const [isFirebaseConfigModalOpen, setIsFirebaseConfigModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(STORAGE_KEY_AUTH_USER);
    }
  }, [currentUser]);

  const login = async (email: string, password = ''): Promise<User> => {
    if (!email) throw new Error('Please enter your institutional email.');
    const cleanEmail = email.trim().toLowerCase();

    const user = dbService.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('No user account found with that email address.');
    }

    if (user.status === 'deactivated') {
      throw new Error('This account has been deactivated by the administrator.');
    }

    // Presentation demo password validation
    const validPasswords = ['admin123', 'lecturer123', 'student123', 'password', 'fudma2026', '123456'];
    if (password && !validPasswords.includes(password.toLowerCase()) && password !== '123456') {
      throw new Error('Invalid password. For demo accounts use: admin123, lecturer123, or student123.');
    }

    setCurrentUser(user);
    dbService.addAuditLog({
      eventType: 'USER_LOGIN',
      actorUid: user.uid,
      actorName: user.fullName,
      targetId: user.role,
      metadata: `Signed in via Institutional Engine (${user.email})`,
    });

    return user;
  };

  const quickSwitch = async (roleOrUid: string): Promise<User> => {
    let user: User | null = null;
    if (roleOrUid === 'admin') {
      user = dbService.getUserById('admin_001');
    } else if (roleOrUid === 'lecturer') {
      user = dbService.getUserById('lecturer_nura');
    } else if (roleOrUid === 'student1' || roleOrUid === 'student') {
      user = dbService.getUserById('student_001');
    } else if (roleOrUid === 'student2') {
      user = dbService.getUserById('student_002');
    } else {
      user = dbService.getUserById(roleOrUid);
    }

    if (!user) {
      throw new Error('Target user account not found for quick switch.');
    }

    setCurrentUser(user);
    dbService.addAuditLog({
      eventType: 'QUICK_SWITCH',
      actorUid: user.uid,
      actorName: user.fullName,
      targetId: user.role,
      metadata: `Switched account perspective to: ${user.fullName} (${user.role})`,
    });

    return user;
  };

  const logout = async (): Promise<void> => {
    if (currentUser) {
      dbService.addAuditLog({
        eventType: 'USER_LOGOUT',
        actorUid: currentUser.uid,
        actorName: currentUser.fullName,
        targetId: currentUser.role,
        metadata: 'Signed out of session',
      });
    }
    setCurrentUser(null);
  };

  const openLoginModal = (preferredRole?: string) => {
    setPreferredLoginRole(preferredRole || null);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setPreferredLoginRole(null);
  };

  const openFirebaseConfigModal = () => {
    setIsFirebaseConfigModalOpen(true);
  };

  const closeFirebaseConfigModal = () => {
    setIsFirebaseConfigModalOpen(false);
  };

  const setEngineMode = (mode: 'mock' | 'firebase') => {
    dbService.setEngineMode(mode);
    setEngineModeState(mode);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        engineMode,
        isLoginModalOpen,
        preferredLoginRole,
        isFirebaseConfigModalOpen,
        login,
        quickSwitch,
        logout,
        openLoginModal,
        closeLoginModal,
        openFirebaseConfigModal,
        closeFirebaseConfigModal,
        setEngineMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
