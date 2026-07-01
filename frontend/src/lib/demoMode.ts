import type { Role, User } from '@/types';

export const SESSION_KEY = 'baticrm_session';
export const DEMO_TOKEN = 'demo-readonly-token';

const demoCreatedAt = '2026-06-17T08:00:00.000Z';

export const demoUsersByRole: Record<Role, User> = {
  ADMIN: {
    id: 9001,
    nom: 'Demo',
    prenom: 'Sofia',
    email: 'admin.demo@baticrm.local',
    role: 'ADMIN',
    telephone: '+216 00 000 001',
    actif: true,
    companyId: 1,
    mustChangePassword: false,
    createdAt: demoCreatedAt,
  },
  ASSISTANTE: {
    id: 9002,
    nom: 'Assistante',
    prenom: 'Nour',
    email: 'assistante.demo@baticrm.local',
    role: 'ASSISTANTE',
    telephone: '+216 00 000 002',
    actif: true,
    companyId: 1,
    mustChangePassword: false,
    createdAt: demoCreatedAt,
  },
  CHEF_CHANTIER: {
    id: 9003,
    nom: 'Chef',
    prenom: 'Yanis',
    email: 'chef.demo@baticrm.local',
    role: 'CHEF_CHANTIER',
    telephone: '+216 00 000 003',
    actif: true,
    companyId: 1,
    mustChangePassword: false,
    createdAt: demoCreatedAt,
  },
  TECHNICO: {
    id: 9004,
    nom: 'Technico',
    prenom: 'Ines',
    email: 'technico.demo@baticrm.local',
    role: 'TECHNICO',
    telephone: '+216 00 000 004',
    actif: true,
    companyId: 1,
    mustChangePassword: false,
    createdAt: demoCreatedAt,
  },
  SOUS_TRAITANT: {
    id: 9005,
    nom: 'Fournisseur',
    prenom: 'Karim',
    email: 'fournisseur.demo@baticrm.local',
    role: 'SOUS_TRAITANT',
    telephone: '+216 00 000 005',
    actif: true,
    companyId: 1,
    mustChangePassword: false,
    createdAt: demoCreatedAt,
  },
  CLIENT: {
    id: 9006,
    nom: 'Client',
    prenom: 'Amine',
    email: 'client.demo@baticrm.local',
    role: 'CLIENT',
    telephone: '+216 00 000 006',
    actif: true,
    companyId: 1,
    mustChangePassword: false,
    createdAt: demoCreatedAt,
  },
};

export const demoUser = demoUsersByRole.ADMIN;

export const DEMO_PASSWORD = 'Demo@2026';

export const demoCredentials = Object.values(demoUsersByRole).map((user) => ({
  role: user.role,
  email: user.email,
  password: DEMO_PASSWORD,
  label:
    user.role === 'ADMIN'
      ? 'Administrateur'
      : user.role === 'ASSISTANTE'
        ? 'Assistante'
        : user.role === 'CHEF_CHANTIER'
          ? 'Chef chantier'
          : user.role === 'TECHNICO'
            ? 'Technico-commercial'
            : user.role === 'SOUS_TRAITANT'
              ? 'Fournisseur'
              : 'Client',
}));

export const getDemoRoleFromCredentials = (email: string, password: string): Role | null => {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = demoCredentials.find(
    (item) => item.email.toLowerCase() === normalizedEmail && item.password === password,
  );

  return credential?.role ?? null;
};

export const isDemoEmail = (email: string): boolean => {
  const normalizedEmail = email.trim().toLowerCase();
  return demoCredentials.some((item) => item.email.toLowerCase() === normalizedEmail);
};

export const isDemoToken = (token?: string | null) => token === DEMO_TOKEN;

export const getDemoUser = (): User => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      return demoUser;
    }

    const session = JSON.parse(stored);
    return session?.user ?? demoUser;
  } catch {
    return demoUser;
  }
};

export const isDemoSession = (): boolean => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      return false;
    }

    const session = JSON.parse(stored);
    return session?.demo === true || isDemoToken(session?.token ?? session?.accessToken);
  } catch {
    return false;
  }
};

export const startDemoSession = (role: Role = 'ADMIN') => {
  const user = demoUsersByRole[role] ?? demoUser;

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: DEMO_TOKEN,
      user,
      demo: true,
      readonly: true,
      startedAt: new Date().toISOString(),
    }),
  );
  window.dispatchEvent(new Event('auth-change'));
};
