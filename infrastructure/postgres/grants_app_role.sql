-- ==============================================================================
-- CABINET MANAGER — grants_app_role.sql
-- À exécuter UNE FOIS APRÈS l'application de schema_cabinet_manager.sql.
-- Applique le principe de moindre privilège : le rôle applicatif cm_app_user
-- ne doit jamais pouvoir modifier ou supprimer une entrée du journal d'activité,
-- conformément au modèle de sécurité (section 4.5 — Journalisation intègre).
-- ==============================================================================

-- Droits standards CRUD pour le rôle applicatif sur les tables métier
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cm_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cm_app_user;

-- Restriction stricte sur la table d'audit : uniquement lecture et ajout,
-- jamais de modification ni de suppression, même par l'application elle-même.
REVOKE UPDATE, DELETE ON journal_activite FROM cm_app_user;
GRANT  SELECT, INSERT ON journal_activite TO cm_app_user;

-- Le rôle de sauvegarde ne doit jamais pouvoir écrire quoi que ce soit
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM cm_backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cm_backup_user;

-- S'assurer que les futures tables héritent des mêmes règles par défaut
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cm_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO cm_backup_user;
