"""Charge le .env à la racine du projet (scripts locaux et serveur de dev)."""
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
