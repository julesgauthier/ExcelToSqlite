/**
 * Tests d'intégration pour l'import Excel → SQLite avec transformations
 * @jest-environment node
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const ExcelJS = require('exceljs');

// Use a unique DB file for integration tests
const TEST_DB = path.join(os.tmpdir(), `excel2sqlite_integration_${Date.now()}.db`);
process.env.TEST_SQLITE_DB_FILE = TEST_DB;

const { getDb, closeDb } = require('../electron/db/initDb');
const { evaluateExpression } = require('../electron/utils/transformEngine');

let testExcelFile;

beforeAll(async () => {
  // Créer un fichier Excel de test
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('TestSheet');
  
  // Headers
  worksheet.columns = [
    { header: 'email', key: 'email', width: 30 },
    { header: 'firstname', key: 'firstname', width: 15 },
    { header: 'dateNaissance', key: 'dateNaissance', width: 15 },
    { header: 'prixHT', key: 'prixHT', width: 10 },
  ];
  
  // Data
  worksheet.addRow({
    email: 'jean@example.com',
    firstname: 'Jean',
    dateNaissance: '15/03/1990',
    prixHT: 100
  });
  
  worksheet.addRow({
    email: 'marie@example.com',
    firstname: 'Marie',
    dateNaissance: '20/08/1985',
    prixHT: 150
  });
  
  worksheet.addRow({
    email: 'paul@example.com',
    firstname: 'Paul',
    dateNaissance: '10/12/2001',
    prixHT: 75
  });
  
  testExcelFile = path.join(os.tmpdir(), `test_excel_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(testExcelFile);
  
  // Créer une table de test dans la DB
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      firstname TEXT,
      age INTEGER,
      prixTTC REAL
    );
  `);
});

afterAll(() => {
  try {
    closeDb();
  } catch {
    /* ignore */
  }
  
  try {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    if (fs.existsSync(testExcelFile)) fs.unlinkSync(testExcelFile);
  } catch {
    /* ignore */
  }
});

describe('Import Excel simple (sans transformation)', () => {
  test('importe des données Excel dans SQLite', async () => {
    const db = getDb();
    
    // Lire le fichier Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(testExcelFile);
    const worksheet = workbook.worksheets[0];
    
    // Créer le mapping
    const mapping = [
      { dbColumn: 'email', excelColumn: 'email' },
      { dbColumn: 'firstname', excelColumn: 'firstname' }
    ];
    
    // Extraire headers Excel
    const headerRow = worksheet.getRow(1);
    const excelHeaderMap = new Map();
    headerRow.eachCell((cell, colNumber) => {
      const name = typeof cell.value === 'string' ? cell.value.trim() : String(cell.value);
      excelHeaderMap.set(name, colNumber);
    });
    
    // Préparer l'insertion
    const dbColumns = mapping.map(m => m.dbColumn);
    const excelColumns = mapping.map(m => m.excelColumn);
    const sql = `INSERT INTO test_users (${dbColumns.join(', ')}) VALUES (${dbColumns.map(() => '?').join(', ')})`;
    const insertStmt = db.prepare(sql);
    
    // Importer les données
    let insertedCount = 0;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const values = excelColumns.map(excelColName => {
        const colIndex = excelHeaderMap.get(excelColName);
        if (!colIndex) return null;
        
        const cell = row.getCell(colIndex);
        let value = cell.value;
        
        if (value && typeof value === 'object' && 'text' in value) {
          value = value.text;
        }
        
        return value ?? null;
      });
      
      insertStmt.run(values);
      insertedCount++;
    });
    
    expect(insertedCount).toBe(3);
    
    // Vérifier les données insérées
    const rows = db.prepare('SELECT * FROM test_users').all();
    expect(rows.length).toBe(3);
    expect(rows[0].email).toBe('jean@example.com');
    expect(rows[0].firstname).toBe('Jean');
  });
});

