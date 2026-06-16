import { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Key,
} from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${
          JSON.parse(localStorage.getItem('token') || 'null')
        }`,
      },
    })
      .then((r) => r.json())
      .then(setUser);
  }, []);

  if (!user) {
    return (
      <div className="p-10">
        Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Mon Profil
      </h1>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">
            Informations personnelles
          </h2>

          <div className="space-y-4">

            <div className="flex items-center gap-3">
              <User size={18}/>
              {user.prenom} {user.nom}
            </div>

            <div className="flex items-center gap-3">
              <Mail size={18}/>
              {user.email}
            </div>

            <div className="flex items-center gap-3">
              <Phone size={18}/>
              {user.telephone || '-'}
            </div>

            <div className="flex items-center gap-3">
              <Shield size={18}/>
              {user.role}
            </div>

            <div className="flex items-center gap-3">
              <Building2 size={18}/>
              {user.company?.nom}
            </div>

          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">
            Sécurité
          </h2>

          <button className="w-full bg-blue-600 text-white py-2 rounded-lg">
            Modifier le mot de passe
          </button>

          <button
            className="w-full mt-3 bg-red-600 text-white py-2 rounded-lg"
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
          >
            Déconnexion
          </button>
        </div>

      </div>
    </div>
  );
}