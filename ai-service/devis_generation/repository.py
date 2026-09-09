"""
Accès en lecture/écriture à la base Postgres partagée avec le schéma Prisma,
pour tout ce qui concerne la résolution des prestations détectées et la
persistance du devis final.

Mêmes principes que catalogue/repository.py : SQL direct (psycopg2), noms de
tables/colonnes strictement identiques à shemaBD.pdf, pas de client Prisma
(réservé à Node.js).
"""
import os
import time
from contextlib import contextmanager
from typing import List, Optional

import psycopg2
import psycopg2.extras


def _dsn() -> str:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL n'est pas configurée (voir .env.example)")
    return dsn


@contextmanager
def _connection():
    """Ouvre une connexion, commit si tout se passe bien, rollback sinon,
    referme toujours la connexion à la sortie."""
    conn = psycopg2.connect(_dsn())
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_prestation_full(prestation_id: int) -> dict:
    """Nom, unité, bornes de prix — nécessaire pour construire une OccurrencePrestation."""
    query = """
        SELECT id, nom, unite, "prixVenteMin" AS prix_vente_min, "prixVenteMax" AS prix_vente_max
        FROM prestations
        WHERE id = %s
    """
    with _connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, (prestation_id,))
            row = cur.fetchone()
            if row is None:
                raise ValueError(f"Prestation introuvable : id={prestation_id}")
            return dict(row)


def fetch_prestation_composition(prestation_id: int) -> List[dict]:
    """
    Les composants "de base" d'une prestation (hors options), via
    PrestationComposition, avec leur nom/unité/coût résolus depuis Materiau
    ou ServiceMainOeuvre (une ligne n'a jamais les deux à la fois).
    """
    query = """
        SELECT
            pc."quantiteParUnite" AS quantite_par_unite,
            pc."materiauId" AS materiau_id,
            pc."serviceMainOeuvreId" AS service_id,
            m.nom AS materiau_nom, m.unite AS materiau_unite, m."prixAchatFixe" AS materiau_cout,
            s.nom AS service_nom, s.unite AS service_unite, s."prixUnitaire" AS service_cout
        FROM prestations_compositions pc
        LEFT JOIN materiaux m ON m.id = pc."materiauId"
        LEFT JOIN services_main_oeuvre s ON s.id = pc."serviceMainOeuvreId"
        WHERE pc."prestationId" = %s
    """
    with _connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, (prestation_id,))
            return [dict(r) for r in cur.fetchall()]


def fetch_choix_option_noms(prestation_id: int) -> List[str]:
    """Noms des ChoixOption d'une prestation — ce que l'UI affiche en cases à cocher."""
    query = """
        SELECT co.nom
        FROM choix_options co
        JOIN options_prestations op ON op.id = co."optionId"
        WHERE op."prestationId" = %s AND co.actif = true
        ORDER BY op.ordre, co.ordre
    """
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (prestation_id,))
            return [row[0] for row in cur.fetchall()]


def fetch_choix_option_id_by_name(prestation_id: int, option_nom: str) -> Optional[int]:
    """Retrouve l'id d'un ChoixOption à partir de son nom, pour une prestation donnée."""
    query = """
        SELECT co.id
        FROM choix_options co
        JOIN options_prestations op ON op.id = co."optionId"
        WHERE op."prestationId" = %s AND co.nom = %s
    """
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (prestation_id, option_nom))
            row = cur.fetchone()
            return row[0] if row else None


def fetch_choix_option_composition(choix_option_id: int) -> List[dict]:
    """Mêmes colonnes que fetch_prestation_composition, mais pour les
    composants ajoutés par un choix d'option (ChoixOptionComposition)."""
    query = """
        SELECT
            cc."quantiteParUnite" AS quantite_par_unite,
            cc."materiauId" AS materiau_id,
            cc."serviceMainOeuvreId" AS service_id,
            m.nom AS materiau_nom, m.unite AS materiau_unite, m."prixAchatFixe" AS materiau_cout,
            s.nom AS service_nom, s.unite AS service_unite, s."prixUnitaire" AS service_cout
        FROM choix_options_compositions cc
        LEFT JOIN materiaux m ON m.id = cc."materiauId"
        LEFT JOIN services_main_oeuvre s ON s.id = cc."serviceMainOeuvreId"
        WHERE cc."choixOptionId" = %s
    """
    with _connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, (choix_option_id,))
            return [dict(r) for r in cur.fetchall()]


