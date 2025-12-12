/**
 * Tests unitaires pour la gestion de la base de données SQLite
 * @jest-environment node
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Use a unique DB file for tests to avoid clashing with dev DB
const TEST_DB = path.join(os.tmpdir(), `excel2sqlite_test_${Date.now()}.db`);
process.env.TEST_SQLITE_DB_FILE = TEST_DB;

const { 
  getDb, 
  getTables, 
  getColumns,
  addImportLogWithErrors, 
  getImportLogs, 
  getLastRows, 
  closeDb 
} = require('../electron/db/initDb');

afterAll(() => {
  try {
    closeDb();
  } catch {
    /* ignore cleanup errors during tests */
  }

  try {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  } catch {
    /* ignore cleanup errors during tests */
  }
});

describe('Initialisation de la base de données', () => {
  test('le fichier DB est créé', () => {
    const db = getDb();
    expect(db).toBeDefined();
    expect(fs.existsSync(TEST_DB)).toBe(true);
  });

  test('les tables de base existent', () => {
    const tables = getTables();
    expect(Array.isArray(tables)).toBe(true);
    const names = tables.map((t) => t.name);
    expect(names).toContain('users');
    expect(names).toContain('import_logs');
  });

  test('la table users a les bonnes colonnes', () => {
    const columns = getColumns('users');
    expect(Array.isArray(columns)).toBe(true);
    const colNames = columns.map(c => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('email');
    expect(colNames).toContain('firstname');
    expect(colNames).toContain('age');
  });
});

describe('getTables()', () => {
  test('retourne un tableau de tables', () => {
    const tables = getTables();
    expect(Array.isArray(tables)).toBe(true);
    expect(tables.length).toBeGreaterThan(0);
  });

  test('chaque table a un nom', () => {
    const tables = getTables();
    tables.forEach(table => {
      expect(table.name).toBeDefined();
      expect(typeof table.name).toBe('string');
    });
  });

  test('n\'inclut pas les tables système SQLite', () => {
    const tables = getTables();
    const names = tables.map(t => t.name);
    expect(names).not.toContain('sqlite_sequence');
    expect(names).not.toContain('sqlite_master');
  });
});

describe('getColumns()', () => {
  test('retourne les colonnes d\'une table', () => {
    const columns = getColumns('users');
    expect(Array.isArray(columns)).toBe(true);
    expect(columns.length).toBeGreaterThan(0);
  });

  test('chaque colonne a les propriétés requises', () => {
    const columns = getColumns('users');
    columns.forEach(col => {
      expect(col.cid).toBeDefined();
      expect(col.name).toBeDefined();
      expect(col.type).toBeDefined();
      expect(col.notnull).toBeDefined();
      expect(col.pk).toBeDefined();
    });
  });

  test('retourne tableau vide pour table inexistante', () => {
    const columns = getColumns('table_inexistante');
    expect(Array.isArray(columns)).toBe(true);
    expect(columns.length).toBe(0);
  });
});

describe('getLastRows()', () => {
  beforeAll(() => {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  test('retourne les dernières lignes insérées', () => {
    const db = getDb();
    const insert = db.prepare('INSERT INTO test_items (name) VALUES (?)');
    
    insert.run('Item A');
    insert.run('Item B');
    insert.run('Item C');

    const rows = getLastRows('test_items', 2);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(2);
    expect(rows[0].name).toBe('Item C'); // Plus récent en premier
    expect(rows[1].name).toBe('Item B');
  });

  test('limite le nombre de lignes retournées', () => {
    const rows = getLastRows('test_items', 1);
    expect(rows.length).toBe(1);
  });

  test('retourne toutes les lignes si limit > nombre total', () => {
    const rows = getLastRows('test_items', 1000);
    expect(rows.length).toBeLessThanOrEqual(1000);
  });

  test('gère le cas où la table est vide', () => {
    const db = getDb();
    db.exec('CREATE TABLE IF NOT EXISTS empty_table (id INTEGER PRIMARY KEY)');
    const rows = getLastRows('empty_table', 10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});

describe('Import logs - addImportLogWithErrors()', () => {
  test('enregistre un log d\'import avec succès', () => {
    const now = new Date().toISOString();
    addImportLogWithErrors({
      imported_at: now,
      table_name: 'users',
      file_path: '/tmp/test.xlsx',
      sheet_name: 'Sheet1',
      rows_inserted: 10,
      mode: 'stop',
      has_errors: 0,
      error_details: null,
    });

    const logs = getImportLogs({ limit: 1 });
    expect(logs.data.length).toBeGreaterThan(0);
    const last = logs.data[0];
    expect(last.table_name).toBe('users');
    expect(last.rows_inserted).toBe(10);
  });

  test('enregistre un log avec erreurs', () => {
    const now = new Date().toISOString();
    const errors = [
      { row: 2, error: 'UNIQUE constraint failed' },
      { row: 5, error: 'NOT NULL constraint failed' }
    ];

    addImportLogWithErrors({
      imported_at: now,
      table_name: 'users',
      file_path: '/tmp/test2.xlsx',
      sheet_name: 'Sheet1',
      rows_inserted: 3,
      mode: 'continue',
      has_errors: 1,
      error_details: errors,
    });

    const logs = getImportLogs({ limit: 1 });
    const last = logs.data[0];
    expect(last.has_errors).toBe(1);
    expect(last.error_details).toBeDefined();
    expect(Array.isArray(last.error_details)).toBe(true);
    expect(last.error_details.length).toBe(2);
    expect(last.error_details[0].error).toContain('UNIQUE constraint');
  });
});

describe('Import logs - getImportLogs() avec pagination', () => {
  beforeAll(() => {
    // Créer plusieurs logs de test
    for (let i = 1; i <= 25; i++) {
      addImportLogWithErrors({
        imported_at: new Date(Date.now() + i * 1000).toISOString(),
        table_name: `table_${i}`,
        file_path: `/tmp/file_${i}.xlsx`,
        sheet_name: 'Sheet1',
        rows_inserted: i,
        mode: 'stop',
        has_errors: 0,
        error_details: null,
      });
    }
  });

  test('retourne les logs avec pagination', () => {
    const result = getImportLogs({ limit: 10, offset: 0 });
    expect(result.data).toBeDefined();
    expect(result.total).toBeDefined();
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.data.length).toBeLessThanOrEqual(10);
  });

  test('calcule correctement le total', () => {
    const result = getImportLogs({ limit: 10, offset: 0 });
    expect(result.total).toBeGreaterThanOrEqual(25);
  });

  test('offset fonctionne correctement', () => {
    const page1 = getImportLogs({ limit: 10, offset: 0 });
    const page2 = getImportLogs({ limit: 10, offset: 10 });
    
    expect(page1.data[0].id).not.toBe(page2.data[0].id);
  });

  test('filtre par searchText sur table_name', () => {
    const result = getImportLogs({ 
      limit: 100, 
      offset: 0, 
      searchText: 'table_1' 
    });
    
    result.data.forEach(log => {
      expect(log.table_name).toContain('table_1');
    });
  });

  test('filtre par searchText sur file_path', () => {
    const result = getImportLogs({ 
      limit: 100, 
      offset: 0, 
      searchText: 'file_5' 
    });
    
    result.data.forEach(log => {
      expect(log.file_path).toContain('file_5');
    });
  });

  test('retourne tableau vide si offset dépasse le total', () => {
    const result = getImportLogs({ limit: 10, offset: 10000 });
    expect(result.data).toEqual([]);
    expect(result.total).toBeGreaterThan(0);
  });
});

describe('Intégrité des données', () => {
  test('les logs sont ordonnés par date décroissante', () => {
    const logs = getImportLogs({ limit: 10, offset: 0 });
    
    for (let i = 0; i < logs.data.length - 1; i++) {
      const current = new Date(logs.data[i].imported_at);
      const next = new Date(logs.data[i + 1].imported_at);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });

  test('error_details est null ou array', () => {
    const logs = getImportLogs({ limit: 100, offset: 0 });
    
    logs.data.forEach(log => {
      expect(
        log.error_details === null || Array.isArray(log.error_details)
      ).toBe(true);
    });
  });
});
