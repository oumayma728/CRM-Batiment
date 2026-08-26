"""
Configuration SQLAlchemy -- base SQLite locale.

Le fichier documents.db est cree automatiquement au demarrage de l'application.
init_db() doit etre appele une fois au startup (via le lifespan de FastAPI).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator

from app.config import get_settings

Base = declarative_base()

_engine = None
_SessionLocal = None


def _get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False},  # requis pour SQLite + FastAPI
            echo=False,
        )
    return _engine


def _get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_get_engine())
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Dependency FastAPI : fournit une session DB et la ferme apres la requete."""
    SessionLocal = _get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Cree toutes les tables si elles n'existent pas encore."""
    # Import des modeles pour que Base.metadata les connaisse
    import app.models.facture_models  # noqa: F401
    Base.metadata.create_all(bind=_get_engine())