def fetch_tva_defaut_by_company(company_id: int) -> float:
    """TVA : User connecté -> Company.tvaDefaut (décision prise dans la conversation)."""
    query = 'SELECT "tvaDefaut" FROM companies WHERE id = %s'
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (company_id,))
            row = cur.fetchone()
            if row is None:
                raise ValueError(f"Entreprise introuvable : id={company_id}")
            return float(row[0])


def create_devis_brouillon(
    company_id: int,
    client_id: int,
    createur_id: Optional[int],
    demande_devis_id: Optional[int] = None,
) -> int:
    """
    Crée le Devis en statut BROUILLON dès le début du pipeline (étape 3 du
    flux), avant même la validation humaine.

    Note : la référence générée ici (horodatage) est un espace réservé —
    à remplacer par le format de numérotation réel de l'entreprise
    (ex: "2025/2281" vu dans le devis Pronergy) une fois celui-ci connu.
    """
    reference = f"DEVIS-{company_id}-{int(time.time())}"
    query = """
        INSERT INTO devis (
            "companyId", "clientId", "createurId", "demandeDevisId",
            reference, statut, "createdAt", "updatedAt"
        ) VALUES (%s, %s, %s, %s, %s, 'BROUILLON', now(), now())
        RETURNING id
    """
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query, (company_id, client_id, createur_id, demande_devis_id, reference)
            )
            return cur.fetchone()[0]


def save_lignes_devis(devis_id: int, lignes: List[dict]) -> None:
    """
    Écrit les lignes aplaties (une par composant) dans LigneDevis — appelé
    uniquement après validation humaine et vérification qu'aucune quantité
    d'ouvrage ne manque (voir pipeline.valider_et_sauvegarder).
    """
    query = """
        INSERT INTO lignes_devis (
            "devisId", "prestationId", "materiauId", "serviceMainOeuvreId",
            quantite, unite, "prixUnitaireVente", "prixAchat", "mainOeuvre",
            "totalHT", "coutTotal", ordre, "createdAt", "updatedAt"
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
    """
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM lignes_devis WHERE "devisId" = %s', (devis_id,))
            for ordre, ligne in enumerate(lignes):
                cur.execute(
                    query,
                    (
                        devis_id,
                        ligne["prestationId"],
                        ligne["materiauId"],
                        ligne["serviceMainOeuvreId"],
                        ligne["quantite"],
                        ligne["unite"],
                        ligne["prixUnitaireVente"],
                        ligne["prixAchat"],
                        ligne["mainOeuvre"],
                        ligne["totalHT"],
                        ligne["coutTotal"],
                        ordre,
                    ),
                )


def update_devis_totaux(
    devis_id: int,
    total_ht: float,
    cout_total: float,
    marge_pourcent: float,
    tva_pourcent: float,
) -> None:
    """Met à jour les totaux du Devis après sauvegarde des lignes — margePourcent
    représente ici le TAUX DE MARQUE (voir marges.calcul_marges), pas le taux
    de marge saisi au départ par le commercial."""
    total_tva = round(total_ht * tva_pourcent / 100, 2)
    total_ttc = round(total_ht + total_tva, 2)
    profit = round(total_ht - cout_total, 2)

    query = """
        UPDATE devis SET
            "totalHT" = %s, "totalTVA" = %s, "totalTTC" = %s, "coutTotal" = %s,
            profit = %s, "margePourcent" = %s, "tauxTVA" = %s, "updatedAt" = now()
        WHERE id = %s
    """
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (total_ht, total_tva, total_ttc, cout_total, profit, marge_pourcent, tva_pourcent, devis_id),
            )


def update_devis_statut(devis_id: int, statut: str) -> None:
    query = 'UPDATE devis SET statut = %s, "updatedAt" = now() WHERE id = %s'
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (statut, devis_id))
