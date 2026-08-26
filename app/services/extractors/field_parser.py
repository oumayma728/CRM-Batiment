"""
PaddleOCR et EasyOCR ne renvoient que du texte brut (+ positions) : ils ne "comprennent"
pas qu'un nombre est un TTC plutôt qu'un HT. Ce module fait ce travail avec des regex —
c'est volontairement basique, à durcir une fois que tu vois les vrais échecs sur ton dataset.
C'est aussi ce qui explique généralement pourquoi PaddleOCR/EasyOCR seront plus rapides
mais moins précis que les vision-LLM dans ta matrice finale.
"""
import re
from typing import Optional, List

DATE_RE = re.compile(r"\b(\d{2}/\d{2}/\d{4})\b")
NUMERO_RE = re.compile(r"(?:N[°o]|Facture|FACTURE)\s*:?\s*#?\s*(\d{4}[\s/]+\d+)", re.IGNORECASE)
MONTANT_RE = r"([\d\s.,]+)\s*€?"

TTC_LABELS = [r"TOTAL\s*TTC", r"NET\s*[ÀA]\s*PAYER", r"Montant\s*total"]
HT_LABELS = [r"Total\s*HT(?!\s*\()", r"Total\s*HT\s*Global"]
TVA_LABELS = [r"Total\s*TVA", r"Montant\s*TVA(?!\s*3|\s*17)"]


def _parse_amount(raw: str) -> Optional[float]:
    """'1.553,40' ou '1,553.40' -> 1553.40"""
    raw = raw.strip()
    if "," in raw and "." in raw:
        if raw.rfind(",") > raw.rfind("."):
            raw = raw.replace(".", "").replace(",", ".")
        else:
            raw = raw.replace(",", "")
    elif "," in raw:
        raw = raw.replace(",", ".")
    raw = re.sub(r"[^\d.\-]", "", raw)
    try:
        return float(raw)
    except ValueError:
        return None


def _find_amount_near_label(text: str, label_patterns: List[str]) -> Optional[float]:
    for label in label_patterns:
        m = re.search(label + r"[^\d\-]{0,15}(-?[\d\s.,]+)", text, re.IGNORECASE)
        if m:
            val = _parse_amount(m.group(1))
            if val is not None:
                return val
    return None


def _format_numero_facture(raw_num: Optional[str]) -> Optional[str]:
    if not raw_num:
        return None
    cleaned = raw_num.strip()
    # Si le numéro contient des espaces au lieu d'un slash (ex: "2026 104"), convertir en "2026/104"
    cleaned = re.sub(r"^(\d{4})\s+(\d+)$", r"\1/\2", cleaned)
    # Supprimer les espaces résiduels autour des slashes
    cleaned = re.sub(r"\s*/\s*", "/", cleaned)
    return cleaned


def parse_fields_from_text(text: str) -> dict:
    date_match = DATE_RE.search(text)
    numero_match = NUMERO_RE.search(text)

    raw_num = numero_match.group(1) if numero_match else None
    formatted_num = _format_numero_facture(raw_num)

    fournisseur = None
    for line in text.splitlines()[:15]:
        if "PRONERGY" in line.upper():
            fournisseur = "PRONERGY LUXEMBOURG"
            break

    return {
        "date_facture": date_match.group(1) if date_match else None,
        "numero_facture": formatted_num,
        "nom_fournisseur": fournisseur,
        "montant_ht": _find_amount_near_label(text, HT_LABELS),
        "montant_tva": _find_amount_near_label(text, TVA_LABELS),
        "montant_ttc": _find_amount_near_label(text, TTC_LABELS),
        "produits": [],
    }
