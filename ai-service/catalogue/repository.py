"""
Accès en lecture au catalogue (table `prestations` + relations), directement
en SQL sur la base Postgres partagée avec le schéma Prisma du CRM.

Ce service Python ne dépend pas du client Prisma (réservé à Node.js) : il lit
les mêmes tables via psycopg2, en respectant strictement les noms de
tables/colonnes générés par Prisma (camelCase entre guillemets, tables au
pluriel via @@map — voir shemaBD.pdf).

Note : ouvre une connexion par appel pour rester simple à ce stade. À
remplacer par un pool de connexions (ex: psycopg2.pool) avant la mise en
production, pour éviter le coût d'ouverture/fermeture répété.
"""
import os
from typing import List

import psycopg2
import psycopg2.extras

from .base import CataloguePrestation


def _get_connection():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "DATABASE_URL n'est pas configurée (voir catalogue/.env.example)"
        )
    return psycopg2.connect(dsn)


def fetch_prestations(company_id: int) -> List[CataloguePrestation]:
    """
    Récupère toutes les prestations actives d'une entreprise, avec leur
    catégorie et leurs options — utilisé aussi bien par le mode few-shot
    (tout le catalogue) que par le mode RAG (candidats avant filtrage).
    """
    query = """
        SELECT
            p.id,
            p.nom,
            p.unite,
            p."prixVenteMin"  AS prix_vente_min,
            p."prixVenteMax"  AS prix_vente_max,
            p.description,
            c.nom AS categorie_nom
        FROM prestations p
        LEFT JOIN categories_prestations c ON c.id = p."categorieId"
        WHERE p."companyId" = %s AND p.actif = true
        ORDER BY c.nom, p.nom
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, (company_id,))
            rows = cur.fetchall()

    return [
        CataloguePrestation(
            id=row["id"],
            nom=row["nom"],
            unite=row["unite"],
            prix_vente_min=row["prix_vente_min"],
            prix_vente_max=row["prix_vente_max"],
            description=row["description"],
            categorie_nom=row["categorie_nom"],
            options=_fetch_options(row["id"]),
        )
        for row in rows
    ]


def _fetch_options(prestation_id: int) -> List[str]:
    """Noms des ChoixOption (pas OptionPrestation) : c'est ce que le LLM
    doit renvoyer et ce que l'UI affiche en cases à cocher."""
    query = """
        SELECT co.nom
        FROM choix_options co
        JOIN options_prestations op ON op.id = co."optionId"
        WHERE op."prestationId" = %s AND co.actif = true
        ORDER BY op.ordre, co.ordre
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (prestation_id,))
            return [r[0] for r in cur.fetchall()]
