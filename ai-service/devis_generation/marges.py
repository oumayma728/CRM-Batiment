"""
Check final de rentabilité (étape 11 du flux) et politique d'envoi (étape 12).

Rappel de la distinction établie dans la conversation :
- Le TAUX DE MARGE (base = coût) est saisi par le commercial et sert au calcul
  des prix de vente (voir pricing.appliquer_taux_marge). Il n'est jamais
  vérifié contre 15-40%.
- Le TAUX DE MARQUE (base = prix de vente) est calculé ICI, sur les lignes
  réelles du devis (remise éventuelle incluse), et c'est LUI qui est comparé
  à 15-40%.
"""
from typing import Dict, List


def calcul_marges(lignes_devis: List[Dict]) -> Dict:
    """
    Exigence de la tâche : "Créer fonction calcul_marges(devis_lignes) qui
    lit tarifs_catalogue et applique règles marge métier, retourne
    {marge_total_€, marge_%, alertes[]} si < 15% ou > 40%".

    `lignes_devis` : liste de dicts contenant au moins `totalHT` et
    `coutTotal` par ligne — fonctionne aussi bien sur les lignes composants
    que sur une éventuelle ligne de remise (totalHT négatif, coutTotal = 0),
    ajoutée plus tard dans l'éditeur classique.

    Ne décide jamais si l'envoi est bloqué ou non — voir peut_envoyer_devis()
    pour ça, volontairement séparée.
    """
    total_vente = round(sum(l["totalHT"] for l in lignes_devis), 2)
    cout_total = round(sum(l["coutTotal"] for l in lignes_devis), 2)
    marge_total_eur = round(total_vente - cout_total, 2)

    marge_pourcent = 0.0 if total_vente == 0 else round((marge_total_eur / total_vente) * 100, 2)

    alertes = []
    if marge_pourcent < 15:
        alertes.append(
            {
                "type": "MARGE_INSUFFISANTE",
                "marge_pourcent": marge_pourcent,
                "seuil": 15,
                "message": f"Marge de {marge_pourcent}% inférieure au seuil minimum de 15%.",
            }
        )
    elif marge_pourcent > 40:
        alertes.append(
            {
                "type": "MARGE_EXCESSIVE",
                "marge_pourcent": marge_pourcent,
                "seuil": 40,
                "message": f"Marge de {marge_pourcent}% supérieure au seuil maximum de 40%.",
            }
        )

    return {
        "marge_total_eur": marge_total_eur,
        "marge_pourcent": marge_pourcent,
        "alertes": alertes,
    }


def peut_envoyer_devis(resultat_calcul_marges: Dict) -> bool:
    """
    Politique d'envoi ISOLÉE — voir la discussion : comportement actuel
    bloquant, mais pensé pour être changé en un seul endroit.

    Pour basculer vers "alerte seule, envoi toujours permis" :
        return True

    Pour un futur circuit d'approbation avec justification :
        return len(resultat_calcul_marges["alertes"]) == 0 or devis.approuve_malgre_alerte

    Ne JAMAIS dupliquer cette règle ailleurs (frontend, autre endpoint) —
    toujours appeler cette fonction.
    """
    return len(resultat_calcul_marges["alertes"]) == 0
