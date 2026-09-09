"""Production d'un PDF de devis autonome, sans dépendance externe."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable


def _safe_text(value: object) -> str:
    """Texte compatible avec la police PDF standard Helvetica (WinAnsi)."""
    return (
        str(value if value is not None else "")
        .replace("€", "EUR")
        .replace("–", "-")
        .replace("—", "-")
        .encode("cp1252", "replace")
        .decode("cp1252")
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _eur(value: object) -> str:
    return f"{float(value or 0):,.2f} EUR".replace(",", " ").replace(".", ",")


def _line(text: str, x: int, y: int, size: int = 10, bold: bool = False) -> str:
    font = "F2" if bold else "F1"
    return f"BT /{font} {size} Tf {x} {y} Td ({_safe_text(text)}) Tj ET"


def _page_stream(lines: Iterable[str]) -> bytes:
    return ("\n".join(lines) + "\n").encode("cp1252", "replace")


def build_devis_pdf(export: dict) -> bytes:
    """Construit le PDF à joindre à l'e-mail à partir du devis persisté."""
    devis = export["devis"]
    lignes = export["lignes"]
    client = " ".join(filter(None, [devis.get("client_prenom"), devis.get("client_nom")]))
    date = devis.get("dateCreation")
    if isinstance(date, datetime):
        date_text = date.strftime("%d/%m/%Y")
    else:
        date_text = str(date or "")[:10]

    pages: list[list[str]] = []
    current = [
        _line(devis.get("company_nom") or "Entreprise", 45, 800, 18, True),
        _line(devis.get("company_adresse") or "", 45, 782),
        _line(devis.get("company_email") or "", 45, 767),
        _line("DEVIS", 430, 800, 18, True),
        _line(f"Référence : {devis.get('reference', '')}", 390, 780),
        _line(f"Date : {date_text}", 390, 765),
        _line(f"Client : {client}", 45, 722, 12, True),
        _line("Description", 45, 690, 10, True),
        _line("Qté", 335, 690, 10, True),
        _line("P.U. HT", 415, 690, 10, True),
        _line("Total HT", 505, 690, 10, True),
    ]
    y = 670
    for row in lignes:
        if y < 85:
            pages.append(current)
            current = [
                _line(f"DEVIS {devis.get('reference', '')} (suite)", 45, 800, 14, True),
                _line("Description", 45, 770, 10, True),
                _line("Qté", 335, 770, 10, True),
                _line("P.U. HT", 415, 770, 10, True),
                _line("Total HT", 505, 770, 10, True),
            ]
            y = 750
        description = str(row.get("description") or "Ligne de devis")
        if len(description) > 47:
            description = description[:44] + "..."
        current.extend(
            [
                _line(description, 45, y),
                _line(f"{row.get('quantite', 0)} {row.get('unite', '')}", 335, y),
                _line(_eur(row.get("prixUnitaireVente")), 415, y),
                _line(_eur(row.get("totalHT")), 505, y),
            ]
        )
        y -= 20

    current.extend(
        [
            _line(f"Total HT : {_eur(devis.get('totalHT'))}", 390, max(y - 20, 60), 11, True),
            _line(f"TVA ({devis.get('tauxTVA', 0)} %) : {_eur(devis.get('totalTVA'))}", 390, max(y - 38, 42)),
            _line(f"Total TTC : {_eur(devis.get('totalTTC'))}", 390, max(y - 58, 24), 12, True),
        ]
    )
    pages.append(current)

    # Mini-écrivain PDF : pages, contenu et police Helvetica standard.
    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"",  # Pages, rempli après avoir déterminé les identifiants.
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    page_ids = []
    for page in pages:
        stream = _page_stream(page)
        content_id = len(objects) + 1
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"endstream")
        page_id = len(objects) + 1
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources "
            f"<< /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_id} 0 R >>".encode()
        )
        page_ids.append(page_id)
    objects[1] = f"<< /Type /Pages /Kids [{' '.join(f'{n} 0 R' for n in page_ids)}] /Count {len(page_ids)} >>".encode()

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out.extend(f"{index} 0 obj\n".encode())
        out.extend(obj)
        out.extend(b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    out.extend(b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets[1:]))
    out.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(out)
