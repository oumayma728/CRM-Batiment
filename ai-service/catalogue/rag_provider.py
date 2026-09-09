"""
Stratégie RAG : ne récupère que les `top_k` prestations les plus pertinentes
par similarité sémantique, plutôt que d'envoyer tout le catalogue. Utile si
le catalogue devient trop volumineux pour tenir dans un prompt raisonnable.

Les embeddings sont calculés localement via sentence-transformers (modèle
multilingue, gratuit, aucun appel API externe pour la recherche elle-même —
seul l'appel final au LLM de génération a un coût, exactement comme pour la
stratégie few-shot).

Contrepartie assumée (voir discussion précédente) : contrairement au
few-shot, le texte envoyé au LLM change à chaque description différente
(sous-ensemble de prestations différent) — le prompt caching provider ne
s'applique donc pas ici.
"""
import json
import time
from typing import Dict, List, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer

from .base import BaseCatalogueProvider, CataloguePrestation
from .repository import fetch_prestations
from .few_shot_provider import _RESPONSE_FORMAT_INSTRUCTIONS

_EMBEDDING_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


class RAGCatalogueProvider(BaseCatalogueProvider):
    """
    Construit un system_prompt contenant uniquement les prestations les plus
    proches sémantiquement de la description du commercial.
    """

    def __init__(self, top_k: int = 8, cache_ttl_seconds: int = 300):
        self.top_k = top_k
        self.cache_ttl_seconds = cache_ttl_seconds
        self._model_instance = None  # chargé à la demande (lazy)
        # Cache par entreprise : (timestamp, prestations, matrice d'embeddings)
        self._cache: Dict[int, Tuple[float, List[CataloguePrestation], np.ndarray]] = {}

    @property
    def _model(self) -> SentenceTransformer:
        """
        Chargement paresseux du modèle d'embeddings : il n'est téléchargé/
        chargé en mémoire que lors du premier appel réel en mode RAG, jamais
        à la simple instanciation de la classe (utile si le mode few-shot
        est utilisé pour l'instant et que RAG reste en réserve).
        """
        if self._model_instance is None:
            self._model_instance = SentenceTransformer(_EMBEDDING_MODEL_NAME)
        return self._model_instance

    def build_system_prompt(self, description: str, company_id: int) -> str:
        prestations, embeddings = self._get_catalogue_embeddings(company_id)

        if not prestations:
            return self._render_prompt([])

        query_embedding = self._model.encode([description])[0]
        similarites = _cosine_similarity(query_embedding, embeddings)
        top_indices = np.argsort(similarites)[::-1][: self.top_k]
        candidats = [prestations[i] for i in top_indices]

        return self._render_prompt(candidats)

    def _get_catalogue_embeddings(
        self, company_id: int
    ) -> Tuple[List[CataloguePrestation], np.ndarray]:
        now = time.time()
        cached = self._cache.get(company_id)
        if cached and (now - cached[0]) < self.cache_ttl_seconds:
            return cached[1], cached[2]

        prestations = fetch_prestations(company_id)
        textes = [self._prestation_to_text(p) for p in prestations]
        embeddings = self._model.encode(textes) if textes else np.array([])

        self._cache[company_id] = (now, prestations, embeddings)
        return prestations, embeddings

    @staticmethod
    def _prestation_to_text(p: CataloguePrestation) -> str:
        texte = p.nom
        if p.categorie_nom:
            texte += f" ({p.categorie_nom})"
        if p.description:
            texte += f" - {p.description}"
        return texte

    @staticmethod
    def _render_prompt(prestations: List[CataloguePrestation]) -> str:
        catalogue_json = json.dumps(
            [
                {
                    "id": p.id,
                    "nom": p.nom,
                    "unite": p.unite,
                    "categorie": p.categorie_nom,
                    "options": p.options,
                }
                for p in prestations
            ],
            ensure_ascii=False,
        )
        return f"""Tu es un assistant qui génère des devis BTP structurés en JSON à partir
d'une description libre du besoin d'un client.

Voici les prestations du catalogue les plus pertinentes pour cette demande
(présélectionnées par recherche sémantique) :
{catalogue_json}

{_RESPONSE_FORMAT_INSTRUCTIONS}
Si aucune prestation ci-dessus ne correspond réellement au besoin décrit,
retourne une liste "prestations" vide plutôt que d'inventer une correspondance.
"""


def _cosine_similarity(query_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    if matrix.size == 0:
        return np.array([])
    query_norm = query_vec / (np.linalg.norm(query_vec) + 1e-10)
    matrix_norm = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10)
    return matrix_norm @ query_norm
