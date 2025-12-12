/**
 * Tests unitaires pour le moteur de transformations
 * @jest-environment node
 */

const { evaluateExpression, validateExpression, getFunctionDocs } = require('../electron/utils/transformEngine');

describe('TransformEngine - parseDate et fonctions de dates', () => {
  describe('AGE()', () => {
    test('calcule correctement l\'âge avec format DD/MM/YYYY', () => {
      const result = evaluateExpression('AGE({dateNaissance})', { dateNaissance: '10/12/2001' });
      expect(result).toBeGreaterThanOrEqual(23);
      expect(result).toBeLessThanOrEqual(24);
    });

    test('calcule correctement l\'âge avec format DD-MM-YYYY', () => {
      const result = evaluateExpression('AGE({dateNaissance})', { dateNaissance: '15-03-1990' });
      expect(result).toBeGreaterThanOrEqual(34);
      expect(result).toBeLessThanOrEqual(35);
    });

    test('calcule correctement l\'âge avec format ISO YYYY-MM-DD', () => {
      const result = evaluateExpression('AGE({dateNaissance})', { dateNaissance: '1995-06-20' });
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(30);
    });

    test('retourne null pour date invalide', () => {
      const result = evaluateExpression('AGE({dateNaissance})', { dateNaissance: 'invalid' });
      expect(result).toBeNull();
    });

    test('retourne null pour valeur vide', () => {
      const result = evaluateExpression('AGE({dateNaissance})', { dateNaissance: null });
      expect(result).toBeNull();
    });
  });

  describe('YEAR(), MONTH(), DAY()', () => {
    test('YEAR extrait l\'année correctement', () => {
      expect(evaluateExpression('YEAR({date})', { date: '15/08/2023' })).toBe(2023);
      expect(evaluateExpression('YEAR({date})', { date: '2020-12-31' })).toBe(2020);
    });

    test('MONTH extrait le mois correctement (1-12)', () => {
      expect(evaluateExpression('MONTH({date})', { date: '15/08/2023' })).toBe(8);
      expect(evaluateExpression('MONTH({date})', { date: '2020-01-15' })).toBe(1);
      expect(evaluateExpression('MONTH({date})', { date: '10/12/2021' })).toBe(12);
    });

    test('DAY extrait le jour correctement', () => {
      expect(evaluateExpression('DAY({date})', { date: '15/08/2023' })).toBe(15);
      expect(evaluateExpression('DAY({date})', { date: '01/01/2020' })).toBe(1);
      expect(evaluateExpression('DAY({date})', { date: '31/12/2021' })).toBe(31);
    });
  });

  describe('DATEDIFF()', () => {
    test('calcule la différence en jours entre deux dates', () => {
      const result = evaluateExpression('DATEDIFF({date2}, {date1})', {
        date1: '01/01/2020',
        date2: '10/01/2020'
      });
      expect(result).toBe(9);
    });

    test('retourne un nombre négatif si date2 < date1', () => {
      const result = evaluateExpression('DATEDIFF({date2}, {date1})', {
        date1: '10/01/2020',
        date2: '01/01/2020'
      });
      expect(result).toBe(-9);
    });
  });

  describe('FORMAT_DATE()', () => {
    test('formate une date selon le pattern fourni', () => {
      const result = evaluateExpression('FORMAT_DATE({date}, "yyyy-MM-dd")', { date: '15/08/2023' });
      expect(result).toBe('2023-08-15');
    });

    test('utilise le format par défaut dd/MM/yyyy', () => {
      const result = evaluateExpression('FORMAT_DATE({date})', { date: '2023-08-15' });
      expect(result).toBe('15/08/2023');
    });
  });

  describe('NOW() et TODAY()', () => {
    test('NOW retourne la date et heure actuelle', () => {
      const result = evaluateExpression('NOW()', {});
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('TODAY retourne la date du jour', () => {
      const result = evaluateExpression('TODAY()', {});
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});

describe('TransformEngine - Fonctions de texte', () => {
  describe('UPPER() et LOWER()', () => {
    test('UPPER convertit en majuscules', () => {
      expect(evaluateExpression('UPPER({nom})', { nom: 'Dupont' })).toBe('DUPONT');
      expect(evaluateExpression('UPPER({nom})', { nom: 'jean-marie' })).toBe('JEAN-MARIE');
    });

    test('LOWER convertit en minuscules', () => {
      expect(evaluateExpression('LOWER({nom})', { nom: 'DUPONT' })).toBe('dupont');
      expect(evaluateExpression('LOWER({nom})', { nom: 'Jean-Marie' })).toBe('jean-marie');
    });

    test('gère les valeurs null', () => {
      expect(evaluateExpression('UPPER({nom})', { nom: null })).toBeNull();
      expect(evaluateExpression('LOWER({nom})', { nom: null })).toBeNull();
    });
  });

  describe('TRIM()', () => {
    test('supprime les espaces début et fin', () => {
      expect(evaluateExpression('TRIM({text})', { text: '  hello  ' })).toBe('hello');
      expect(evaluateExpression('TRIM({text})', { text: '\t test \n' })).toBe('test');
    });
  });

  describe('CAPITALIZE()', () => {
    test('met la première lettre en majuscule', () => {
      expect(evaluateExpression('CAPITALIZE({ville})', { ville: 'paris' })).toBe('Paris');
      expect(evaluateExpression('CAPITALIZE({ville})', { ville: 'LYON' })).toBe('Lyon');
    });
  });

  describe('CONCAT()', () => {
    test('concatène plusieurs valeurs', () => {
      const result = evaluateExpression('CONCAT({prenom}, " ", {nom})', {
        prenom: 'Jean',
        nom: 'Dupont'
      });
      expect(result).toBe('Jean Dupont');
    });

    test('gère les valeurs null', () => {
      const result = evaluateExpression('CONCAT({prenom}, " ", {nom})', {
        prenom: 'Jean',
        nom: null
      });
      // CONCAT ignore les valeurs null, donc "Jean " + "" = "Jean "
      expect(result).toBe('Jean ');
    });
  });

  describe('SUBSTRING()', () => {
    test('extrait une sous-chaîne', () => {
      expect(evaluateExpression('SUBSTRING({code}, 0, 3)', { code: 'ABC123' })).toBe('ABC');
      expect(evaluateExpression('SUBSTRING({code}, 3, 6)', { code: 'ABC123' })).toBe('123');
    });
  });

  describe('REPLACE()', () => {
    test('remplace du texte', () => {
      const result = evaluateExpression('REPLACE({text}, "old", "new")', { text: 'old text old' });
      expect(result).toBe('new text new');
    });
  });

  describe('LEN()', () => {
    test('retourne la longueur du texte', () => {
      expect(evaluateExpression('LEN({text})', { text: 'hello' })).toBe(5);
      expect(evaluateExpression('LEN({text})', { text: '' })).toBe(0);
    });
  });
});

describe('TransformEngine - Fonctions mathématiques', () => {
  describe('ROUND(), FLOOR(), CEIL()', () => {
    test('ROUND arrondit au nombre de décimales spécifié', () => {
      expect(evaluateExpression('ROUND({prix}, 2)', { prix: 12.3456 })).toBe(12.35);
      expect(evaluateExpression('ROUND({prix}, 0)', { prix: 12.6 })).toBe(13);
    });

    test('FLOOR arrondit à l\'entier inférieur', () => {
      expect(evaluateExpression('FLOOR({prix})', { prix: 12.9 })).toBe(12);
      expect(evaluateExpression('FLOOR({prix})', { prix: -12.1 })).toBe(-13);
    });

    test('CEIL arrondit à l\'entier supérieur', () => {
      expect(evaluateExpression('CEIL({prix})', { prix: 12.1 })).toBe(13);
      expect(evaluateExpression('CEIL({prix})', { prix: -12.9 })).toBe(-12);
    });
  });

  describe('ABS()', () => {
    test('retourne la valeur absolue', () => {
      expect(evaluateExpression('ABS({diff})', { diff: -10 })).toBe(10);
      expect(evaluateExpression('ABS({diff})', { diff: 10 })).toBe(10);
    });
  });

  describe('MIN() et MAX()', () => {
    test('MIN retourne le minimum', () => {
      expect(evaluateExpression('MIN({a}, {b}, {c})', { a: 5, b: 2, c: 8 })).toBe(2);
    });

    test('MAX retourne le maximum', () => {
      expect(evaluateExpression('MAX({a}, {b}, {c})', { a: 5, b: 2, c: 8 })).toBe(8);
    });

    test('gère les valeurs null', () => {
      expect(evaluateExpression('MIN({a}, {b})', { a: 5, b: null })).toBe(5);
      expect(evaluateExpression('MAX({a}, {b})', { a: null, b: 8 })).toBe(8);
    });
  });
});

describe('TransformEngine - Fonctions de conversion', () => {
  describe('NUMBER()', () => {
    test('convertit string en nombre', () => {
      expect(evaluateExpression('NUMBER({code})', { code: '123' })).toBe(123);
      expect(evaluateExpression('NUMBER({prix})', { prix: '12.50' })).toBe(12.50);
    });

    test('gère les formats français avec espaces et virgules', () => {
      expect(evaluateExpression('NUMBER({prix})', { prix: '1 234,56' })).toBe(1234.56);
    });

    test('retourne null pour valeurs invalides', () => {
      expect(evaluateExpression('NUMBER({code})', { code: 'abc' })).toBeNull();
    });
  });

  describe('STRING()', () => {
    test('convertit en chaîne de caractères', () => {
      expect(evaluateExpression('STRING({age})', { age: 25 })).toBe('25');
      expect(evaluateExpression('STRING({prix})', { prix: 12.5 })).toBe('12.5');
    });

    test('retourne chaîne vide pour null', () => {
      expect(evaluateExpression('STRING({val})', { val: null })).toBe('');
    });
  });

  describe('BOOLEAN()', () => {
    test('convertit en booléen', () => {
      expect(evaluateExpression('BOOLEAN({actif})', { actif: 1 })).toBe(true);
      expect(evaluateExpression('BOOLEAN({actif})', { actif: 0 })).toBe(false);
      expect(evaluateExpression('BOOLEAN({actif})', { actif: 'true' })).toBe(true);
      expect(evaluateExpression('BOOLEAN({actif})', { actif: '' })).toBe(false);
    });
  });
});

describe('TransformEngine - Fonctions conditionnelles', () => {
  describe('IF()', () => {
    test('retourne thenValue si condition vraie', () => {
      const result = evaluateExpression('IF({age} >= 18, "Majeur", "Mineur")', { age: 25 });
      expect(result).toBe('Majeur');
    });

    test('retourne elseValue si condition fausse', () => {
      const result = evaluateExpression('IF({age} >= 18, "Majeur", "Mineur")', { age: 15 });
      expect(result).toBe('Mineur');
    });

    test('permet des conditions imbriquées', () => {
      const result = evaluateExpression(
        'IF({age} >= 18, "Adulte", IF({age} >= 13, "Ado", "Enfant"))',
        { age: 15 }
      );
      expect(result).toBe('Ado');
    });
  });

  describe('ISEMPTY()', () => {
    test('retourne true pour valeur vide', () => {
      expect(evaluateExpression('ISEMPTY({email})', { email: '' })).toBe(true);
      expect(evaluateExpression('ISEMPTY({email})', { email: null })).toBe(true);
    });

    test('retourne false pour valeur non vide', () => {
      expect(evaluateExpression('ISEMPTY({email})', { email: 'test@example.com' })).toBe(false);
    });
  });

  describe('IFNULL()', () => {
    test('retourne la valeur si non null', () => {
      expect(evaluateExpression('IFNULL({tel}, "N/A")', { tel: '0123456789' })).toBe('0123456789');
    });

    test('retourne la valeur par défaut si null', () => {
      expect(evaluateExpression('IFNULL({tel}, "N/A")', { tel: null })).toBe('N/A');
    });
  });
});

describe('TransformEngine - Expressions complexes', () => {
  test('calcul de prix TTC', () => {
    const result = evaluateExpression('ROUND({prix_ht} * 1.20, 2)', { prix_ht: 100 });
    expect(result).toBe(120);
  });

  test('calcul avec remise conditionnelle', () => {
    const result = evaluateExpression(
      'IF({montant} > 100, {montant} * 0.9, {montant})',
      { montant: 150 }
    );
    expect(result).toBe(135);
  });

  test('nettoyage et formatage de nom complet', () => {
    const result = evaluateExpression(
      'CONCAT(CAPITALIZE(TRIM({prenom})), " ", UPPER(TRIM({nom})))',
      { prenom: '  jean  ', nom: '  dupont  ' }
    );
    expect(result).toBe('Jean DUPONT');
  });

  test('catégorie de prix selon montant', () => {
    const result = evaluateExpression(
      'IF({prix} >= 100, "Premium", IF({prix} >= 50, "Standard", "Économique"))',
      { prix: 75 }
    );
    expect(result).toBe('Standard');
  });

  test('calcul de moyenne avec arrondi', () => {
    const result = evaluateExpression(
      'ROUND(({note1} + {note2} + {note3}) / 3, 2)',
      { note1: 15, note2: 12, note3: 18 }
    );
    expect(result).toBe(15);
  });
});

describe('TransformEngine - Validation', () => {
  const columns = ['nom', 'prenom', 'age', 'email', 'dateNaissance'];

  test('valide une expression correcte', () => {
    const result = validateExpression('UPPER({nom})', columns);
    expect(result.valid).toBe(true);
  });

  test('détecte les colonnes manquantes', () => {
    const result = validateExpression('AGE({date_naissance})', columns);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('date_naissance');
  });

  test('détecte les erreurs de syntaxe', () => {
    const result = validateExpression('UPPER({nom}', columns);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('accepte les expressions vides', () => {
    const result = validateExpression('', columns);
    expect(result.valid).toBe(true);
  });

  test('valide les expressions complexes', () => {
    const result = validateExpression(
      'IF({age} >= 18, CONCAT({prenom}, " ", {nom}), "Mineur")',
      columns
    );
    expect(result.valid).toBe(true);
  });
});

describe('TransformEngine - Documentation', () => {
  test('getFunctionDocs retourne toutes les catégories', () => {
    const docs = getFunctionDocs();
    expect(docs).toBeDefined();
    expect(docs.dates).toBeDefined();
    expect(docs.text).toBeDefined();
    expect(docs.math).toBeDefined();
    expect(docs.conversion).toBeDefined();
    expect(docs.conditions).toBeDefined();
  });

  test('chaque fonction a un nom, syntaxe et description', () => {
    const docs = getFunctionDocs();
    docs.dates.forEach(fn => {
      expect(fn.name).toBeDefined();
      expect(fn.syntax).toBeDefined();
      expect(fn.description).toBeDefined();
    });
  });
});

describe('TransformEngine - Gestion d\'erreurs', () => {
  test('lève une erreur pour fonction inconnue', () => {
    expect(() => {
      evaluateExpression('UNKNOWN_FUNC({val})', { val: 123 });
    }).toThrow();
  });

  test('gère les colonnes avec caractères spéciaux', () => {
    const result = evaluateExpression('{Prénom Client}', { 'Prénom Client': 'Jean' });
    expect(result).toBe('Jean');
  });

  test('gère les noms de colonnes avec espaces', () => {
    const result = evaluateExpression('UPPER({nom complet})', { 'nom complet': 'jean dupont' });
    expect(result).toBe('JEAN DUPONT');
  });
});
