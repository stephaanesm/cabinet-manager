/**
 * scripts/seed-admin.js
 * Crée ou met à jour le compte administrateur initial avec un hash argon2id valide.
 * Usage : node scripts/seed-admin.js
 */
const argon2 = require('argon2');
const { Client } = require('pg');

async function run() {
  const password = process.env.ADMIN_PASSWORD || 'Admin@2025!';
  const email    = process.env.ADMIN_EMAIL    || 'admin@cabinetmanager.cm';

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

  // Vérifie que l'utilisateur existe
  const check = await client.query(
    'SELECT id FROM utilisateurs WHERE email = $1',
    [email]
  );

  if (check.rows.length === 0) {
    console.error(`Utilisateur ${email} introuvable. Assurez-vous que les migrations ont été exécutées.`);
    await client.end();
    process.exit(1);
  }

  await client.query(
    'UPDATE utilisateurs SET mot_de_passe_hash = $1 WHERE email = $2',
    [hash, email]
  );

  console.log(`✓ Mot de passe mis à jour pour ${email}`);
  console.log(`  Hash : ${hash.substring(0, 30)}...`);

  await client.end();
}

run().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
