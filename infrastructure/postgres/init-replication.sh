#!/bin/bash
# ==============================================================================
# CABINET MANAGER — init-replication.sh
# Exécuté une seule fois à la création du conteneur postgres-primary
# (docker-entrypoint-initdb.d). Crée le rôle de réplication, le rôle applicatif
# à droits restreints, et le rôle de sauvegarde.
# ==============================================================================
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

    -- Rôle de réplication (utilisé uniquement par postgres-replica)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_REPLICATION_USER}') THEN
            CREATE ROLE ${POSTGRES_REPLICATION_USER} WITH REPLICATION LOGIN PASSWORD '${POSTGRES_REPLICATION_PASSWORD}';
        END IF;
    END
    \$\$;

    -- Rôle applicatif : lecture/écriture sur les tables métier, mais AUCUN droit
    -- UPDATE/DELETE sur journal_activite (intégrité de la traçabilité, cf.
    -- spécifications de sécurité section 4.5)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cm_app_user') THEN
            CREATE ROLE cm_app_user WITH LOGIN PASSWORD '${CM_APP_USER_PASSWORD}';
        END IF;
    END
    \$\$;
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO cm_app_user;

    -- Rôle de sauvegarde : lecture seule, utilisé exclusivement par pg_dump
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cm_backup_user') THEN
            CREATE ROLE cm_backup_user WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
        END IF;
    END
    \$\$;
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO cm_backup_user;
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public GRANT SELECT ON TABLES TO cm_backup_user;

    -- Slot de réplication physique nommé, pour éviter la purge prématurée des WAL
    SELECT pg_create_physical_replication_slot('replica_slot_1')
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica_slot_1'
    );

EOSQL

echo "[init-replication] Rôles et slot de réplication initialisés avec succès."
