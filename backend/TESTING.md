# Guide des tests — Backend CRM-Batiment

## Lancer les tests

```bash
cd backend
npm test                        # tous les tests
npm test -- assistant.service   # la logique conversationnelle seulement
npm test -- sensitive-output    # le filtre de sortie seulement
npm test -- --watch             # mode continu (relance a chaque sauvegarde)
```

## Règle d'équipe

**Lancer `npm test` avant chaque push.** Les tests sont la protection
anti-régression du projet : un test qui casse signale qu'une modification
a changé un comportement validé.

## Ce que couvrent les tests (48 au total)

### 1. Logique conversationnelle — `assistant.service.spec.ts` (38 tests)
- **Détection des intentions** : devis, prix, rendez-vous, services, suivi
  (références DEM-XXXXXX), urgence, fautes de frappe.
- **Validation des noms (`isLikelyName`)** : rejet des faux noms rencontrés
  en production ("pas important", vocabulaire métier, questions, politesse,
  phrases d'intention, mot seul) et acceptation des vrais noms, y compris
  les noms à particules ("Jean-Pierre de la Fontaine").
- **Nettoyage des noms (`sanitizeName`)** : préservation des particules
  françaises ("de la"), coupe aux mots parasites ("mon telephone",
  "la semaine"), suppression des chiffres, normalisation des espaces.
- **Extraction et qualification** : champs requis, contacts malformés,
  types de projet avec fautes de frappe.

### 2. Filtre de sortie — `sensitive-output.filter.spec.ts` (10 tests)
- **Blocages** : montants chiffrés (€, DT), marges, coûts d'achat,
  tarifs fournisseurs, messages de configuration interne.
- **Contre-tests** : réponses prix sans chiffre, récapitulatifs avec
  téléphone, surfaces calculées, guidage fournisseurs légitime.

## Philosophie

Chaque bug corrigé pendant le développement est transformé en test :
l'historique des corrections devient la protection du futur. Un test
échoue ? Deux questions dans l'ordre : (1) le code a-t-il régressé ?
(2) ou le test décrit-il un comportement qui a légitimement évolué ?

## Note technique

Les méthodes privées du service sont testées via le pattern maison :
dépendances mockées (`jest.mock`) + cast `(service as any)`. La constante
`isInformationalQuestion` (locale à processMessage) est couverte
indirectement par les tests de routage.