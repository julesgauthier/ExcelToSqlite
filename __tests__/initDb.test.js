const fs = require('fs');
const os = require('os');
const path = require('path');

// Use a unique DB file for tests to avoid clashing with dev DB
const TEST_DB = path.join(os.tmpdir(), `excel2sqlite_test_${Date.now()}.db`);
process.env.TEST_SQLITE_DB_FILE = TEST_DB;

const { getDb, getTables, addImportLogWithErrors, getImportLogs, getLastRows, closeDb } = require('../electron/db/initDb');

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

test('DB file is created and base tables exist', () => {
  const db = getDb();
  expect(db).toBeDefined();
  expect(fs.existsSync(TEST_DB)).toBe(true);

  const tables = getTables();
  expect(Array.isArray(tables)).toBe(true);
  // users table should exist from base schema
  const names = tables.map((t) => t.name);
  expect(names).toContain('users');
});

test('getLastRows returns last inserted rows', () => {
  const db = getDb();
  // create a temporary table and insert rows
  db.exec(`CREATE TABLE IF NOT EXISTS test_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    `);
  const insert = db.prepare('INSERT INTO test_items (name) VALUES (?)');

  insert.run('A');
  insert.run('B');
  insert.run('C');

  const rows = getLastRows('test_items', 2);
  expect(Array.isArray(rows)).toBe(true);
  expect(rows.length).toBe(2);
  // last inserted was 'C', first returned should be C
  expect(rows[0].name).toBe('C');
});

test('addImportLogWithErrors and getImportLogs store and parse error details', () => {
  const now = new Date().toISOString();
  addImportLogWithErrors({
    imported_at: now,
    table_name: 'users',
    file_path: '/tmp/fake.xlsx',
    sheet_name: 'Sheet1',
    rows_inserted: 1,
    mode: 'continue',
    has_errors: 1,
    error_details: [{ row: 2, error: 'UNIQUE constraint failed: users.email' }],
  });

  const logs = getImportLogs(5);
  expect(Array.isArray(logs)).toBe(true);
  expect(logs.length).toBeGreaterThan(0);
  const first = logs[0];
  expect(first.error_details).toBeDefined();
  expect(Array.isArray(first.error_details)).toBe(true);
  expect(first.error_details[0].error).toMatch(/UNIQUE constraint/);
});
