# Script para concatenar todas las migraciones de Supabase
# Copia el contenido de "migrations-completo.sql" y pégalo en el SQL Editor de Supabase

$migrationsDir = "supabase\migrations"
$outputFile = "migrations-completo.sql"

Get-ChildItem -LiteralPath $migrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    "-- ===== $($_.Name) ====="
    Get-Content $_.FullName -Raw
    "`n"
} | Set-Content $outputFile

Write-Host "✅ Migraciones concatenadas en $outputFile"
Write-Host "👉 Abre $outputFile, copia TODO y pégalo en:"
Write-Host "   https://supabase.com/dashboard/project/iyyeczoamsoiwujbwgjh/sql/new"