describe('Import Excel avec transformations', () => {
  beforeEach(() => {
    const db = getDb();
    db.exec('DELETE FROM test_users');
  });
  
  test('applique la transformation AGE() sur dateNaissance', async () => {
    const db = getDb();
    
    // Lire le fichier Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(testExcelFile);
    const worksheet = workbook.worksheets[0];
    
    // Créer le mapping avec transformation
    const mapping = [
      { dbColumn: 'email', excelColumn: 'email', transformation: null },
      { dbColumn: 'firstname', excelColumn: 'firstname', transformation: null },
      { dbColumn: 'age', excelColumn: 'dateNaissance', transformation: 'AGE({dateNaissance})' }
    ];
    
    // Extraire headers Excel
    const headerRow = worksheet.getRow(1);
    const excelHeaderMap = new Map();
    headerRow.eachCell((cell, colNumber) => {
      const name = typeof cell.value === 'string' ? cell.value.trim() : String(cell.value);
      excelHeaderMap.set(name, colNumber);
    });
    
    // Préparer l'insertion
    const dbColumns = mapping.map(m => m.dbColumn);
    const sql = `INSERT INTO test_users (${dbColumns.join(', ')}) VALUES (${dbColumns.map(() => '?').join(', ')})`;
    const insertStmt = db.prepare(sql);
    
    // Importer avec transformations
    let insertedCount = 0;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      // Construire rowData avec toutes les colonnes
      const rowData = {};
      mapping.forEach(m => {
        const colIndex = excelHeaderMap.get(m.excelColumn);
        if (!colIndex) return;
        
        const cell = row.getCell(colIndex);
        let value = cell.value;
        
        if (value && typeof value === 'object' && 'text' in value) {
          value = value.text;
        }
        
        rowData[m.excelColumn] = value ?? null;
      });
      
      // Appliquer les transformations
      const values = mapping.map(m => {
        let value = rowData[m.excelColumn];
        
        if (m.transformation) {
          try {
            value = evaluateExpression(m.transformation, rowData);
          } catch (err) {
            throw new Error(`Transformation error for ${m.dbColumn}: ${err.message}`);
          }
        }
        
        return value;
      });
      
      insertStmt.run(values);
      insertedCount++;
    });
    
    expect(insertedCount).toBe(3);
    
    // Vérifier les âges calculés
    const rows = db.prepare('SELECT * FROM test_users ORDER BY email').all();
    expect(rows.length).toBe(3);
    
    // Jean né en 1990 → ~35 ans
    expect(rows[0].email).toBe('jean@example.com');
    expect(rows[0].age).toBeGreaterThanOrEqual(34);
    expect(rows[0].age).toBeLessThanOrEqual(35);
    
    // Marie née en 1985 → ~40 ans
    expect(rows[1].email).toBe('marie@example.com');
    expect(rows[1].age).toBeGreaterThanOrEqual(39);
    expect(rows[1].age).toBeLessThanOrEqual(40);
    
    // Paul né en 2001 → ~24 ans
    expect(rows[2].email).toBe('paul@example.com');
    expect(rows[2].age).toBeGreaterThanOrEqual(23);
    expect(rows[2].age).toBeLessThanOrEqual(24);
  });
  
  test('applique transformation mathématique (prix TTC)', async () => {
    const db = getDb();
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(testExcelFile);
    const worksheet = workbook.worksheets[0];
    
    const mapping = [
      { dbColumn: 'email', excelColumn: 'email', transformation: null },
      { dbColumn: 'prixTTC', excelColumn: 'prixHT', transformation: 'ROUND({prixHT} * 1.20, 2)' }
    ];
    
    const headerRow = worksheet.getRow(1);
    const excelHeaderMap = new Map();
    headerRow.eachCell((cell, colNumber) => {
      const name = typeof cell.value === 'string' ? cell.value.trim() : String(cell.value);
      excelHeaderMap.set(name, colNumber);
    });
    
    const dbColumns = mapping.map(m => m.dbColumn);
    const sql = `INSERT INTO test_users (${dbColumns.join(', ')}) VALUES (${dbColumns.map(() => '?').join(', ')})`;
    const insertStmt = db.prepare(sql);
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const rowData = {};
      mapping.forEach(m => {
        const colIndex = excelHeaderMap.get(m.excelColumn);
        if (!colIndex) return;
        
        const cell = row.getCell(colIndex);
        let value = cell.value;
        
        if (value && typeof value === 'object' && 'text' in value) {
          value = value.text;
        }
        
        rowData[m.excelColumn] = value ?? null;
      });
      
      const values = mapping.map(m => {
        let value = rowData[m.excelColumn];
        
        if (m.transformation) {
          value = evaluateExpression(m.transformation, rowData);
        }
        
        return value;
      });
      
      insertStmt.run(values);
    });
    
    const rows = db.prepare('SELECT * FROM test_users ORDER BY email').all();
    expect(rows.length).toBe(3);
    
    // Jean: 100 * 1.20 = 120
    expect(rows[0].prixTTC).toBe(120);
    
    // Marie: 150 * 1.20 = 180
    expect(rows[1].prixTTC).toBe(180);
    
    // Paul: 75 * 1.20 = 90
    expect(rows[2].prixTTC).toBe(90);
  });
  
  test('applique transformation de texte (UPPER)', async () => {
    const db = getDb();
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(testExcelFile);
    const worksheet = workbook.worksheets[0];
    
    const mapping = [
      { dbColumn: 'email', excelColumn: 'email', transformation: null },
      { dbColumn: 'firstname', excelColumn: 'firstname', transformation: 'UPPER({firstname})' }
    ];
    
    const headerRow = worksheet.getRow(1);
    const excelHeaderMap = new Map();
    headerRow.eachCell((cell, colNumber) => {
      const name = typeof cell.value === 'string' ? cell.value.trim() : String(cell.value);
      excelHeaderMap.set(name, colNumber);
    });
    
    const dbColumns = mapping.map(m => m.dbColumn);
    const sql = `INSERT INTO test_users (${dbColumns.join(', ')}) VALUES (${dbColumns.map(() => '?').join(', ')})`;
    const insertStmt = db.prepare(sql);
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const rowData = {};
      mapping.forEach(m => {
        const colIndex = excelHeaderMap.get(m.excelColumn);
        if (!colIndex) return;
        
        const cell = row.getCell(colIndex);
        let value = cell.value;
        
        if (value && typeof value === 'object' && 'text' in value) {
          value = value.text;
        }
        
        rowData[m.excelColumn] = value ?? null;
      });
      
      const values = mapping.map(m => {
        let value = rowData[m.excelColumn];
        
        if (m.transformation) {
          value = evaluateExpression(m.transformation, rowData);
        }
        
        return value;
      });
      
      insertStmt.run(values);
    });
    
    const rows = db.prepare('SELECT * FROM test_users ORDER BY email').all();
    expect(rows.length).toBe(3);
    
    expect(rows[0].firstname).toBe('JEAN');
    expect(rows[1].firstname).toBe('MARIE');
    expect(rows[2].firstname).toBe('PAUL');
  });
});

