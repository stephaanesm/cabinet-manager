/**
 * scripts/apply-migration-006.js
 * Applique la migration 006 : colonne expo_push_token sur utilisateurs
 * Usage : node scripts/apply-migration-006.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'cabinet_manager',
    user:     process.env.DB_USER     || 'cm_admin',
    password: process.env.DB_PASSWORD || 'devpassword123',
  });

  await client.connect();
  console.log('Connecté à PostgreSQL.');

  const sqlPath = path.join(__dirname, '..', 'migrations', 'migration_006_expo_push_token.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    await client.query(sql);
    console.log('✅ Migration 006 appliquée avec succès (expo_push_token).');
  } catch (err) {
    console.error('❌ Erreur lors de la migration :', err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
