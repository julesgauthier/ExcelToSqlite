const math = require('mathjs');
const { differenceInYears, differenceInDays, format: dateFormat } = require('date-fns');

// Créer un parser mathjs personnalisé
const parser = math.parser();

/**
 * Parse une date depuis différents formats
 * @param {string|Date} dateInput - Date à parser
 * @returns {Date|null} Date parsée ou null si invalide
 */
function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  
  const str = String(dateInput).trim();
  
  // Essayer format DD/MM/YYYY en priorité (format français courant dans Excel)
  const ddmmyyyyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10);
    const year = parseInt(ddmmyyyyMatch[3], 10);
    
    // Vérifier si c'est un format valide
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Essayer format DD-MM-YYYY
  const ddmmyyyyDashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyyDashMatch) {
    const day = parseInt(ddmmyyyyDashMatch[1], 10);
    const month = parseInt(ddmmyyyyDashMatch[2], 10);
    const year = parseInt(ddmmyyyyDashMatch[3], 10);
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Essayer format ISO (YYYY-MM-DD)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Fallback: essayer new Date() natif
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;
  
  return null;
}

// Fonctions custom disponibles dans les formules
const customFunctions = {
  // ============ DATES ============
  
  /**
   * Calculer l'âge depuis une date de naissance
   * @param {string|Date} dateStr - Date de naissance
   * @returns {number} Âge en années
   */
  AGE: (dateStr) => {
    if (!dateStr) return null;
    const birthDate = parseDate(dateStr);
    if (!birthDate) return null;
    return differenceInYears(new Date(), birthDate);
  },
  
  /**
   * Extraire l'année d'une date
   */
  YEAR: (dateStr) => {
    if (!dateStr) return null;
    const date = parseDate(dateStr);
    return date ? date.getFullYear() : null;
  },
  
  /**
   * Extraire le mois d'une date (1-12)
   */
  MONTH: (dateStr) => {
    if (!dateStr) return null;
    const date = parseDate(dateStr);
    return date ? date.getMonth() + 1 : null;
  },
  
  /**
   * Extraire le jour d'une date (1-31)
   */
  DAY: (dateStr) => {
    if (!dateStr) return null;
    const date = parseDate(dateStr);
    return date ? date.getDate() : null;
  },
  
  /**
   * Différence entre deux dates en jours
   */
  DATEDIFF: (date1, date2) => {
    if (!date1 || !date2) return null;
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    if (!d1 || !d2) return null;
    return differenceInDays(d1, d2);
  },
  
  /**
   * Formater une date
   * @param {string} dateStr - Date à formater
   * @param {string} formatStr - Format (ex: "dd/MM/yyyy", "yyyy-MM-dd")
   */
  FORMAT_DATE: (dateStr, formatStr = 'dd/MM/yyyy') => {
    if (!dateStr) return null;
    const date = parseDate(dateStr);
    if (!date) return null;
    try {
      return dateFormat(date, formatStr);
    } catch {
      return null;
    }
  },
  
  /**
   * Date actuelle
   */
  NOW: () => new Date(),
  
  /**
   * Date d'aujourd'hui à minuit
   */
  TODAY: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  },
  
  // ============ TEXTE ============
  
  /**
   * Convertir en majuscules
   */
  UPPER: (str) => {
    if (str == null) return null;
    return String(str).toUpperCase();
  },
  
  /**
   * Convertir en minuscules
   */
  LOWER: (str) => {
    if (str == null) return null;
    return String(str).toLowerCase();
  },
  
  /**
   * Supprimer les espaces au début et à la fin
   */
  TRIM: (str) => {
    if (str == null) return null;
    return String(str).trim();
  },
  
  /**
   * Concaténer plusieurs valeurs
   */
  CONCAT: (...args) => {
    return args.filter(a => a != null).map(a => String(a)).join('');
  },
  
  /**
   * Extraire une sous-chaîne
   */
  SUBSTRING: (str, start, length) => {
    if (str == null) return null;
    const s = String(str);
    if (length === undefined) {
      return s.substring(start);
    }
    return s.substring(start, start + length);
  },
  
  /**
   * Remplacer du texte
   */
  REPLACE: (str, search, replace) => {
    if (str == null) return null;
    return String(str).replace(new RegExp(search, 'g'), replace);
  },
  
  /**
   * Longueur d'une chaîne
   */
  LEN: (str) => {
    if (str == null) return 0;
    return String(str).length;
  },
  
  /**
   * Mettre la première lettre en majuscule
   */
  CAPITALIZE: (str) => {
    if (str == null) return null;
    const s = String(str);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  },
  
  // ============ CONVERSION ============
  
  /**
   * Convertir en nombre
   */
  NUMBER: (val) => {
    if (val == null) return null;
    // Gérer les formats français (1 234,56)
    if (typeof val === 'string') {
      const cleaned = val.replace(/\s/g, '').replace(',', '.');
      const num = Number(cleaned);
      return isNaN(num) ? null : num;
    }
    const num = Number(val);
    return isNaN(num) ? null : num;
  },
  
  /**
   * Convertir en texte
   */
  STRING: (val) => {
    if (val == null) return '';
    return String(val);
  },
  
  /**
   * Convertir en booléen
   */
  BOOLEAN: (val) => {
    if (val == null) return false;
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'oui';
    }
    return Boolean(val);
  },
  
  // ============ MATHÉMATIQUES ============
  
  /**
   * Arrondir à N décimales
   */
  ROUND: (num, decimals = 0) => {
    if (num == null) return null;
    const n = Number(num);
    if (isNaN(n)) return null;
    return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },
  
  /**
   * Arrondir à l'entier inférieur
   */
  FLOOR: (num) => {
    if (num == null) return null;
    const n = Number(num);
    return isNaN(n) ? null : Math.floor(n);
  },
  
  /**
   * Arrondir à l'entier supérieur
   */
  CEIL: (num) => {
    if (num == null) return null;
    const n = Number(num);
    return isNaN(n) ? null : Math.ceil(n);
  },
  
  /**
   * Valeur absolue
   */
  ABS: (num) => {
    if (num == null) return null;
    const n = Number(num);
    return isNaN(n) ? null : Math.abs(n);
  },
  
  /**
   * Minimum de plusieurs valeurs
   */
  MIN: (...args) => {
    const numbers = args.filter(a => a != null).map(Number).filter(n => !isNaN(n));
    return numbers.length > 0 ? Math.min(...numbers) : null;
  },
  
  /**
   * Maximum de plusieurs valeurs
   */
  MAX: (...args) => {
    const numbers = args.filter(a => a != null).map(Number).filter(n => !isNaN(n));
    return numbers.length > 0 ? Math.max(...numbers) : null;
  },
  
  // ============ CONDITIONS ============
  
  /**
   * Condition IF
   */
  IF: (condition, thenValue, elseValue) => {
    return condition ? thenValue : elseValue;
  },
  
  /**
   * Vérifier si une valeur est vide/nulle
   */
  ISEMPTY: (val) => {
    return val == null || val === '';
  },
  
  /**
   * Remplacer les valeurs nulles
   */
  IFNULL: (val, defaultValue) => {
    return val == null ? defaultValue : val;
  },
};

