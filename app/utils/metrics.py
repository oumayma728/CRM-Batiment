from prometheus_client import Counter, Histogram

archai_documents_processed_total = Counter(
    "archai_documents_processed_total",
    "Nombre total de documents traités par ArchAI",
    ["type_document", "status"]
)

archai_processing_time_seconds = Histogram(
    "archai_processing_time_seconds",
    "Temps de traitement de l'extraction par moteur IA",
    ["engine"]
)
