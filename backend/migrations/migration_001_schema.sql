-- ============================================================================
-- CABINET MANAGER — migration_001_schema.sql
-- Schéma initial de la base de données (Phase 1 — modèle de données)
--
-- Ordre d'application :
--   1. Extensions PostgreSQL
--   2. Types ENUM
--   3. Table cabinets            (racine multi-tenant)
--   4. Table roles_acces         (RBAC)
--   5. Table utilisateurs        (comptes utilisateurs)
--   6. Table clients
--   7. Table dossiers
--   8. Table journal_activite    (audit trail — append-only)
--
-- À appliquer AVANT migration_002_auth_module.sql et grants_app_role.sql.
--
-- Connexion en tant qu'administrateur (cm_admin) lors de l'initialisation.
-- En production, cm_app_user n'a PAS le droit de créer des tables.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- recherche insensible aux accents

-- ============================================================================
-- 1. Types ENUM
-- ============================================================================

-- Libellés de rôle (doit correspondre à l'enum RoleLibelle dans role-acces.entity.ts)
DO $$ BEGIN
    CREATE TYPE role_libelle AS ENUM ('Avocat', 'Assistant', 'Associe', 'Administrateur');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Statuts de dossier (doit correspondre à l'enum DossierStatut dans dossier.entity.ts)
DO $$ BEGIN
    CREATE TYPE dossier_statut AS ENUM ('Ouvert', 'En cours', 'Cloture');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. Table cabinets — racine du modèle multi-tenant
-- Chaque cabinet est un client indépendant. L'isolation entre cabinets est
-- garantie par cabinet_id dans toutes les tables métier (voir DossiersService
-- et l'isolation stricte documentée dans le code).
-- ============================================================================
CREATE TABLE IF NOT EXISTS cabinets (
    id          BIGSERIAL PRIMARY KEY,
    nom         VARCHAR(150) NOT NULL,
    adresse     VARCHAR(255),
    telephone   VARCHAR(30),
    actif       BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE cabinets IS 'Racine du modèle multi-tenant — un cabinet = un client SaaS.';

-- ============================================================================
-- 3. Table roles_acces — RBAC
-- Un rôle porte un tableau de permissions au format "ressource:action:portée"
-- (voir common/rbac/permission.util.ts). Les rôles système (est_role_systeme)
-- sont partagés entre tous les cabinets (cabinet_id NULL).
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles_acces (
    id                  BIGSERIAL PRIMARY KEY,
    cabinet_id          BIGINT REFERENCES cabinets(id) ON DELETE CASCADE,
    libelle             role_libelle NOT NULL,
    permissions         TEXT[] NOT NULL DEFAULT '{}',
    est_role_systeme    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Un libellé de rôle est unique par cabinet (NULL = rôle système partagé)
    CONSTRAINT uq_roles_acces_cabinet_libelle UNIQUE (cabinet_id, libelle)
);

CREATE INDEX IF NOT EXISTS idx_roles_acces_cabinet ON roles_acces(cabinet_id);

COMMENT ON TABLE roles_acces IS 'Rôles RBAC. est_role_systeme=true → partagé entre tous les cabinets (cabinet_id NULL).';
COMMENT ON COLUMN roles_acces.permissions IS 'Tableau de chaînes "ressource:action:portee" interprété par permission.util.ts.';

-- ============================================================================
-- 4. Table utilisateurs — comptes des avocats, assistants, associés, admins
-- IMPORTANT SÉCURITÉ :
--   • mot_de_passe_hash : haché argon2id (jamais en clair, voir AuthService)
--   • authentif_2fa_secret : chiffré AES-256-GCM côté applicatif avant
--     stockage (voir TwoFactorService.chiffrer)
--   • La colonne version est incrémentée à chaque UPDATE par le trigger
--     ci-dessous, utilisée pour la concurrence optimiste (sync hors-ligne)
-- ============================================================================
CREATE TABLE IF NOT EXISTS utilisateurs (
    id                      BIGSERIAL PRIMARY KEY,
    cabinet_id              BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    role_acces_id           BIGINT NOT NULL REFERENCES roles_acces(id) ON DELETE RESTRICT,
    nom                     VARCHAR(150) NOT NULL,
    email                   VARCHAR(150) NOT NULL,
    mot_de_passe_hash       VARCHAR(255) NOT NULL,
    role                    role_libelle NOT NULL,
    authentif_2fa_actif     BOOLEAN NOT NULL DEFAULT FALSE,
    authentif_2fa_secret    VARCHAR(255),           -- Chiffré AES-256-GCM
    actif                   BOOLEAN NOT NULL DEFAULT TRUE,
    derniere_connexion      TIMESTAMPTZ,
    -- Colonnes anti-bruteforce (voir aussi migration_002 qui les ajoute en ALTER
    -- si ce schéma de base n'est pas disponible)
    echecs_connexion        INTEGER NOT NULL DEFAULT 0,
    verrouille_jusqu_a      TIMESTAMPTZ,
    version                 INTEGER NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ,            -- Soft delete

    CONSTRAINT uq_utilisateurs_email_cabinet UNIQUE (cabinet_id, email)
);

CREATE INDEX IF NOT EXISTS idx_utilisateurs_email     ON utilisateurs(email)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_utilisateurs_cabinet   ON utilisateurs(cabinet_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_utilisateurs_role      ON utilisateurs(role);

COMMENT ON TABLE utilisateurs IS 'Comptes utilisateurs. Soft delete via deleted_at. mot_de_passe_hash = argon2id.';
COMMENT ON COLUMN utilisateurs.authentif_2fa_secret IS 'Secret TOTP chiffré AES-256-GCM par TwoFactorService avant stockage.';
COMMENT ON COLUMN utilisateurs.version IS 'Incrémenté automatiquement à chaque UPDATE (trigger) — concurrence optimiste.';

-- ============================================================================
-- 5. Trigger : incrémentation automatique de `version` et `updated_at`
--    Appliqué sur utilisateurs, clients, dossiers (toutes les tables qui
--    participent à la synchronisation hors-ligne de l'application mobile).
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_version_and_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.version    := OLD.version + 1;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- utilisateurs
DO $$ BEGIN
    CREATE TRIGGER tg_utilisateurs_version
        BEFORE UPDATE ON utilisateurs
        FOR EACH ROW EXECUTE FUNCTION increment_version_and_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 6. Table clients
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id              BIGSERIAL PRIMARY KEY,
    cabinet_id      BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    nom_complet     VARCHAR(200) NOT NULL,
    telephone       VARCHAR(30),
    email           VARCHAR(150),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_clients_cabinet ON clients(cabinet_id) WHERE deleted_at IS NULL;
-- Wrapper IMMUTABLE requis pour utiliser unaccent() dans un index GIN
CREATE OR REPLACE FUNCTION unaccent_immutable(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT unaccent($1);
$$;
-- Recherche insensible à la casse et aux accents sur le nom
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE INDEX IF NOT EXISTS idx_clients_nom_trgm ON clients USING gin (unaccent_immutable(nom_complet) gin_trgm_ops)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE clients IS 'Clients du cabinet (personnes physiques ou morales).';

DO $$ BEGIN
    CREATE TRIGGER tg_clients_version
        BEFORE UPDATE ON clients
        FOR EACH ROW EXECUTE FUNCTION increment_version_and_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 7. Table dossiers (affaires)
-- Points de conception importants :
--   • numero_affaire : généré à l'ouverture selon la convention du cabinet,
--     unique par cabinet
--   • client_uuid : UUID généré côté mobile pour les créations hors-ligne
--     (idempotence — voir CreateDossierDto.clientUuid)
--   • version : concurrence optimiste (voir UpdateDossierDto.versionConnue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dossiers (
    id                      BIGSERIAL PRIMARY KEY,
    cabinet_id              BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    client_id               BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    avocat_responsable_id   BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
    numero_affaire          VARCHAR(50) NOT NULL,
    titre                   VARCHAR(255) NOT NULL,
    statut                  dossier_statut NOT NULL DEFAULT 'Ouvert',
    date_ouverture          DATE NOT NULL DEFAULT CURRENT_DATE,
    date_cloture            DATE,
    juridiction             VARCHAR(150),
    notes                   TEXT,
    client_uuid             UUID,                   -- Idempotence création hors-ligne
    version                 INTEGER NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT uq_dossiers_numero_cabinet UNIQUE (cabinet_id, numero_affaire),
    -- Idempotence : un UUID mobile ne peut créer qu'un seul dossier par cabinet
    CONSTRAINT uq_dossiers_client_uuid_cabinet UNIQUE (cabinet_id, client_uuid)
);

CREATE INDEX IF NOT EXISTS idx_dossiers_cabinet         ON dossiers(cabinet_id)             WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dossiers_client          ON dossiers(client_id)              WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dossiers_avocat          ON dossiers(avocat_responsable_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dossiers_statut          ON dossiers(statut)                 WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dossiers_cabinet_statut  ON dossiers(cabinet_id, statut)     WHERE deleted_at IS NULL;
-- Tri par date d'ouverture (liste dossiers récents)
CREATE INDEX IF NOT EXISTS idx_dossiers_date_ouverture  ON dossiers(date_ouverture DESC);

COMMENT ON TABLE dossiers IS 'Dossiers / affaires juridiques. Soft delete. Concurrence optimiste via version.';
COMMENT ON COLUMN dossiers.client_uuid IS 'UUID généré côté mobile pour l''idempotence des créations hors-ligne.';

DO $$ BEGIN
    CREATE TRIGGER tg_dossiers_version
        BEFORE UPDATE ON dossiers
        FOR EACH ROW EXECUTE FUNCTION increment_version_and_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 8. Table journal_activite — audit trail append-only
-- IMPORTANT SÉCURITÉ :
--   • cm_app_user n'a PAS les droits UPDATE ni DELETE sur cette table
--     (voir infrastructure/postgres/grants_app_role.sql — ligne REVOKE)
--   • Toute écriture passe obligatoirement par JournalService.enregistrer()
--   • Les colonnes donnees_avant/donnees_apres stockent des instantanés JSONB
--     des entités avant et après modification pour une traçabilité complète
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_activite (
    id                  BIGSERIAL PRIMARY KEY,
    cabinet_id          BIGINT NOT NULL REFERENCES cabinets(id) ON DELETE RESTRICT,
    utilisateur_id      BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action_effectuee    VARCHAR(100) NOT NULL,       -- ex. "dossier.create", "auth.login"
    entite_type         VARCHAR(50) NOT NULL,        -- ex. "dossier", "utilisateur"
    entite_id           BIGINT NOT NULL,
    donnees_avant       JSONB,                       -- null pour une création
    donnees_apres       JSONB,
    adresse_ip          INET,
    horodatage          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pas d'index sur horodatage seul (très sélectif via cabinet_id d'abord)
CREATE INDEX IF NOT EXISTS idx_journal_cabinet         ON journal_activite(cabinet_id, horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_journal_utilisateur     ON journal_activite(utilisateur_id, horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entite          ON journal_activite(entite_type, entite_id);

COMMENT ON TABLE journal_activite IS
    'Audit trail en écriture seule. cm_app_user n''a PAS les droits UPDATE/DELETE (voir grants_app_role.sql).';
COMMENT ON COLUMN journal_activite.donnees_avant IS 'Instantané JSONB de l''entité avant modification (null = création).';
COMMENT ON COLUMN journal_activite.donnees_apres IS 'Instantané JSONB de l''entité après modification.';

-- ============================================================================
-- 9. Trigger sur roles_acces (updated_at uniquement, pas de version)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    CREATE TRIGGER tg_roles_acces_updated_at
        BEFORE UPDATE ON roles_acces
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 10. Données initiales — rôles système par défaut
-- Ces rôles système (cabinet_id NULL) sont disponibles pour tous les cabinets.
-- Les permissions suivent la convention "ressource:action:portée" de permission.util.ts.
-- ============================================================================
INSERT INTO roles_acces (cabinet_id, libelle, permissions, est_role_systeme)
VALUES
    (NULL, 'Administrateur', ARRAY['*:*:all'], TRUE),
    (NULL, 'Associe', ARRAY[
        'dossiers:read:all', 'dossiers:create:all', 'dossiers:update:all',
        'clients:read:all', 'clients:create:all', 'clients:update:all',
        'journal:read:all'
    ], TRUE),
    (NULL, 'Avocat', ARRAY[
        'dossiers:read:assigned', 'dossiers:create:own', 'dossiers:update:assigned',
        'clients:read:assigned', 'clients:create:own'
    ], TRUE),
    (NULL, 'Assistant', ARRAY[
        'dossiers:read:assigned', 'dossiers:update:assigned',
        'clients:read:assigned'
    ], TRUE)
ON CONFLICT (cabinet_id, libelle) DO NOTHING;

COMMIT;

-- ============================================================================
-- 11. Compte administrateur initial (à exécuter SÉPARÉMENT après la migration)
-- ============================================================================
-- ATTENTION : Ce bloc crée un cabinet de démonstration et un compte admin.
-- Le mot de passe ci-dessous est un HASH ARGON2ID de "Admin@2025!"
-- Il DOIT être changé immédiatement après la première connexion.
--
-- Pour générer un nouveau hash argon2id depuis Node.js :
--   node -e "require('argon2').hash('VotreNouveauMotDePasse').then(h => console.log(h))"
--
-- Identifiants par défaut (à changer impérativement en production) :
--   Email    : admin@cabinetmanager.cm
--   Password : Admin@2025!
-- ============================================================================

BEGIN;

-- Cabinet de démonstration
INSERT INTO cabinets (nom, adresse, telephone, actif)
VALUES ('Cabinet Démonstration', 'Yaoundé, Cameroun', '+237 600 000 000', TRUE)
ON CONFLICT DO NOTHING;

-- Compte administrateur lié au cabinet
DO $$
DECLARE
    v_cabinet_id  BIGINT;
    v_role_id     BIGINT;
    -- Hash argon2id de "Admin@2025!" — CHANGER EN PRODUCTION (voir scripts/seed-admin.js)
    v_pwd_hash    TEXT := '$argon2id$v=19$m=65536,p=4,t=3$Mo2iJWSi435NqqQEvSKRBg$6q1rSjithmye3iSOUtj3CjnJt1Jqkf5eBW+pIpFsy14';
BEGIN
    SELECT id INTO v_cabinet_id FROM cabinets WHERE nom = 'Cabinet Démonstration' LIMIT 1;
    SELECT id INTO v_role_id    FROM roles_acces WHERE libelle = 'Administrateur' AND est_role_systeme = TRUE LIMIT 1;

    IF v_cabinet_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        INSERT INTO utilisateurs (
            cabinet_id, role_acces_id, nom, email,
            mot_de_passe_hash, role, actif,
            created_at, updated_at
        )
        VALUES (
            v_cabinet_id, v_role_id,
            'Administrateur Système',
            'admin@cabinetmanager.cm',
            v_pwd_hash,
            'Administrateur',
            TRUE,
            now(), now()
        )
        ON CONFLICT (cabinet_id, email) DO NOTHING;

        RAISE NOTICE 'Compte admin créé : admin@cabinetmanager.cm';
        RAISE NOTICE '⚠️  Changez le mot de passe immédiatement via /auth/change-password !';
    ELSE
        RAISE WARNING 'Cabinet ou rôle introuvable — compte admin non créé.';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Vérification post-migration (facultative, à exécuter manuellement)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   ORDER BY table_name;
--
-- SELECT libelle, array_length(permissions, 1) AS nb_permissions
--   FROM roles_acces WHERE est_role_systeme = TRUE;
--
-- SELECT id, email, role, actif FROM utilisateurs;

