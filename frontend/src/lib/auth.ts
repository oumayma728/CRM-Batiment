// src/lib/auth.ts
const SESSION_KEY = 'baticrm_session';

interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  companyId: number;
}

interface Session {
  token: string;
  user: User;
}

class AuthManager {
  private static instance: AuthManager;
  private session: Session | null = null;
  
  private constructor() {
    this.loadSession();
  }
  
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }
  
  // Charger la session depuis sessionStorage
  private loadSession(): void {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      console.log('📦 Session brute dans storage:', stored);
      
      if (!stored) {
        console.log('ℹ️ Aucune session trouvée');
        this.session = null;
        return;
      }
      
      const parsed = JSON.parse(stored);
      console.log('📦 Session parsée:', parsed);
      
      // Cas 1: Bon format { token, user }
      if (parsed.token && parsed.user) {
        this.session = parsed;
        console.log('✅ Session valide chargée');
      }
      // Cas 2: Ancien format { id, email, nom, prenom, role, companyId }
      else if (parsed.id && !parsed.token) {
        console.log('🔧 Ancien format détecté, conversion en cours...');
        
        // Créer un token temporaire
        const tempToken = btoa(JSON.stringify({
          id: parsed.id,
          email: parsed.email,
          role: parsed.role,
          exp: Date.now() + 24 * 60 * 60 * 1000
        }));
        
        this.session = {
          token: tempToken,
          user: {
            id: parsed.id,
            email: parsed.email,
            nom: parsed.nom,
            prenom: parsed.prenom,
            role: parsed.role,
            companyId: parsed.companyId
          }
        };
        
        // Sauvegarder au nouveau format
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
        console.log('✅ Session convertie au nouveau format');
      }
      // Cas 3: Format { user } seulement
      else if (parsed.user && !parsed.token) {
        console.log('🔧 Format {user} détecté, ajout du token...');
        
        const tempToken = btoa(JSON.stringify({
          id: parsed.user.id,
          email: parsed.user.email,
          role: parsed.user.role,
          exp: Date.now() + 24 * 60 * 60 * 1000
        }));
        
        this.session = {
          token: tempToken,
          user: parsed.user
        };
        
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
        console.log('✅ Token ajouté à la session');
      }
      else {
        console.warn('⚠️ Format de session inconnu:', Object.keys(parsed));
        this.session = null;
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
      this.session = null;
    }
  }
  
  // Initialiser (appelé au démarrage)
  init(): void {
    console.log('🚀 AuthManager initialisé');
    console.log('🔐 Authentifié:', this.isAuthenticated());
    if (this.isAuthenticated()) {
      console.log('👤 Utilisateur:', this.getUser());
      console.log('🔑 Token:', this.getToken()?.substring(0, 50) + '...');
    }
  }
  
  // Définir la session (après login)
  setSession(token: string, user: User): void {
    this.session = { token, user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    console.log('✅ Session créée avec succès');
    console.log('👤 Rôle:', user.role);
    
    // Déclencher un événement pour notifier les composants
    window.dispatchEvent(new Event('auth-change'));
  }
  
  // Récupérer le token
  getToken(): string | null {
    return this.session?.token || null;
  }
  
  // Récupérer l'utilisateur
  getUser(): User | null {
    return this.session?.user || null;
  }
  
  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    const hasToken = !!this.session?.token;
    const hasUser = !!this.session?.user;
    const isValid = hasToken && hasUser;
    
    console.log('🔍 Vérification auth - Token:', hasToken, '- User:', hasUser, '- Valide:', isValid);
    return isValid;
  }
  
  // Déconnexion
  logout(): void {
    this.session = null;
    sessionStorage.removeItem(SESSION_KEY);
    console.log('👋 Déconnexion effectuée');
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = '/login';
  }
}

export const authManager = AuthManager.getInstance();

// Nettoyer et recréer une session propre (à exécuter une fois)
export const fixSession = () => {
  console.log('🔧 Nettoyage et recréation de la session...');
  sessionStorage.removeItem(SESSION_KEY);
  
  const cleanSession = {
    token: 'clean-token-' + Date.now(),
    user: {
      id: 1,
      email: 'admin@batiment-pro.fr',
      nom: 'Admin',
      prenom: 'Super',
      role: 'ADMIN',
      companyId: 1
    }
  };
  
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(cleanSession));
  console.log('✅ Session propre créée:', cleanSession);
  window.location.reload();
};