describe('Gestion des erreurs lors de l\'import', () => {
  test('gère les erreurs de transformation', async () => {
    const rowData = { dateNaissance: '10/12/2001' };
    
    // Test avec une expression invalide (syntaxe incorrecte)
    expect(() => {
      evaluateExpression('INVALID_FUNCTION({dateNaissance})', rowData);
    }).toThrow();
    
    // Test avec une expression mal formée
    expect(() => {
      evaluateExpression('AGE({dateNaissance', rowData); // Accolade manquante
    }).toThrow();
  });
  
  test('gère les contraintes UNIQUE', () => {
    const db = getDb();
    db.exec('DELETE FROM test_users');
    
    const insert = db.prepare('INSERT INTO test_users (email) VALUES (?)');
    
    insert.run('test@example.com');
    
    expect(() => {
      insert.run('test@example.com'); // Duplicate
    }).toThrow(/UNIQUE constraint/);
  });
  
  test('gère les contraintes NOT NULL', () => {
    const db = getDb();
    
    const insert = db.prepare('INSERT INTO test_users (email) VALUES (?)');
    
    expect(() => {
      insert.run(null); // NULL sur colonne NOT NULL
    }).toThrow(/NOT NULL constraint/);
  });
});

describe('Performance et volumétrie', () => {
  test('importe un grand nombre de lignes rapidement', async () => {
    const db = getDb();
    
    // Créer table temporaire
    db.exec(`
      CREATE TABLE IF NOT EXISTS perf_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT
      );
    `);
    
    const start = Date.now();
    const insert = db.prepare('INSERT INTO perf_test (value) VALUES (?)');
    
    const transaction = db.transaction(() => {
      for (let i = 0; i < 1000; i++) {
        insert.run(`value_${i}`);
      }
    });
    
    transaction();
    const duration = Date.now() - start;
    
    // Devrait être très rapide avec transaction
    expect(duration).toBeLessThan(1000); // < 1 seconde pour 1000 lignes
    
    const count = db.prepare('SELECT COUNT(*) as total FROM perf_test').get();
    expect(count.total).toBe(1000);
  });
});
