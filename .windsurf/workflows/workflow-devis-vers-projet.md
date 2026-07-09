---
description: Workflow recommandé pour transformer un devis validé en projet
---

# Workflow Devis Validé vers Projet

Ce workflow décrit le processus recommandé pour transformer un devis validé en un projet complet avec gestion des commandes fournisseurs.

## Étape 1: Validation du devis
- Le Technico-commercial valide le devis (statut passe à VALIDE ou ACCEPTE)
- Le client signe le devis (signature client requise selon le mode de validation)
- Le Technico-commercial appose sa signature conseiller

## Étape 2: Création du bon de commande
- Le Technico-commercial accède au devis validé
- Il clique sur "Générer bon de commande" ou "Transformer en commandes"
- Le système crée automatiquement les bons de commande basés sur les lignes de devis

## Étape 3: Sélection des fournisseurs
- Pour chaque ligne de commande, le Technico-commercial sélectionne le fournisseur approprié
- Il peut consulter le catalogue fournisseur et les tarifs négociés
- Il vérifie les disponibilités et les délais de livraison

## Étape 4: Ajout des produits et quantités
- Le Technico-commercial vérifie les quantités commandées
- Il peut ajuster les quantités si nécessaire
- Il ajoute des produits supplémentaires si requis pour le chantier
- Il spécifie les dates de livraison souhaitées

## Étape 5: Envoi de la commande
- Le Technico-commercial valide et envoie les commandes aux fournisseurs
- Le statut des commandes passe à ENVOYE
- Les fournisseurs reçoivent une notification de commande

## Étape 6: Livraison par le fournisseur
- Le fournisseur prépare et expédie les matériaux
- Le statut de la commande passe à EXPEDIEE
- Le fournisseur notifie l'expédition avec les détails de livraison

## Étape 7: Confirmation de réception par le Chef de chantier
- Le Chef de chantier reçoit les matériaux sur le chantier
- Il vérifie la conformité des livraisons (quantités, qualité)
- Il confirme la réception dans le système
- Le statut de la commande passe à RECUE
- Une réception est créée dans le système

## Étape 8: Traitement de la facture fournisseur
- Le fournisseur envoie sa facture
- L'Administrateur reçoit et vérifie la facture
- Il rapproche la facture avec la réception des matériaux
- Il valide la facture pour paiement
- Le statut de la facture passe à PAYEE

## Rôles et permissions
- **Technico-commercial**: Création et envoi des commandes fournisseurs
- **Chef de chantier**: Confirmation des réceptions de matériaux
- **Administrateur**: Traitement et validation des factures fournisseurs

## Pages concernées
- `/technico/devis` - Gestion des devis
- `/technico/commandes-fournisseur` - Gestion des commandes fournisseurs
- `/admin/taches-chantier` - Gestion des tâches et réceptions (Chef de chantier)
- `/admin/factures` - Gestion des factures fournisseurs (Administrateur)
