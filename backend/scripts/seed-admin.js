/**
 * scripts/seed-admin.js
 * Initialise le cabinet principal et crée ou met à jour le compte administrateur initial.
 * Hash argon2id sécurisé.
 * Usage : node scripts/seed-admin.js
 */
const argon2 = require('argon2');
const { Client } = require('pg');

async function run() {
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const email    = process.env.ADMIN_EMAIL    || 'admin@cabinetmanager.cm';
  const nom      = process.env.ADMIN_NOM      || 'Maître Administrateur';

  console.log(`Génération du hash argon2id pour ${email}...`);
  const hash = await argon2.hash(password);

  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'cabinet_manager',
    user:     process.env.DB_USER     || 'cm_admin',
    password: process.env.DB_PASSWORD || 'devpassword123',
  });

  await client.connect();

  try {
    // 1. Assurer l'existence d'un cabinet par défaut
    let cabinetId = 1;
    const cabRes = await client.query('SELECT id FROM cabinets ORDER BY id LIMIT 1');
    if (cabRes.rows.length > 0) {
      cabinetId = cabRes.rows[0].id;
    } else {
      const newCab = await client.query(
        "INSERT INTO cabinets (nom, adresse, telephone) VALUES ('Cabinet Juridique Principal', 'Yaoundé, Cameroun', '+237 600 000 000') RETURNING id"
      );
      cabinetId = newCab.rows[0].id;
      console.log(`✓ Cabinet créé avec l'ID #${cabinetId}`);
    }

    // 2. Assurer l'existence d'un rôle d'accès
    let roleAccesId = 1;
    const roleRes = await client.query("SELECT id FROM roles_acces WHERE libelle = 'Administrateur' LIMIT 1");
    if (roleRes.rows.length > 0) {
      roleAccesId = roleRes.rows[0].id;
    } else {
      const newRole = await client.query(
        "INSERT INTO roles_acces (cabinet_id, libelle, permissions, est_role_systeme) VALUES ($1, 'Administrateur', ARRAY['*:*:*'], true) RETURNING id",
        [cabinetId]
      );
      roleAccesId = newRole.rows[0].id;
      console.log(`✓ Rôle Administrateur créé avec l'ID #${roleAccesId}`);
    }

    // 3. Vérifier et Insérer / Mettre à jour l'utilisateur admin
    const userCheck = await client.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);

    if (userCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO utilisateurs (cabinet_id, role_acces_id, nom, email, mot_de_passe_hash, role, authentif_2fa_actif, actif)
         VALUES ($1, $2, $3, $4, $5, 'Administrateur', false, true)`,
        [cabinetId, roleAccesId, nom, email, hash]
      );
      console.log(`✓ Compte administrateur créé avec succès pour ${email}`);
    } else {
      await client.query(
        'UPDATE utilisateurs SET mot_de_passe_hash = $1, actif = true WHERE email = $2',
        [hash, email]
      );
      console.log(`✓ Mot de passe mis à jour avec succès pour l'administrateur ${email}`);
    }
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Erreur Seed Admin:', err.message);
  process.exit(1);
});
