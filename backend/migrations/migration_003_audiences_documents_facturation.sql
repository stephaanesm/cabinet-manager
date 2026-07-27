-- ============================================================================
-- CABINET MANAGER — migration_003_audiences_documents_facturation.sql
-- Modules Audiences, GED (Documents) et Facturation
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Table audiences
-- ============================================================================
CREATE TABLE IF NOT EXISTS audiences (
    id              BIGSERIAL PRIMARY KEY,
    cabinet_id      BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    dossier_id      BIGINT NOT NULL REFERENCES dossiers(id) ON DELETE RESTRICT,
    date_audience   TIMESTAMPTZ NOT NULL,
    heure           VARCHAR(10),
    juridiction     VARCHAR(150),
    salle           VARCHAR(100),
    type_audience   VARCHAR(100),
    statut          VARCHAR(30) NOT NULL DEFAULT 'prevue',
    notes           TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audiences_cabinet     ON audiences(cabinet_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audiences_dossier     ON audiences(dossier_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audiences_date        ON audiences(date_audience) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audiences_statut      ON audiences(statut)        WHERE deleted_at IS NULL;

DO $$ BEGIN
    CREATE TRIGGER tg_audiences_version
        BEFORE UPDATE ON audiences
        FOR EACH ROW EXECUTE FUNCTION increment_version_and_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE audiences IS 'Audiences et rendez-vous judiciaires liés aux dossiers.';

-- ============================================================================
-- 2. Table documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id                BIGSERIAL PRIMARY KEY,
    cabinet_id        BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    dossier_id        BIGINT REFERENCES dossiers(id) ON DELETE RESTRICT,
    nom               VARCHAR(255) NOT NULL,
    type_document     VARCHAR(100),
    chemin_fichier    VARCHAR(500),
    taille_ko         INTEGER,
    confidentialite   VARCHAR(30) NOT NULL DEFAULT 'public',
    description       TEXT,
    tags              TEXT[],
    cree_par_id       BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    version           INTEGER NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_cabinet     ON documents(cabinet_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_dossier     ON documents(dossier_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_type        ON documents(type_document) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_confidentialite ON documents(confidentialite) WHERE deleted_at IS NULL;

DO $$ BEGIN
    CREATE TRIGGER tg_documents_version
        BEFORE UPDATE ON documents
        FOR EACH ROW EXECUTE FUNCTION increment_version_and_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE documents IS 'GED — Gestion Électronique des Documents par dossier.';

-- ============================================================================
-- 3. Table factures
-- ============================================================================
CREATE TABLE IF NOT EXISTS factures (
    id                BIGSERIAL PRIMARY KEY,
    cabinet_id        BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    dossier_id        BIGINT NOT NULL REFERENCES dossiers(id) ON DELETE RESTRICT,
    client_id         BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    numero_facture    VARCHAR(50) NOT NULL,
    date_emission     DATE NOT NULL DEFAULT CURRENT_DATE,
    date_echeance     DATE,
    montant_ht        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    taux_tva          NUMERIC(5, 2) NOT NULL DEFAULT 19.25,
    montant_ttc       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    montant_encaisse  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    statut            VARCHAR(30) NOT NULL DEFAULT 'brouillon',
    description       TEXT,
    version           INTEGER NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ,

    CONSTRAINT uq_factures_numero_cabinet UNIQUE (cabinet_id, numero_facture)
);

CREATE INDEX IF NOT EXISTS idx_factures_cabinet      ON factures(cabinet_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_dossier      ON factures(dossier_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_client       ON factures(client_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_statut       ON factures(statut)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factures_echeance     ON factures(date_echeance) WHERE deleted_at IS NULL AND statut NOT IN ('payee', 'brouillon');

DO $$ BEGIN
    CREATE TRIGGER tg_factures_version
        BEFORE UPDATE ON factures
        FOR EACH ROW EXECUTE FUNCTION increment_version_and_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE factures IS 'Factures d''honoraires émises par le cabinet.';

-- ============================================================================
-- 4. Table encaissements
-- ============================================================================
CREATE TABLE IF NOT EXISTS encaissements (
    id              BIGSERIAL PRIMARY KEY,
    cabinet_id      BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    facture_id      BIGINT NOT NULL REFERENCES factures(id) ON DELETE RESTRICT,
    montant         NUMERIC(12, 2) NOT NULL,
    date_paiement   DATE NOT NULL DEFAULT CURRENT_DATE,
    mode_paiement   VARCHAR(50),
    reference       VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encaissements_facture  ON encaissements(facture_id);
CREATE INDEX IF NOT EXISTS idx_encaissements_cabinet  ON encaissements(cabinet_id);

COMMENT ON TABLE encaissements IS 'Paiements reçus sur les factures.';

-- ============================================================================
-- 5. Correction de la requête rentabilite dans dossiers (colonne montant_ht)
-- Le DossiersService.calculerRentabilite() utilise montant_honoraires mais
-- la table réelle s'appelle montant_ht — on crée un alias via une view.
-- ============================================================================
CREATE OR REPLACE VIEW v_rentabilite_dossiers AS
SELECT
    dossier_id,
    COALESCE(SUM(montant_ht), 0)       AS total_facture,
    COALESCE(SUM(montant_encaisse), 0)  AS total_encaisse
FROM factures
WHERE deleted_at IS NULL
GROUP BY dossier_id;

COMMIT;

-- ============================================================================
-- 6. Mise à jour des permissions RBAC pour les nouveaux modules
-- ============================================================================
BEGIN;

UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'audiences:read:all', 'audiences:create:all', 'audiences:update:all',
    'documents:read:all', 'documents:create:all', 'documents:update:all',
    'factures:read:all',  'factures:create:all',  'factures:update:all'
]) WHERE libelle = 'Administrateur' AND est_role_systeme = TRUE;

UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'audiences:read:all', 'audiences:create:all', 'audiences:update:all',
    'documents:read:all', 'documents:create:all', 'documents:update:all',
    'factures:read:all',  'factures:create:all',  'factures:update:all'
]) WHERE libelle = 'Associe' AND est_role_systeme = TRUE;

UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'audiences:read:assigned', 'audiences:create:own', 'audiences:update:assigned',
    'documents:read:assigned', 'documents:create:own', 'documents:update:assigned',
    'factures:read:assigned'
]) WHERE libelle = 'Avocat' AND est_role_systeme = TRUE;

UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'audiences:read:assigned',
    'documents:read:assigned', 'documents:create:own',
    'factures:read:assigned'
]) WHERE libelle = 'Assistant' AND est_role_systeme = TRUE;

COMMIT;