// Enregistrer les fonctions dans mathjs
Object.keys(customFunctions).forEach(name => {
  parser.set(name, customFunctions[name]);
});

/**
 * Évaluer une expression avec les valeurs d'une ligne Excel
 * @param {string} expression - Ex: "AGE({date_naissance})"
 * @param {object} rowData - Ex: { date_naissance: "1995-03-12", nom: "Dupont" }
 * @returns {any} Résultat de l'expression
 */
function evaluateExpression(expression, rowData) {
  if (!expression || !expression.trim()) {
    return null;
  }

  try {
    // Créer un scope avec toutes les fonctions ET les colonnes
    const scope = { ...customFunctions };
    
    // Remplacer {col_name} par des noms de variables simples
    let processedExpression = expression;
    
    // Trouver tous les {col_name}
    const matches = expression.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach(match => {
        const colName = match.slice(1, -1); // Enlever { et }
        const value = rowData[colName];
        
        // Créer un nom de variable safe (remplacer espaces, etc.)
        const safeName = colName.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Ajouter la valeur au scope
        scope[safeName] = value;
        
        // Remplacer {colName} par safeName dans l'expression
        processedExpression = processedExpression.replace(match, safeName);
      });
    }
    
    // Évaluer avec mathjs et le scope complet
    const result = math.evaluate(processedExpression, scope);
    
    // Convertir les dates en strings ISO
    if (result instanceof Date) {
      return result.toISOString();
    }
    
    return result;
    
  } catch (error) {
    throw new Error(`Erreur transformation: ${error.message}`);
  }
}

