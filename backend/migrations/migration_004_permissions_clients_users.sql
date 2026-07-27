-- ============================================================================
-- CABINET MANAGER — migration_004_permissions_clients_users.sql
-- Ajout des permissions clients CRUD et users admin dans les rôles système
-- ============================================================================

BEGIN;

-- Administrateur : tout
UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'clients:read:all', 'clients:create:all', 'clients:update:all', 'clients:delete:all',
    'users:read:all', 'users:update:all'
]) WHERE libelle = 'Administrateur' AND est_role_systeme = TRUE;

-- Associe : clients full + users read
UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'clients:read:all', 'clients:create:all', 'clients:update:all',
    'users:read:all'
]) WHERE libelle = 'Associe' AND est_role_systeme = TRUE;

-- Avocat : clients propres
UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'clients:read:assigned', 'clients:create:own', 'clients:update:assigned'
]) WHERE libelle = 'Avocat' AND est_role_systeme = TRUE;

-- Assistant : clients lecture + création
UPDATE roles_acces SET permissions = array_cat(permissions, ARRAY[
    'clients:read:assigned', 'clients:create:own'
]) WHERE libelle = 'Assistant' AND est_role_systeme = TRUE;

COMMIT;
