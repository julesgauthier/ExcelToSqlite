# ExcelToSQLite – Desktop Mapping & Import Tool

[![Release](https://img.shields.io/github/v/release/julesgauthier/ExcelToSqlite?label=Version)](https://github.com/julesgauthier/ExcelToSqlite/releases/latest)
[![Tests](https://img.shields.io/badge/tests-90%20passed-success)](https://github.com/julesgauthier/ExcelToSqlite)
[![Coverage](https://img.shields.io/badge/coverage-89%25-brightgreen)](https://github.com/julesgauthier/ExcelToSqlite)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> **Importer un fichier Excel, mapper ses colonnes avec transformations avancées et l'insérer dans une base SQLite en un clic.**

**Technologies :** Electron 28 • React 18 • SQLite3 • ExcelJS • mathjs • Jest

---

## 🚀 Quick Start

### Télécharger la dernière version

➡️ **[Télécharger Excel-to-SQLite v1.0.0](https://github.com/julesgauthier/ExcelToSqlite/releases/latest)** (Windows `.exe`)

### Installation pour développeurs

```bash
git clone https://github.com/julesgauthier/ExcelToSqlite.git
cd ExcelToSqlite
npm install
npm run dev
```

### Exécuter les tests

```bash
npm test                  # Tous les tests (90 tests)
npm run test:coverage    # Rapport de couverture
```

---

## 1. **Présentation générale**

**ExcelToSQLite** est une application desktop professionnelle permettant de transformer un fichier Excel (.xlsx) en données structurées stockées dans une base SQLite locale avec un **moteur de transformations avancé**.

### 🎯 Fonctionnalités principales

* ✅ **Import Excel** : Chargement de fichiers .xlsx avec preview des données
* ✅ **Mapping visuel** : Interface intuitive pour mapper colonnes Excel → SQLite
* ✅ **Transformations puissantes** : 30+ fonctions (dates, texte, math, conditions)
* ✅ **Format français** : Support natif DD/MM/YYYY et nombres (1 234,56)
* ✅ **Transaction sécurisée** : Import avec gestion d'erreurs (continue ou rollback)
* ✅ **Logs détaillés** : Historique d'import avec pagination et recherche
* ✅ **Tests complets** : 90 tests unitaires et d'intégration (89% coverage)

### 🏆 Points forts techniques

* **Architecture Electron moderne** : Isolation complète main/renderer
* **Sécurité renforcée** : contextIsolation, sandbox, API limitée via preload
* **Performance** : Import de 1000 lignes en < 1 seconde
* **CI/CD complet** : Tests automatiques, lint, release GitHub

---

## 2. **Objectifs de la V1**

### Fonctionnels (métier)

* Charger un fichier Excel (.xlsx)
* Afficher les colonnes et un aperçu des données
* Lister les tables SQLite existantes
* Lister leurs colonnes
* Permettre un **mapping manuel** (Excel → SQLite)
* Prévisualiser les données mappées
* Importer dans la base via une **transaction**
* Afficher un rapport d’import (succès / erreurs)

### Techniques

* Isoler toute la logique sensible dans le **main process**
* Exposer une API minimale via **preload + contextBridge**
* Sécuriser l’application :
  `contextIsolation: true` • `sandbox: true` • `nodeIntegration: false`
* Gérer les accès fichiers / DB uniquement côté main
* Utiliser React pour une UI propre et efficace
* Ajouter des tests unitaires Jest
* Mettre en place un CI/CD via GitHub Actions

---

## 3. **Stack technique**

### Frontend

* **React 18** avec Hooks
* **Vite** (build rapide)
* Components modulaires
* State management local

### Backend (Electron main)

* **Electron 28**
* **ExcelJS 4.4.0** (parsing Excel)
* **better-sqlite3 11.8.1** (synchrone, performant)
* **mathjs 15.1.0** (moteur d'expressions)
* **date-fns 4.1.0** (manipulation dates)
* File system sécurisé

### Sécurité

* Isolation totale entre renderer et système
* API contrôlée via preload
* Aucune API Node dans React

---

## 4. **Arborescence du projet**

```text
/ExcelToSqlite
│
├── electron/
│   ├── main.js                    → Processus principal + IPC handlers
│   ├── preload.js                 → API sécurisée (contextBridge)
│   ├── db/
│   │   └── initDb.js              → Init SQLite + opérations DB
│   └── utils/
│       └── transformEngine.js     → Moteur de transformations (30+ fonctions)
│
├── src/                           → React (renderer)
│   ├── components/
│   │   ├── excel/ExcelPanel.jsx   → Import et preview Excel
│   │   ├── db/DatabasePanel.jsx   → Gestion tables SQLite
│   │   ├── mapping/
│   │   │   ├── MappingPanel.jsx   → Interface de mapping
│   │   │   └── TransformationEditor.jsx → Éditeur de transformations
│   │   └── layout/AppLayout.jsx   → Layout principal
│   ├── App.jsx
│   └── main.jsx
│
├── __tests__/                     → Tests Jest (90 tests)
│   ├── transformEngine.test.js    → Tests transformations (67)
│   ├── initDb.test.js             → Tests DB (23)
│   ├── integration.test.js        → Tests E2E (8)
│   └── README.md                  → Documentation tests
│
├── .github/workflows/
│   ├── main.yml                   → CI (lint + tests + build)
│   └── release.yml                → Release automatique
│
├── CHANGELOG.md                   → Historique versions
├── TRANSFORMATIONS.md             → Documentation transformations
├── RELEASE.md                     → Guide de release
└── README.md
```

---

## 5. **API IPC – V1**

### Côté preload (`window.api`)

```js
window.api = {
  // Excel
  loadExcel(filePath),
  
  // Database
  getTables(),
  getColumns(tableName),
  getLastRows(tableName, limit),
  
  // Import avec transformations
  importExcelToTable({ tableName, filePath, mapping, onError }),
  
  // Moteur de transformations
  transform: {
    validate(expression, columns),
    preview(expression, sampleData),
    getDocs()
  },
  
  // Logs d'import
  getImportLogs({ limit, offset, searchText }),
  addImportLog(logData)
};
```

### Handlers IPC (main process)

| Handler | Rôle | Sécurité |
|---------|------|----------|
| `excel:load` | Parse Excel + preview | ✅ Validation extension |
| `db:getTables` | Liste tables SQLite | ✅ Read-only |
| `db:getColumns` | Métadonnées colonnes | ✅ Sanitized |
| `db:importExcelToTable` | Transaction import | ✅ Prepared statements |
| `transform:validate` | Validation expressions | ✅ Sandboxed mathjs |
| `db:getImportLogs` | Historique pagination | ✅ Param queries |

---

## 6. **Fonctionnalités détaillées**

### 1) Import Excel avancé

* Sélection via dialogue native (`dialog.showOpenDialog`)
* Validation extension `.xlsx`
* Parsing côté main (ExcelJS)
* Preview colonnes + 50 premières lignes
* Détection automatique du type de données

### 2) Transformations puissantes

**30+ fonctions intégrées** :

* **Dates** : `AGE({dateNaissance})`, `YEAR()`, `MONTH()`, `FORMAT_DATE()`
* **Texte** : `UPPER()`, `LOWER()`, `CONCAT()`, `REPLACE()`, `TRIM()`
* **Math** : `ROUND()`, `FLOOR()`, `CEIL()`, `ABS()`, `MIN()`, `MAX()`
* **Conversion** : `NUMBER()`, `STRING()`, `BOOLEAN()`
* **Conditions** : `IF()`, `ISEMPTY()`, `IFNULL()`

**Exemples** :

```javascript
AGE({dateNaissance})                    // 24 (depuis "10/12/2001")
ROUND({prixHT} * 1.20, 2)              // 59.99 (prix TTC)
UPPER({nom})                            // "DUPONT"
IF({age} >= 18, "Adulte", "Mineur")    // "Adulte"
CONCAT({prenom}, " ", {nom})           // "Jean DUPONT"
```

### 3) Mapping interactif

* Interface drag-and-drop
* Preview en temps réel
* Validation des types
* Bouton ⚡ pour ajouter une transformation
* Éditeur modal avec aide contextuelle

### 4) Prévisualisation mappée

* Voir les données “reconstruites”
* Détection lignes invalides (ex: valeur vide sur colonne NOT NULL)

### 5) Import transactionnel SQLite

* BEGIN TRANSACTION
* Insertion ligne par ligne
* Rollback si erreur critique
* Logs détaillés

### 6) Rapport d’import

* Nombre lignes insérées
* Nombre erreurs
* Erreurs listées

---

## 7. Sécurité

### Paramètres Electron

```js
contextIsolation: true,
sandbox: true,
nodeIntegration: false,
enableRemoteModule: false
```

### Garanties

* Aucune fonction Node côté React
* Accès DB uniquement dans main
* Chemins fichiers validés
* Types validés avant insertion
* Injection SQL impossible (paramétrage préparé)

---

## 8. Tests & Qualité

### Tests Jest

* mapping Excel → SQLite
* cast de types simples
* formatage des lignes
* validation des colonnes manquantes
* génération des requêtes d’insertion

### CI/CD GitHub Actions

Pipeline :

1. Lint
2. Tests
3. Build pour Windows/Mac/Linux
4. Release automatique via tag `vX.Y.Z`

---

## 9. Installation & développement

### Installation

```bash
git clone https://github.com/julesgauthier/ExcelToSqlite.git
cd exceltosqlite
npm install
```

### Lancer en mode dev (Electron + React)

```bash
npm run dev
```

### Build app

```bash
npm run build
```

### Tests

Suite complète de 90 tests unitaires et d'intégration avec Jest.

```bash
# Lancer tous les tests
npm run test

# Mode watch (développement)
npm run test:watch

# Rapport de couverture
npm run test:coverage

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration uniquement
npm run test:integration
```

**Couverture actuelle :**

* ✅ **90 tests** (100% de réussite)
* ✅ **96.68% de couverture** pour transformEngine.js
* ✅ **77.17% de couverture** pour initDb.js
* ✅ **94.82% des fonctions** testées

Documentation complète : [tests README](__tests__/README.md)

---

## 10. Fonctionnalités actuelles

### ✅ V1 - Core Features (Implémenté)

* ✅ Import Excel (.xlsx)
* ✅ Mapping colonnes Excel → SQLite
* ✅ Prévisualisation des données
* ✅ Transaction sécurisée avec gestion d'erreurs
* ✅ Logs d'import avec pagination et recherche
* ✅ **Suite de tests complète (90 tests, 89% de couverture)**

### ✅ V2 - Transformations (Implémenté)

* ✅ **Moteur de transformations avancé**
  * 30+ fonctions intégrées (dates, texte, math, conditions)
  * Support format français (DD/MM/YYYY, espaces milliers, virgule décimale)
  * Interface graphique avec prévisualisation en temps réel
  * Validation syntaxique avec aide contextuelle
  * Documentation intégrée par catégorie
* ✅ Exemples : `AGE({dateNaissance})`, `ROUND({prix} * 1.20, 2)`, `UPPER({nom})`
* ✅ Tests complets (67 tests unitaires + 8 tests d'intégration)

Documentation détaillée : [TRANSFORMATIONS.md](TRANSFORMATIONS.md)

---

## 11. Roadmap – Évolutions futures

### V3

* Suggestion automatique de mapping (ML-based)
* Détection automatique du type de colonne
* Import multi-feuilles Excel
* Templates de mapping sauvegardés

### V4 - Edition & Rollback

* Édition des données mappées avant import (table virtuelle)
* Historique des imports avec rollback
* Mode "dry-run" (simulation d'import)

### V5 - Multi-bases

* Connecteurs pour PostgreSQL / MySQL
* Export DB → Excel automatisé
* Mode CLI
* Import Excel → multiples tables (relationnel)
* Dashboard qualité (anomalies, stats)