/**
 * Valider une expression (syntaxe)
 * @param {string} expression - Expression à valider
 * @param {string[]} availableColumns - Colonnes Excel disponibles
 * @returns {{valid: boolean, error?: string}}
 */
function validateExpression(expression, availableColumns) {
  if (!expression || !expression.trim()) {
    return { valid: true };
  }

  try {
    // Vérifier que toutes les colonnes référencées existent
    const matches = expression.match(/\{([^}]+)\}/g);
    if (matches) {
      const referencedCols = matches.map(m => m.slice(1, -1));
      const missing = referencedCols.filter(col => !availableColumns.includes(col));
      
      if (missing.length > 0) {
        return { 
          valid: false, 
          error: `Colonnes inexistantes: ${missing.join(', ')}` 
        };
      }
    }
    
    // Test avec des données fictives
    const testData = {};
    availableColumns.forEach(col => {
      testData[col] = '2000-01-01'; // Date par défaut pour test
    });
    
    evaluateExpression(expression, testData);
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Syntaxe invalide: ${error.message}` 
    };
  }
}

/**
 * Obtenir la documentation des fonctions
 */
function getFunctionDocs() {
  return {
    dates: [
      { name: 'AGE', syntax: 'AGE({date})', description: 'Calculer l\'âge en années' },
      { name: 'YEAR', syntax: 'YEAR({date})', description: 'Extraire l\'année' },
      { name: 'MONTH', syntax: 'MONTH({date})', description: 'Extraire le mois (1-12)' },
      { name: 'DAY', syntax: 'DAY({date})', description: 'Extraire le jour (1-31)' },
      { name: 'DATEDIFF', syntax: 'DATEDIFF({date1}, {date2})', description: 'Différence en jours' },
      { name: 'FORMAT_DATE', syntax: 'FORMAT_DATE({date}, "dd/MM/yyyy")', description: 'Formater une date' },
      { name: 'NOW', syntax: 'NOW()', description: 'Date et heure actuelles' },
      { name: 'TODAY', syntax: 'TODAY()', description: 'Date d\'aujourd\'hui' },
    ],
    text: [
      { name: 'UPPER', syntax: 'UPPER({texte})', description: 'Majuscules' },
      { name: 'LOWER', syntax: 'LOWER({texte})', description: 'Minuscules' },
      { name: 'TRIM', syntax: 'TRIM({texte})', description: 'Supprimer espaces début/fin' },
      { name: 'CONCAT', syntax: 'CONCAT({col1}, " ", {col2})', description: 'Concaténer' },
      { name: 'SUBSTRING', syntax: 'SUBSTRING({texte}, 0, 5)', description: 'Extraire sous-chaîne' },
      { name: 'REPLACE', syntax: 'REPLACE({texte}, "old", "new")', description: 'Remplacer texte' },
      { name: 'LEN', syntax: 'LEN({texte})', description: 'Longueur' },
      { name: 'CAPITALIZE', syntax: 'CAPITALIZE({texte})', description: 'Première lettre majuscule' },
    ],
    math: [
      { name: 'ROUND', syntax: 'ROUND({nombre}, 2)', description: 'Arrondir à N décimales' },
      { name: 'FLOOR', syntax: 'FLOOR({nombre})', description: 'Arrondir inf' },
      { name: 'CEIL', syntax: 'CEIL({nombre})', description: 'Arrondir sup' },
      { name: 'ABS', syntax: 'ABS({nombre})', description: 'Valeur absolue' },
      { name: 'MIN', syntax: 'MIN({a}, {b}, {c})', description: 'Minimum' },
      { name: 'MAX', syntax: 'MAX({a}, {b}, {c})', description: 'Maximum' },
    ],
    conversion: [
      { name: 'NUMBER', syntax: 'NUMBER({texte})', description: 'Convertir en nombre' },
      { name: 'STRING', syntax: 'STRING({valeur})', description: 'Convertir en texte' },
      { name: 'BOOLEAN', syntax: 'BOOLEAN({valeur})', description: 'Convertir en booléen' },
    ],
    conditions: [
      { name: 'IF', syntax: 'IF({age} >= 18, "Majeur", "Mineur")', description: 'Condition' },
      { name: 'ISEMPTY', syntax: 'ISEMPTY({valeur})', description: 'Vérifier si vide' },
      { name: 'IFNULL', syntax: 'IFNULL({valeur}, "défaut")', description: 'Remplacer null' },
    ],
  };
}

module.exports = {
  evaluateExpression,
  validateExpression,
  getFunctionDocs,
  customFunctions,
};
