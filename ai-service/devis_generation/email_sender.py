"""Envoi SMTP du PDF de devis. Les identifiants restent uniquement dans .env."""
from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


def send_devis_pdf(recipient: str, reference: str, pdf_content: bytes) -> None:
    host = os.environ.get("SMTP_HOST")
    sender = os.environ.get("SMTP_FROM")
    if not host or not sender:
        raise RuntimeError("SMTP_HOST et SMTP_FROM doivent être configurés pour envoyer le devis.")

    message = EmailMessage()
    message["Subject"] = f"Votre devis {reference}"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        f"Bonjour,\n\nVeuillez trouver en pièce jointe votre devis {reference}.\n\nCordialement."
    )
    message.add_attachment(
        pdf_content,
        maintype="application",
        subtype="pdf",
        filename=f"{reference}.pdf",
    )

    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    starttls = os.environ.get("SMTP_STARTTLS", "true").lower() not in {"0", "false", "no"}
    with smtplib.SMTP(host, port, timeout=30) as smtp:
        if starttls:
            smtp.starttls()
        if username:
            smtp.login(username, password or "")
        smtp.send_message(message)
