-- ============================================================================
-- CABINET MANAGER — migration_006_expo_push_token.sql
-- Ajoute la colonne expo_push_token sur la table utilisateurs
-- pour l'envoi de notifications push via l'API Expo.
-- ============================================================================

BEGIN;

ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(200) NULL;

COMMENT ON COLUMN utilisateurs.expo_push_token IS
    'Token Expo Push (ExponentPushToken[xxxx]) enregistré par l''appareil mobile au login.';

COMMIT;
