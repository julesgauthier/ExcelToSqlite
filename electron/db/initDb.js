/* eslint-env node */

const path = require("path");
const Database = require("better-sqlite3");

// Emplacement du fichier SQLite.
// Pour les tests on autorise l'override via la variable d'environnement TEST_SQLITE_DB_FILE
// (utile pour CI). Sinon on utilise le fichier par défaut dans ce dossier.
const DB_FILE = process.env.TEST_SQLITE_DB_FILE || path.join(__dirname, "excel2sqlite.db");

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
 * Ferme la connexion DB (utile pour les tests afin de supprimer le fichier).
 */
function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      // ignore
    }
    dbInstance = null;
  }
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
  
  // Table pour l'historique des imports
  const createImportLogs = `
    CREATE TABLE IF NOT EXISTS import_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imported_at TEXT NOT NULL,
      table_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      sheet_name TEXT,
      rows_inserted INTEGER,
      mode TEXT,
      has_errors INTEGER
      -- optional JSON column for error details
      , error_details TEXT
    );
  `;

  db.exec(createImportLogs);

  // If the DB already existed before adding error_details, ensure the column exists.
  try {
    const cols = db.prepare("PRAGMA table_info(import_logs);").all();
    const hasErrorDetails = cols.some((c) => c.name === 'error_details');
    if (!hasErrorDetails) {
      db.exec("ALTER TABLE import_logs ADD COLUMN error_details TEXT;");
    }
  } catch (err) {
    // ignore - defensive: ALTER may fail on some edge cases, but it's non-fatal
    console.error('ensure import_logs schema:', err && err.message);
  }
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

/**
 * Retourne les dernières lignes d'une table.
 * @param {string} tableName
 * @param {number} limit
 * @returns {Array<Object>}
 */
function getLastRows(tableName, limit = 20) {
  if (!tableName) return [];

  const db = getDb();

  const safeName = String(tableName).replace(/[^a-zA-Z0-9_]/g, "");
  if (safeName !== tableName) {
    throw new Error("Nom de table invalide");
  }

  const lim = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;

  // On sélectionne toutes les colonnes et on retourne les dernières lignes
  // basées sur rowid (comportement générique pour SQLite).
  const sql = `SELECT * FROM ${safeName} ORDER BY rowid DESC LIMIT ?`;
  const stmt = db.prepare(sql);
  const rows = stmt.all(lim);

  return rows;
}

/**
 * Ajoute une entrée dans import_logs
 * @param {object} log { imported_at, table_name, file_path, sheet_name, rows_inserted, mode, has_errors }
 */
function addImportLog(log) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO import_logs (imported_at, table_name, file_path, sheet_name, rows_inserted, mode, has_errors)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const res = stmt.run(
    log.imported_at,
    log.table_name,
    log.file_path,
    log.sheet_name || null,
    Number.isFinite(Number(log.rows_inserted)) ? Number(log.rows_inserted) : 0,
    log.mode || null,
    log.has_errors ? 1 : 0
  );

  return res.lastInsertRowid;
}

function addImportLogWithErrors(log) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO import_logs (imported_at, table_name, file_path, sheet_name, rows_inserted, mode, has_errors, error_details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const errorDetails = log.error_details ? JSON.stringify(log.error_details) : null;

  const res = stmt.run(
    log.imported_at,
    log.table_name,
    log.file_path,
    log.sheet_name || null,
    Number.isFinite(Number(log.rows_inserted)) ? Number(log.rows_inserted) : 0,
    log.mode || null,
    log.has_errors ? 1 : 0,
    errorDetails
  );

  return res.lastInsertRowid;
}

/**
 * Récupère les derniers imports
 * @param {number} limit
 */
function getImportLogs(limit = 50) {
  const db = getDb();
  const lim = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 50;
  const stmt = db.prepare(`SELECT * FROM import_logs ORDER BY id DESC LIMIT ?`);
  const rows = stmt.all(lim);
  // parse json details if present
  return rows.map((r) => {
    try {
      return {
        ...r,
        error_details: r.error_details ? JSON.parse(r.error_details) : null,
      };
    } catch (e) {
      return { ...r, error_details: null };
    }
  });
}

module.exports = {
  getDb,
  getTables,
  getColumns,
  getLastRows,
  addImportLog,
  addImportLogWithErrors,
  getImportLogs,
  closeDb,
};
