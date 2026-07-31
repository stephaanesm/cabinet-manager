-- ============================================================================
-- CABINET MANAGER — migration_005_notifications_sync.sql
-- Crée les tables manquantes : notifications + sync_log
--
-- À appliquer après migration_004_permissions_clients_users.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Table notifications
-- Stocke les rappels d'audience, alertes de facture, infos système.
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGSERIAL PRIMARY KEY,
    cabinet_id      BIGINT        NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    utilisateur_id  BIGINT        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    titre           VARCHAR(255)  NOT NULL,
    message         TEXT          NOT NULL,
    type            VARCHAR(50)   NOT NULL DEFAULT 'info',
    lu              BOOLEAN       NOT NULL DEFAULT FALSE,
    entite_type     VARCHAR(50)   NULL,
    entite_id       BIGINT        NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_cabinet_user
    ON notifications (cabinet_id, utilisateur_id, lu, created_at DESC);

-- ============================================================================
-- 2. Table sync_log
-- Journal de synchronisation hors-ligne par terminal.
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_log (
    id              BIGSERIAL PRIMARY KEY,
    cabinet_id      BIGINT        NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    utilisateur_id  BIGINT        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    device_id       VARCHAR(128)  NOT NULL,
    synced_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    mutations_count INT           NOT NULL DEFAULT 0,
    conflicts_count INT           NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_log_device
    ON sync_log (cabinet_id, device_id, synced_at DESC);

COMMIT;
