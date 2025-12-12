# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-12

### 🎉 Initial Release - Production Ready

#### ✨ Added - Core Features

* **Excel Import**
  * Support complet des fichiers .xlsx
  * Preview des données (colonnes + 50 premières lignes)
  * Validation du format et gestion des erreurs
  
* **Database Management**
  * Connexion SQLite locale
  * Liste des tables existantes
  * Inspection des colonnes (type, constraints)
  * Création de nouvelles tables via interface
  
* **Column Mapping**
  * Interface visuelle drag-and-drop
  * Mapping manuel Excel → SQLite
  * Validation des types de données
  * Preview avant import
  
* **Data Import**
  * Transaction sécurisée (tout ou rien)
  * Mode "continue" (skip les erreurs)
  * Mode "stop" (rollback sur erreur)
  * Gestion des contraintes (UNIQUE, NOT NULL, etc.)
  * Logs détaillés avec erreurs par ligne

#### 🚀 Added - Advanced Transformations

* **Transformation Engine** (30+ fonctions)
  * **Dates** : AGE(), YEAR(), MONTH(), DAY(), DATEDIFF(), FORMAT_DATE(), NOW(), TODAY()
  * **Texte** : UPPER(), LOWER(), TRIM(), CAPITALIZE(), CONCAT(), SUBSTRING(), REPLACE(), LEN()
  * **Math** : ROUND(), FLOOR(), CEIL(), ABS(), MIN(), MAX()
  * **Conversion** : NUMBER(), STRING(), BOOLEAN()
  * **Conditions** : IF(), ISEMPTY(), IFNULL()
  
* **French Format Support**
  * Dates : DD/MM/YYYY, DD-MM-YYYY
  * Nombres : Espaces milliers (1 234,56)
  * Virgule décimale automatique
  
* **Transformation UI**
  * Éditeur modal avec syntaxe highlight
  * Validation en temps réel (500ms debounce)
  * Preview sur échantillon de données
  * Documentation intégrée par catégorie
  * Insert automatique de fonctions/colonnes
  * Gestion d'erreurs avec messages détaillés

#### 🧪 Added - Test Suite

* **90 tests** (100% de réussite)
  * 67 tests unitaires (transformEngine)
  * 23 tests unitaires (initDb)
  * 8 tests d'intégration (workflow complet)
* **89% de couverture globale**
  * 96.68% pour transformEngine.js
  * 77.17% pour initDb.js
  * 94.82% des fonctions testées
* **Jest configuration**
  * Mode watch pour développement
  * Rapports de couverture (text, lcov, html)
  * Tests isolés avec cleanup automatique

#### 📚 Added - Documentation

* README.md complet avec architecture
* TRANSFORMATIONS.md - guide des fonctions
* RELEASE.md - guide de versioning
* tests/README.md - documentation des tests
* Examples et use cases pour chaque fonction

#### 🔒 Security

* contextIsolation: true
* sandbox: true  
* nodeIntegration: false
* API IPC sécurisée via preload
* Validation des entrées côté main process

#### 🎨 UI/UX

* Interface React moderne et responsive
* Layout avec panels redimensionnables
* Feedback visuel (loading, success, errors)
* Messages d'erreur clairs et contextuels
* Tooltips et aide contextuelle

#### 🛠️ Technical Stack

* **Frontend** : React 18 + Vite
* **Backend** : Electron 28
* **Database** : SQLite3 (better-sqlite3)
* **Excel** : ExcelJS 4.4.0
* **Math Engine** : mathjs 15.1.0
* **Date Utils** : date-fns 4.1.0
* **Testing** : Jest 29.7.0

#### 📦 Build & Deploy

* Electron Builder configuration
* Windows executable generation
* GitHub Actions workflow (release.yml)
* Automatic release on tag push

### 🐛 Fixed

* Date parsing pour format français DD/MM/YYYY
* Scope-based evaluation pour fonctions custom dans mathjs
* Validation des expressions complexes avec IF imbriqués
* Gestion des valeurs null dans CONCAT

### 📈 Performance

* Import de 1000 lignes en < 1 seconde
* Transaction SQLite avec WAL mode
* Debounce sur validation (500ms)
* Preview limité à 3 lignes pour performance

---

## [Unreleased]

### Planned for v1.1.0

* Suggestion automatique de mapping
* Import multi-feuilles Excel
* Templates de mapping sauvegardés
* Export SQLite → Excel

---

[1.0.0]: https://github.com/julesgauthier/ExcelToSqlite/releases/tag/v1.0.0
