import { UserProfile } from '../types';

// Storage keys
const AUTH_USER_STORAGE_KEY = 'imch_auth_current_user';
const USERS_DB_STORAGE_KEY = 'imch_registered_users_db';

// Real default user profile for IMCH Soluções Digitais
const DEFAULT_USER: UserProfile = {
  id: 'usr-imch-solucoes',
  name: 'IMCH Soluções Digitais',
  email: 'imchsolucoes@gmail.com',
  plan: 'pro',
  credits: 99999,
  createdAt: new Date().toISOString(),
};

// Legacy mock emails to purge completely
const LEGACY_MOCK_EMAILS = [
  'antonio@dev.imch.ao',
  'sofialane5720@gmail.com',
  'carlos@imch.pt',
  'dev@imch.ao',
  'mariana.silva@dev.ao',
];

class AuthService {
  private currentUser: UserProfile = DEFAULT_USER;
  private listeners: Array<(user: UserProfile) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      // Purge any legacy mock demo accounts from local storage
      const existingDbRaw = localStorage.getItem(USERS_DB_STORAGE_KEY);
      let db = existingDbRaw ? JSON.parse(existingDbRaw) : [];

      db = db.filter((u: any) => !LEGACY_MOCK_EMAILS.includes((u.email || '').toLowerCase().trim()));
      localStorage.setItem(USERS_DB_STORAGE_KEY, JSON.stringify(db));

      // Restore session if user is real and not mock
      const savedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.email && !LEGACY_MOCK_EMAILS.includes(parsed.email.toLowerCase().trim())) {
          this.currentUser = {
            ...parsed,
            plan: 'pro',
            credits: 99999,
          };
          return;
        }
      }

      // Default active user is IMCH Soluções Digitais
      this.currentUser = DEFAULT_USER;
      this.saveCurrentSession(DEFAULT_USER);
    } catch {
      this.currentUser = DEFAULT_USER;
    }
  }

  private saveCurrentSession(user: UserProfile) {
    try {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {}
    this.notify();
  }

  public subscribe(callback: (user: UserProfile) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public login(email: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === 'imchsolucoes@gmail.com') {
        this.currentUser = DEFAULT_USER;
        this.saveCurrentSession(DEFAULT_USER);
        return { success: true, user: DEFAULT_USER };
      }

      const db = JSON.parse(localStorage.getItem(USERS_DB_STORAGE_KEY) || '[]');
      const found = db.find(
        (u: any) => u.email.trim().toLowerCase() === cleanEmail
      );

      if (!found) {
        return { success: false, error: 'Email não registado. Crie uma nova conta clicando em Criar Conta.' };
      }

      if (found.passwordHash !== password) {
        return { success: false, error: 'Palavra-passe incorreta.' };
      }

      const userProfile: UserProfile = {
        id: found.id,
        name: found.name,
        email: found.email,
        plan: 'pro',
        credits: 99999,
        avatarUrl: found.avatarUrl,
        createdAt: found.createdAt || new Date().toISOString(),
      };

      this.currentUser = userProfile;
      this.saveCurrentSession(userProfile);
      return { success: true, user: userProfile };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao iniciar sessão.' };
    }
  }

  public getRegisteredAccounts(): Array<{ name: string; email: string; plan: 'free' | 'pro' }> {
    try {
      const db = JSON.parse(localStorage.getItem(USERS_DB_STORAGE_KEY) || '[]');
      return [
        { name: DEFAULT_USER.name, email: DEFAULT_USER.email, plan: 'pro' },
        ...db.map((u: any) => ({ name: u.name, email: u.email, plan: u.plan || 'pro' }))
      ];
    } catch {
      return [{ name: DEFAULT_USER.name, email: DEFAULT_USER.email, plan: 'pro' }];
    }
  }

  public register(name: string, email: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const db = JSON.parse(localStorage.getItem(USERS_DB_STORAGE_KEY) || '[]');
      const exists = db.some(
        (u: any) => u.email.trim().toLowerCase() === cleanEmail
      );

      if (exists) {
        return { success: false, error: 'Já existe uma conta com este e-mail. Faz login.' };
      }

      const newUser: UserProfile = {
        id: 'usr-' + Date.now(),
        name: name.trim(),
        email: cleanEmail,
        plan: 'pro',
        credits: 99999,
        createdAt: new Date().toISOString(),
      };

      db.push({
        ...newUser,
        passwordHash: password,
      });

      localStorage.setItem(USERS_DB_STORAGE_KEY, JSON.stringify(db));

      this.currentUser = newUser;
      this.saveCurrentSession(newUser);
      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao criar conta.' };
    }
  }

  public logout(): void {
    // Reset back to primary IMCH profile rather than locking out the UI
    this.currentUser = DEFAULT_USER;
    this.saveCurrentSession(DEFAULT_USER);
  }

  public upgradeToPro(paymentMethod?: string, reference?: string): UserProfile {
    const updated: UserProfile = {
      ...this.currentUser,
      plan: 'pro',
      credits: 99999,
    };
    this.currentUser = updated;
    this.saveCurrentSession(updated);
    return updated;
  }

  public addCredits(amount: number): UserProfile {
    const updated: UserProfile = {
      ...this.currentUser,
      credits: (this.currentUser.credits || 0) + amount,
    };
    this.currentUser = updated;
    this.saveCurrentSession(updated);
    return updated;
  }

  public consumeCredit(): { allowed: boolean; remaining: number; reason?: string } {
    return { allowed: true, remaining: 99999 };
  }
}

export const authService = new AuthService();
