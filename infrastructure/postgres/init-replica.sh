#!/bin/bash
# ==============================================================================
# CABINET MANAGER — init-replica.sh
# Point d'entrée du conteneur postgres-replica : si le répertoire de données
# est vide, effectue un pg_basebackup depuis la primaire puis démarre Postgres
# en mode standby (streaming replication, lecture seule).
# ==============================================================================
set -e

DATA_DIR="/var/lib/postgresql/data"

if [ -z "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
    echo "[init-replica] Répertoire de données vide : réplication initiale depuis ${PRIMARY_HOST}..."

    # Attendre que la primaire soit disponible
    until pg_isready -h "$PRIMARY_HOST" -U "$PGUSER"; do
        echo "[init-replica] En attente de la primaire (${PRIMARY_HOST})..."
        sleep 2
    done

    pg_basebackup \
        -h "$PRIMARY_HOST" \
        -U "$PGUSER" \
        -D "$DATA_DIR" \
        -Fp -Xs -P -R \
        --slot=replica_slot_1

    # -R génère automatiquement standby.signal + postgresql.auto.conf
    # avec primary_conninfo pointant vers la primaire.
    chmod 700 "$DATA_DIR"

    echo "[init-replica] Base de sauvegarde initiale terminée. Démarrage en mode standby."
else
    echo "[init-replica] Répertoire de données déjà initialisé, démarrage direct."
fi

exec docker-entrypoint.sh postgres
