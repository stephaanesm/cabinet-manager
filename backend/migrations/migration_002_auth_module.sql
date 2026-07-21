-- ============================================================================
-- CABINET MANAGER — migration_002_auth_module.sql
-- Module 3.1 (Authentification & RBAC) — à appliquer APRÈS
-- schema_cabinet_manager.sql et AVANT grants_app_role.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Protection anti-bruteforce sur la table utilisateurs
--    (voir UsersService.enregistrerEchecConnexion / estVerrouille)
-- ----------------------------------------------------------------------------
ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS echecs_connexion   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verrouille_jusqu_a  TIMESTAMPTZ;

COMMENT ON COLUMN utilisateurs.echecs_connexion IS
    'Nombre de tentatives de connexion consécutives échouées. Remis à 0 à chaque connexion réussie.';
COMMENT ON COLUMN utilisateurs.verrouille_jusqu_a IS
    'Si renseigné et dans le futur, le compte est temporairement verrouillé (voir MAX_TENTATIVES_CONNEXION dans users.service.ts).';

-- ----------------------------------------------------------------------------
-- 2. Jetons de rafraîchissement (refresh tokens)
--    Un jeton n'est JAMAIS stocké en clair : seule son empreinte SHA-256 l'est
--    (voir TokenService.hacherToken). Voir token.service.ts pour le détail du
--    mécanisme de rotation et de détection de réutilisation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    appareil_id     VARCHAR(100) NOT NULL,
    token_hash      VARCHAR(64) NOT NULL,   -- SHA-256 hex = 64 caractères
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    used            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_utilisateur_appareil
    ON refresh_tokens(utilisateur_id, appareil_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiration ON refresh_tokens(expires_at);
-- ^ utilisé par TokenService.purgerJetonsExpires (tâche de maintenance planifiée)

-- ----------------------------------------------------------------------------
-- 3. Historique des mots de passe
--    Permet d'appliquer la règle "interdiction de réutiliser les 5 derniers
--    mots de passe" (spécifications de sécurité, section 4.7).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mots_de_passe_historique (
    id                  BIGSERIAL PRIMARY KEY,
    utilisateur_id      BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    mot_de_passe_hash   VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdp_historique_utilisateur ON mots_de_passe_historique(utilisateur_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Journalisation des tentatives de connexion (complète journal_activite
--    pour les événements spécifiques à l'authentification : utile pour
--    détecter un pattern d'attaque par force brute distribuée entre
--    plusieurs comptes, que le compteur par-compte seul ne détecterait pas).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tentatives_connexion (
    id              BIGSERIAL PRIMARY KEY,
    email_tente     VARCHAR(150) NOT NULL,
    succes          BOOLEAN NOT NULL,
    adresse_ip      INET,
    horodatage      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tentatives_connexion_email ON tentatives_connexion(email_tente, horodatage DESC);
CREATE INDEX IF NOT EXISTS idx_tentatives_connexion_ip ON tentatives_connexion(adresse_ip, horodatage DESC);
