/**
 * Standalone script: creates/migrates the database.
 * Usage: npm run init-db (from /server)
 */
import 'dotenv/config';
import { runMigrations } from './database.js';

runMigrations();
console.log('[db] database is ready.');
