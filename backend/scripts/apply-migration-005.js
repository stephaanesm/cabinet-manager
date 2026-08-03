/**
 * scripts/apply-migration-005.js
 * Applique la migration 005 : tables notifications et sync_log
 * Usage : node scripts/apply-migration-005.js
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

  const sqlPath = path.join(__dirname, '..', 'migrations', 'migration_005_notifications_sync.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    await client.query(sql);
    console.log('✅ Migration 005 appliquée avec succès (notifications + sync_log).');
  } catch (err) {
    console.error('❌ Erreur lors de la migration :', err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
