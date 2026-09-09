"""
Logging structuré pour tracer chaque appel API : provider, modèle, modalité,
latence, tokens, coût estimé, succès/échec.

Répond à l'exigence de la tâche ToolRegistry : "logging structuré pour chaque
appel API", et alimente directement les scripts de benchmark qui ont besoin
de logger latence/coûts pour chaque appel modèle.
"""
import json
import logging
import time
from contextlib import contextmanager

logger = logging.getLogger("toolregistry")
logger.setLevel(logging.INFO)

if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_handler)


@contextmanager
def log_api_call(provider: str, model: str, modality: str):
    """
    Context manager qui logue automatiquement chaque appel API en JSON structuré.

    Usage:
        with log_api_call("openai", "gpt-4o-mini", "texte") as ctx:
            response = call_api(...)
            ctx["tokens_input"] = response.usage.prompt_tokens
            ctx["tokens_output"] = response.usage.completion_tokens

    Le dict `ctx` est mutable : l'appelant peut y ajouter tokens/coût avant
    la fin du bloc `with`. `latence_ms` et `succes` sont calculés automatiquement.
    """
    ctx = {
        "provider": provider,
        "model": model,
        "modality": modality,
        "tokens_input": None,
        "tokens_output": None,
        "cout_estime_usd": None,
    }
    start = time.perf_counter()
    try:
        yield ctx
        ctx["succes"] = True
    except Exception as e:
        ctx["succes"] = False
        ctx["erreur"] = str(e)
        raise
    finally:
        ctx["latence_ms"] = round((time.perf_counter() - start) * 1000, 2)
        logger.info(json.dumps(ctx, ensure_ascii=False, default=str))
