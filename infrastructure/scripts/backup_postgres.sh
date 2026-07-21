#!/bin/bash
# ==============================================================================
# CABINET MANAGER — backup_postgres.sh
# 2.2 Base de données — sauvegarde logique quotidienne automatisée
#
# Exécuté chaque nuit à 02h00 (voir crontab dans le service postgres-backup).
# Procédure :
#   1. Dump logique complet (pg_dump, format custom, compressé)
#   2. Upload vers le bucket de sauvegarde MinIO/S3
#   3. Purge des sauvegardes locales et distantes plus anciennes que RETENTION_DAYS
#   4. Écriture d'un fichier de statut consommé par la supervision (monitoring)
# ==============================================================================
set -euo pipefail

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="/tmp/backups"
BACKUP_FILE="${BACKUP_DIR}/cabinet_manager_${TIMESTAMP}.dump"
STATUS_FILE="/var/log/backup_status.json"

mkdir -p "$BACKUP_DIR"

echo "[backup] Démarrage de la sauvegarde ${TIMESTAMP}"

# ---- 1. Dump logique (format custom : permet une restauration sélective table par table) ----
if pg_dump \
    --host="$PGHOST" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --format=custom \
    --compress=6 \
    --file="$BACKUP_FILE"; then
    echo "[backup] Dump réussi : ${BACKUP_FILE} ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    echo "[backup] ÉCHEC du pg_dump" >&2
    echo "{\"date\":\"${TIMESTAMP}\",\"statut\":\"echec\",\"etape\":\"pg_dump\"}" > "$STATUS_FILE"
    exit 1
fi

# ---- 2. Upload vers MinIO (client mc, configuré à la volée) ----
mc alias set backupstore "http://${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null

if mc cp "$BACKUP_FILE" "backupstore/${BACKUP_BUCKET}/$(basename "$BACKUP_FILE")"; then
    echo "[backup] Upload vers le bucket ${BACKUP_BUCKET} réussi"
else
    echo "[backup] ÉCHEC de l'upload vers MinIO" >&2
    echo "{\"date\":\"${TIMESTAMP}\",\"statut\":\"echec\",\"etape\":\"upload\"}" > "$STATUS_FILE"
    exit 1
fi

# ---- 3. Purge des sauvegardes locales (le stockage distant a sa propre politique
#         de cycle de vie, voir minio/lifecycle-policy.json) ----
find "$BACKUP_DIR" -name "*.dump" -mtime +2 -delete
echo "[backup] Sauvegardes locales de plus de 2 jours supprimées"

# ---- 4. Statut pour supervision ----
echo "{\"date\":\"${TIMESTAMP}\",\"statut\":\"succes\",\"fichier\":\"$(basename "$BACKUP_FILE")\"}" > "$STATUS_FILE"
echo "[backup] Sauvegarde ${TIMESTAMP} terminée avec succès."

# Rappel : un test de restauration mensuel sur un environnement isolé est
# obligatoire (voir procédure dans le document Infrastructure_Cabinet_Manager.docx,
# section « Test de restauration »). Une sauvegarde non testée n'est pas une
# sauvegarde fiable.
