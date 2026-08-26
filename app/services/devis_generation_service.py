"""
Service de génération automatique de lignes de devis à partir des pièces d'un plan.

Règles V1 :
- Génère une ligne "Carrelage {nom_piece}" pour chaque pièce dont surface_m2 n'est pas null
- Exclut les zones extérieures ou non-couvertes (Terrasse, Jardin, Garage, Cour, Parking)
- Si surface_m2 est null, ajoute la pièce à `pieces_sans_devis_possible` (saisie manuelle requise)
"""
from typing import List, Dict, Any

# Mots-clés de pièces à exclure pour la pose de carrelage / revêtement intérieur
EXCLUDED_KEYWORDS = [
    "terrasse",
    "jardin",
    "garage",
    "cour",
    "parking",
    "surface couverte",
    "emprise au sol",
    "comptoir",
    "compteur",
]


def generate_devis_lines(pieces: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Génère les lignes de devis proposées et identifie les pièces sans surface.

    Args:
        pieces: Liste de dicts {"nom": str, "surface_m2": Optional[float], "cotes": List[str]}

    Returns:
        Dict avec :
          - "lignes_devis_proposees": List[dict] -> [{"designation": str, "quantite": float, "unite": "m2"}]
          - "pieces_sans_devis_possible": List[dict] -> [{"nom": str, "raison": str}]
    """
    lignes_devis: List[Dict[str, Any]] = []
    pieces_sans_devis: List[Dict[str, Any]] = []

    if not pieces:
        return {
            "lignes_devis_proposees": [],
            "pieces_sans_devis_possible": [],
        }

    for p in pieces:
        nom = p.get("nom", "").strip()
        if not nom:
            continue

        nom_lower = nom.lower()

        # Règle : Exclure les pièces extérieures / non destinées au revêtement intérieur
        if any(keyword in nom_lower for keyword in EXCLUDED_KEYWORDS):
            continue

        surf = p.get("surface_m2")

        if surf is not None and isinstance(surf, (int, float)) and surf > 0:
            lignes_devis.append({
                "designation": f"Carrelage {nom}",
                "quantite": round(float(surf), 2),
                "unite": "m2",
            })
        else:
            pieces_sans_devis.append({
                "nom": nom,
                "raison": "Surface m² non renseignée sur le plan (saisie manuelle requise)",
            })

    return {
        "lignes_devis_proposees": lignes_devis,
        "pieces_sans_devis_possible": pieces_sans_devis,
    }
