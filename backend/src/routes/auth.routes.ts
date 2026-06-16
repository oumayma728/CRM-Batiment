import { Router } from 'express';
import bcrypt from 'bcrypt';
const { PrismaClient } = require('../../generated/prisma');

const router = Router();
const prisma = new PrismaClient();

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    const { user, company } = req.body;

    console.log('📝 Données reçues:', { user, company });

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(user.password, 10);

    // Créer l'entreprise
    const newCompany = await prisma.company.create({
      data: {
        nom: company.nom,
        siret: company.siret,
        adresse: company.adresse,
        telephone: company.telephone,
        email: company.email,
        tvaDefaut: company.tvaDefaut,
        devise: company.devise || 'EUR',
      }
    });

    console.log('✅ Entreprise créée:', newCompany.id);

    // Créer l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        companyId: newCompany.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        password: hashedPassword,
        telephone: user.telephone,
        role: user.role,
        actif: true,
        mustChangePassword: false,
      }
    });

    console.log('✅ Utilisateur créé:', newUser.id);

    // Ne pas retourner le mot de passe
    const { password, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: userWithoutPassword,
      company: newCompany
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la création du compte',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour vérifier si l'email existe déjà
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email }
    });
    res.json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;