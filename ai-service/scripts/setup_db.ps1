# Initialise la base Docker (tables + donnees test).
# Prerequis : docker compose up -d

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "1/2 - Creation des tables..."
Get-Content "$Root\scripts\create_tables.sql" | docker exec -i devis_ia_db psql -U postgres -d devis_ia_test

Write-Host "2/2 - Insertion des donnees test..."
Get-Content "$Root\scripts\seed_test_data.sql" | docker exec -i devis_ia_db psql -U postgres -d devis_ia_test

Write-Host ""
Write-Host "OK - Base prete."
Write-Host 'Mettre dans .env : DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devis_ia_test'
