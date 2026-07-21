#!/usr/bin/env node
/**
 * backend/scripts/seed-admin.js
 * ---------------------------------------------------------------------------
 * Génère le hash argon2id du mot de passe admin et affiche la commande SQL
 * complète à exécuter pour créer le compte administrateur initial.
 *
 * Usage (depuis le répertoire backend/) :
 *   node scripts/seed-admin.js
 *
 * Le mot de passe peut être changé via la variable d'env ADMIN_PASSWORD :
 *   ADMIN_PASSWORD="MonMotDePasse!2025" node scripts/seed-admin.js
 * ---------------------------------------------------------------------------
 */
const argon2 = require('argon2');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@cabinetmanager.cm';
const ADMIN_NOM      = process.env.ADMIN_NOM      || 'Administrateur Système';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2025!';
const CABINET_NOM    = process.env.CABINET_NOM    || 'Cabinet Démonstration';

async function main() {
  console.log('Génération du hash argon2id...');
  const hash = await argon2.hash(ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  console.log('\n============================================================');
  console.log('CREDENTIALS ADMIN GÉNÉRÉS');
  console.log('============================================================');
  console.log(`Email    : ${ADMIN_EMAIL}`);
  console.log(`Password : ${ADMIN_PASSWORD}`);
  console.log(`Hash     : ${hash}`);
  console.log('\n⚠️  CHANGEZ le mot de passe immédiatement après la première connexion !');
  console.log('============================================================\n');

  console.log('-- SQL à exécuter sur la base de données :');
  console.log(`
BEGIN;

INSERT INTO cabinets (nom, adresse, telephone, actif)
VALUES ('${CABINET_NOM}', 'Yaoundé, Cameroun', '+237 600 000 000', TRUE)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    v_cabinet_id  BIGINT;
    v_role_id     BIGINT;
BEGIN
    SELECT id INTO v_cabinet_id FROM cabinets WHERE nom = '${CABINET_NOM}' LIMIT 1;
    SELECT id INTO v_role_id    FROM roles_acces WHERE libelle = 'Administrateur' AND est_role_systeme = TRUE LIMIT 1;

    INSERT INTO utilisateurs (
        cabinet_id, role_acces_id, nom, email,
        mot_de_passe_hash, role, actif,
        created_at, updated_at
    )
    VALUES (
        v_cabinet_id, v_role_id,
        '${ADMIN_NOM}',
        '${ADMIN_EMAIL}',
        '${hash}',
        'Administrateur',
        TRUE,
        now(), now()
    )
    ON CONFLICT (cabinet_id, email) DO NOTHING;

    RAISE NOTICE 'Compte admin créé : ${ADMIN_EMAIL}';
END $$;

COMMIT;
`);
}

main().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
