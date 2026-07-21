#!/bin/bash
# ==============================================================================
# CABINET MANAGER — restore_postgres.sh
# 2.2 Base de données — procédure de restauration à partir d'une sauvegarde
#
# Usage : ./restore_postgres.sh <nom_du_fichier_dump> [--target-db=nom_alternatif]
#
# Par défaut, restaure dans une base temporaire "cabinet_manager_restore_test"
# afin de ne jamais écraser la base de production par erreur. Pour une
# restauration réelle en production (reprise après sinistre), utiliser
# --target-db=cabinet_manager explicitement, en toute connaissance de cause.
# ==============================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <nom_du_fichier_dump> [--target-db=nom_alternatif]"
    exit 1
fi

DUMP_FILE="$1"
TARGET_DB="cabinet_manager_restore_test"

for arg in "$@"; do
    case $arg in
        --target-db=*) TARGET_DB="${arg#*=}" ;;
    esac
done

LOCAL_PATH="/tmp/restore/${DUMP_FILE}"
mkdir -p /tmp/restore

echo "[restore] Téléchargement de ${DUMP_FILE} depuis le bucket ${BACKUP_BUCKET}..."
mc alias set backupstore "http://${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null
mc cp "backupstore/${BACKUP_BUCKET}/${DUMP_FILE}" "$LOCAL_PATH"

echo "[restore] Création de la base cible '${TARGET_DB}' (si absente)..."
psql --host="$PGHOST" --username="$PGUSER" --dbname=postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}'" | grep -q 1 || \
psql --host="$PGHOST" --username="$PGUSER" --dbname=postgres -c "CREATE DATABASE ${TARGET_DB};"

echo "[restore] Restauration en cours vers '${TARGET_DB}'..."
pg_restore \
    --host="$PGHOST" \
    --username="$PGUSER" \
    --dbname="$TARGET_DB" \
    --clean --if-exists --no-owner --no-privileges \
    --jobs=4 \
    "$LOCAL_PATH"

echo "[restore] Restauration terminée avec succès dans la base '${TARGET_DB}'."
echo "[restore] Vérifications recommandées avant bascule en production :"
echo "           - Comparer le nombre de lignes des tables clés (dossiers, factures, utilisateurs)"
echo "           - Vérifier la dernière valeur de journal_activite.horodatage"
echo "           - Exécuter les tests d'intégration applicatifs contre '${TARGET_DB}'"
