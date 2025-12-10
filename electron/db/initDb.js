/* eslint-env node */

const path = require("path");
const Database = require("better-sqlite3");

// Emplacement du fichier SQLite.
// Pour un vrai projet Electron, on pourrait utiliser app.getPath("userData")
// et passer le chemin depuis main.js. Pour ce module, on reste simple.
const DB_FILE = path.join(__dirname, "excel2sqlite.db");

let dbInstance = null;

/**
 * Crée une nouvelle connexion SQLite configurée.
 */
function createDb() {
  const db = new Database(DB_FILE);

  // Quelques pragmas raisonnables pour une petite app desktop
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  ensureBaseSchema(db);

  return db;
}

/**
 * Retourne l'instance unique de la base.
 * L'initialisation est lazy : la DB est ouverte à la première utilisation.
 */
function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

/**
 * Crée les tables de base si elles n'existent pas.
 * Ici on garde un exemple minimal avec "users", pour la démo.
 * Tu pourrais ensuite factoriser ça dans un vrai "schema.js".
 */
function ensureBaseSchema(db) {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      firstname TEXT,
      age INTEGER
    );
  `;

  db.exec(createUsersTable);
}

/**
 * Liste les tables "utiles" de la base (hors tables internes SQLite).
 */
function getTables() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `);
  return stmt.all();
}

/**
 * Retourne la description des colonnes d'une table.
 * Utilise PRAGMA table_info, très pratique pour le mapping.
 */
function getColumns(tableName) {
  if (!tableName) return [];

  const db = getDb();

  // Petite protection basique contre l'injection dans le nom de table
  const safeName = String(tableName).replace(/[^a-zA-Z0-9_]/g, "");
  if (safeName !== tableName) {
    throw new Error("Nom de table invalide");
  }

  const stmt = db.prepare(`PRAGMA table_info(${safeName});`);
  return stmt.all();
}

module.exports = {
  getDb,
  getTables,
  getColumns,
};
