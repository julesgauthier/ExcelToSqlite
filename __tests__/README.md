# Tests Unitaires et d'Intégration

Suite complète de tests pour ExcelToSQLite.

## 🧪 Structure des tests

```
__tests__/
├── transformEngine.test.js  # Tests du moteur de transformations (350+ assertions)
├── initDb.test.js           # Tests de la base de données SQLite
└── integration.test.js      # Tests d'intégration Excel → SQLite
```

## 📋 Couverture des tests

### transformEngine.test.js (350+ tests)
- ✅ **Fonctions de dates** : AGE, YEAR, MONTH, DAY, DATEDIFF, FORMAT_DATE, NOW, TODAY
- ✅ **Formats de dates** : DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
- ✅ **Fonctions de texte** : UPPER, LOWER, TRIM, CAPITALIZE, CONCAT, SUBSTRING, REPLACE, LEN
- ✅ **Fonctions mathématiques** : ROUND, FLOOR, CEIL, ABS, MIN, MAX
- ✅ **Conversions** : NUMBER, STRING, BOOLEAN (formats français)
- ✅ **Conditions** : IF, ISEMPTY, IFNULL
- ✅ **Expressions complexes** : Prix TTC, remises, formatage noms, catégories
- ✅ **Validation** : Syntaxe, colonnes manquantes, erreurs
- ✅ **Documentation** : getFunctionDocs()
- ✅ **Gestion d'erreurs** : Fonctions inconnues, caractères spéciaux, noms avec espaces

### initDb.test.js (100+ tests)
- ✅ **Initialisation** : Création DB, tables de base, colonnes
- ✅ **getTables()** : Liste des tables, propriétés, exclusion tables système
- ✅ **getColumns()** : Métadonnées colonnes, types, contraintes
- ✅ **getLastRows()** : Pagination, tri, limite, tables vides
- ✅ **Import logs** : Enregistrement avec/sans erreurs, parsing JSON
- ✅ **Pagination logs** : offset, limit, total, searchText
- ✅ **Intégrité** : Ordre chronologique, types error_details

### integration.test.js (50+ tests)
- ✅ **Import simple** : Excel → SQLite sans transformation
- ✅ **Import avec transformations** : AGE(), calculs TTC, UPPER()
- ✅ **Gestion d'erreurs** : Transformations invalides, contraintes UNIQUE/NOT NULL
- ✅ **Performance** : 1000+ lignes en transaction

## 🚀 Commandes

### Exécuter tous les tests
```bash
npm test
```

### Tests unitaires uniquement
```bash
npm run test:unit
```

### Tests d'intégration uniquement
```bash
npm run test:integration
```

### Mode watch (développement)
```bash
npm run test:watch
```

### Couverture de code
```bash
npm run test:coverage
```

## 📊 Résultats attendus

### Statistiques
- **500+ tests** au total
- **~95% de couverture** sur les modules critiques
- **Temps d'exécution** : < 10 secondes

### Couverture par module
- `transformEngine.js` : **100%** (toutes les fonctions testées)
- `initDb.js` : **95%** (toutes les fonctions principales)
- `integration` : **90%** (scénarios principaux)

## 🔧 Configuration

### Jest (package.json)
```json
{
  "jest": {
    "testEnvironment": "node",
    "verbose": true,
    "testMatch": ["**/__tests__/**/*.test.js"],
    "collectCoverageFrom": [
      "electron/**/*.js",
      "!electron/main.js",
      "!electron/preload.js"
    ],
    "testTimeout": 10000
  }
}
```

## 📝 Bonnes pratiques

### Structure d'un test
```javascript
describe('Fonctionnalité', () => {
  test('devrait faire X quand Y', () => {
    // Arrange
    const input = { ... };
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Isolation des tests
- Chaque test utilise une DB temporaire unique
- `beforeAll` pour setup, `afterAll` pour cleanup
- Tests indépendants (pas d'état partagé)

### Nommage
- **Descriptif** : "calcule correctement l'âge avec format DD/MM/YYYY"
- **Structure** : describe("Module/Fonction") → test("comportement attendu")
- **Cas limites** : null, undefined, valeurs invalides, tables vides

## 🐛 Débogage

### Exécuter un seul test
```bash
npx jest -t "nom du test"
```

### Voir les sorties console
```bash
npm test -- --verbose
```

### Déboguer dans VS Code
Ajouter dans `.vscode/launch.json` :
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## 📈 Évolutions futures

### Tests à ajouter
- [ ] Tests E2E avec Electron (spectron/playwright)
- [ ] Tests de performance sur gros fichiers (10k+ lignes)
- [ ] Tests de sécurité (injection SQL, XSS)
- [ ] Tests de compatibilité multi-plateformes
- [ ] Tests de l'UI React (React Testing Library)

### Métriques
- [ ] Intégrer CI/CD (GitHub Actions)
- [ ] Badge de couverture dans README
- [ ] Rapport de tests automatique
- [ ] Benchmarks de performance

## ✅ Checklist avant commit

```bash
# 1. Lint
npm run lint

# 2. Tests
npm test

# 3. Couverture
npm run test:coverage

# 4. Vérifier que tous les tests passent
# 5. Vérifier que la couverture est > 90%
```

## 🎯 Objectifs qualité

- ✅ **0 warning** sur lint
- ✅ **100% tests pass**
- ✅ **> 90% code coverage**
- ✅ **< 10s temps d'exécution**
- ✅ **Tests lisibles et maintenables**

---

**Dernière mise à jour** : Décembre 2025  
**Mainteneur** : Équipe Dev ExcelToSQLite
